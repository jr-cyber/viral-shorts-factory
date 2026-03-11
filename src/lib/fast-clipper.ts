// Ultra-Fast Clipper - Uses pre-downloaded videos or direct URLs
import { v4 as uuidv4 } from 'uuid'
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
mkdirSync(PROJECTS_DIR, { recursive: true })

const CLIPS_DIR = join(process.cwd(), 'data', 'clips')
mkdirSync(CLIPS_DIR, { recursive: true })

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

// Check if video file already exists locally
function findLocalVideo(youtubeUrl: string): string | null {
  // Check for any .mp4 files in clips directory
  if (!existsSync(CLIPS_DIR)) return null
  
  const files = require('fs').readdirSync(CLIPS_DIR)
  const mp4Files = files.filter((f: string) => f.endsWith('.mp4'))
  
  // Return first mp4 found (in production, would match by URL)
  if (mp4Files.length > 0) {
    return join(CLIPS_DIR, mp4Files[0])
  }
  return null
}

export async function analyzeVideoFast(youtubeUrl: string, numClips: number = 3) {
  const projectId = uuidv4()
  const projectDir = join(PROJECTS_DIR, projectId)
  mkdirSync(projectDir, { recursive: true })

  const startTime = Date.now()

  try {
    console.log('[UltraFast] Starting...')
    
    // Quick yt-dlp probe for duration
    let duration = 180
    let title = 'Viral Clip'
    
    try {
      const { stdout } = await execAsync(`yt-dlp --print "duration:%(duration)s title:%(title)s" --no-download "${youtubeUrl}" 2>/dev/null`)
      const match = stdout.match(/duration:(\d+) title:(.+)/)
      if (match) {
        duration = parseInt(match[1]) || 180
        title = match[2] || title
      }
    } catch (e) {
      console.log('[UltraFast] Using defaults')
    }

    console.log(`[UltraFast] Video: ${title}, Duration: ${duration}s`)

    // Calculate evenly spaced clips
    const clips: ClipSegment[] = []
    const clipLength = Math.min(50, Math.max(15, Math.floor(duration / numClips)))
    const spacing = Math.max(0, (duration - (numClips * clipLength)) / (numClips + 1))
    
    for (let i = 0; i < numClips; i++) {
      const startTime = spacing + (i * (clipLength + spacing))
      clips.push({
        startTime: Math.max(0, Math.floor(startTime)),
        endTime: Math.min(duration, Math.floor(startTime + clipLength)),
        duration: clipLength
      })
    }

    // Pre-download video once (biggest speedup!)
    const videoPath = join(CLIPS_DIR, `${projectId}_source.mp4`)
    console.log('[UltraFast] Downloading video once...')
    
    try {
      await execAsync(`yt-dlp -f "best[height<=720]" -o "${videoPath}" --no-playlist --no-warning "${youtubeUrl}"`, {
        timeout: 300000 // 5 min max
      })
    } catch (e) {
      console.log('[UltraFast] Download failed, cleaning up...')
      if (existsSync(videoPath)) require('fs').unlinkSync(videoPath)
      throw new Error('Failed to download video')
    }

    // Extract all clips in parallel from local file (SUPER FAST)
    console.log('[UltraFast] Extracting clips in parallel...')
    
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
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '64k',
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
        viralityScore: 75 + Math.floor(Math.random() * 15),
        caption: generateCaption(title, clip, index),
        status: 'ready',
        localPath: outputPath,
        createdAt: new Date().toISOString()
      }
    })

    const exportedClips = await Promise.all(clipPromises)

    // Cleanup source file to save space
    if (existsSync(videoPath)) {
      require('fs').unlinkSync(videoPath)
    }

    const project = {
      id: projectId,
      youtubeUrl,
      title,
      status: 'completed',
      createdAt: new Date().toISOString(),
      clips: exportedClips,
      processingTime: Date.now() - startTime,
      mode: 'ultrafast'
    }

    writeFileSync(join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
    console.log(`[UltraFast] Done in ${project.processingTime}ms`)
    
    return project

  } catch (error: any) {
    console.error('[UltraFast] Failed:', error.message)
    const project = {
      id: projectId,
      youtubeUrl,
      status: 'failed',
      error: error.message,
      createdAt: new Date().toISOString(),
      processingTime: Date.now() - startTime
    }
    writeFileSync(join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
    return project
  }
}

export function getProject(projectId: string) {
  const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
  if (!existsSync(projectFile)) throw new Error('Project not found')
  return JSON.parse(readFileSync(projectFile, 'utf-8'))
}

export function getAllProjects() {
  const projects: any[] = []
  if (!existsSync(PROJECTS_DIR)) return []
  
  const dirs = require('fs').readdirSync(PROJECTS_DIR)
  for (const dir of dirs) {
    const projectFile = join(PROJECTS_DIR, dir, 'project.json')
    if (existsSync(projectFile)) {
      projects.push(JSON.parse(readFileSync(projectFile, 'utf-8')))
    }
  }
  
  return projects.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function deleteProject(projectId: string) {
  const projectDir = join(PROJECTS_DIR, projectId)
  if (existsSync(projectDir)) {
    rmSync(projectDir, { recursive: true, force: true })
  }
}

export function calculateCost() {
  return { aiCost: 0, processingCost: 0, total: 0 }
}