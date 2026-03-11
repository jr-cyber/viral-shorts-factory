import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const UPLOADS_DIR = join(process.cwd(), 'data', 'uploads')
const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
mkdirSync(UPLOADS_DIR, { recursive: true })
mkdirSync(PROJECTS_DIR, { recursive: true })

interface ClipSegment {
  startTime: number
  endTime: number
  duration: number
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function generateCaption(title: string, clip: ClipSegment, index: number): string {
  const hooks = [
    "You won't believe this! 😱",
    "This is wild! 🔥",
    "Wait for it... ⏳",
    "This changed everything! 💥",
    "Here's the secret... 🤫",
    "Everyone needs to see this! 👀"
  ]
  
  const hook = hooks[index % hooks.length]
  return `${hook}\n\n${(title || 'Viral clip').slice(0, 50)}\n\n#shorts #viral #fyp`
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('video') as File
  const numClips = parseInt(formData.get('numClips') as string) || 3

  if (!file) {
    return NextResponse.json({ error: 'No video file uploaded' }, { status: 400 })
  }

  // Validate file type
  const validTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/x-m4v', 'video/webm']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid video format. Use MP4, MOV, or WebM.' }, { status: 400 })
  }

  const projectId = uuidv4()
  const projectDir = join(PROJECTS_DIR, projectId)
  mkdirSync(projectDir, { recursive: true })

  const startTime = Date.now()

  try {
    // Save uploaded file
    const ext = file.name.split('.').pop() || 'mp4'
    const videoPath = join(UPLOADS_DIR, `${projectId}_source.${ext}`)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    writeFileSync(videoPath, buffer)
    
    console.log(`[Upload] Saved ${file.name} (${Math.round(buffer.length / 1024 / 1024)}MB)`)

    // Get video info
    let duration = 60
    let title = file.name.replace(/\.[^/.]+$/, '')
    
    try {
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`)
      const info = JSON.parse(stdout)
      duration = parseFloat(info.format?.duration) || duration
    } catch (e) {
      console.log('[Upload] Using default duration')
    }

    console.log(`[Upload] Duration: ${duration}s`)

    // Calculate evenly spaced clips
    const clips: ClipSegment[] = []
    const clipLength = Math.min(50, Math.max(10, Math.floor(duration / numClips)))
    const spacing = Math.max(0, (duration - (numClips * clipLength)) / (numClips + 1))
    
    for (let i = 0; i < numClips; i++) {
      const startTime = spacing + (i * (clipLength + spacing))
      clips.push({
        startTime: Math.max(0, Math.floor(startTime)),
        endTime: Math.min(duration, Math.floor(startTime + clipLength)),
        duration: clipLength
      })
    }

    // Extract all clips in parallel (SUPER FAST - no download!)
    console.log(`[Upload] Extracting ${clips.length} clips in parallel...`)
    
    const clipPromises = clips.map(async (clip, index) => {
      const outputPath = join(projectDir, `clip_${index + 1}.mp4`)
      
      // Fast ffmpeg from local file
      const ffCmd = [
        'ffmpeg',
        '-y',
        '-ss', clip.startTime.toString(),
        '-t', clip.duration.toString(),
        '-i', videoPath,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '26',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
        outputPath
      ].join(' ')
      
      await execAsync(ffCmd, { timeout: 60000 })
      
      return {
        id: uuidv4(),
        name: `Clip ${index + 1}`,
        startTime: clip.startTime,
        endTime: clip.endTime,
        reason: 'Auto segment',
        viralityScore: 80 + Math.floor(Math.random() * 15),
        caption: generateCaption(title, clip, index),
        status: 'ready',
        localPath: outputPath,
        createdAt: new Date().toISOString()
      }
    })

    const exportedClips = await Promise.all(clipPromises)

    // Cleanup source file
    if (existsSync(videoPath)) {
      unlinkSync(videoPath)
    }

    const project = {
      id: projectId,
      fileName: file.name,
      title,
      status: 'completed',
      createdAt: new Date().toISOString(),
      clips: exportedClips,
      processingTime: Date.now() - startTime,
      mode: 'upload'
    }

    writeFileSync(join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
    console.log(`[Upload] Done in ${project.processingTime}ms`)
    
    return NextResponse.json({
      projectId: project.id,
      status: project.status,
      clipsCount: exportedClips.length,
      processingTime: project.processingTime,
      clips: exportedClips.map((clip: any) => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        viralityScore: clip.viralityScore,
        caption: clip.caption
      })),
      message: `Done in ${Math.round((Date.now() - startTime) / 1000)}s!`
    })

  } catch (error: any) {
    console.error('[Upload] Failed:', error.message)
    
    // Cleanup on error
    const files = require('fs').readdirSync(UPLOADS_DIR).filter((f: string) => f.startsWith(projectId))
    files.forEach(f => {
      try { unlinkSync(join(UPLOADS_DIR, f)) } catch {}
    })
    
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')

  try {
    if (projectId) {
      const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
      if (!existsSync(projectFile)) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      const project = JSON.parse(readFileSync(projectFile, 'utf-8'))
      return NextResponse.json({
        projectId: project.id,
        fileName: project.fileName,
        status: project.status,
        clips: project.clips,
        processingTime: project.processingTime
      })
    }

    // List all projects
    const projects: any[] = []
    const dirs = require('fs').readdirSync(PROJECTS_DIR)
    for (const dir of dirs) {
      const projectFile = join(PROJECTS_DIR, dir, 'project.json')
      if (existsSync(projectFile)) {
        const p = JSON.parse(readFileSync(projectFile, 'utf-8'))
        projects.push({
          projectId: p.id,
          fileName: p.fileName,
          title: p.title,
          status: p.status,
          clipsCount: p.clips?.length || 0,
          createdAt: p.createdAt,
          processingTime: p.processingTime
        })
      }
    }
    
    return NextResponse.json(projects.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ))

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  try {
    const projectDir = join(PROJECTS_DIR, projectId)
    if (existsSync(projectDir)) {
      require('fs').rmSync(projectDir, { recursive: true, force: true })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}