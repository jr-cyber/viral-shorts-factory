import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)
const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
const PROCESSED_DIR = join(process.cwd(), 'data', 'processed')

// Ensure directories exist
mkdirSync(PROJECTS_DIR, { recursive: true })
mkdirSync(PROCESSED_DIR, { recursive: true })

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl } = await request.json()
    
    if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    const projectId = uuidv4()
    const projectDir = join(PROJECTS_DIR, projectId)
    mkdirSync(projectDir, { recursive: true })

    // Download YouTube video
    const videoPath = join(projectDir, 'original.mp4')
    console.log('Downloading YouTube video...')
    
    await execAsync(`yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${videoPath}" "${youtubeUrl}"`, {
      timeout: 300000 // 5 minutes
    })

    // Get video info
    const { stdout: videoInfo } = await execAsync(`ffprobe -v quiet -print_format json -show_streams "${videoPath}"`)
    const info = JSON.parse(videoInfo)
    const videoStream = info.streams.find((s: any) => s.codec_type === 'video')
    const duration = info.format.duration

    // Save project metadata
    const projectData = {
      id: projectId,
      youtubeUrl,
      originalVideoPath: videoPath,
      status: 'downloaded',
      createdAt: new Date().toISOString(),
      videoInfo: {
        width: videoStream?.width,
        height: videoStream?.height,
        duration: parseFloat(duration)
      }
    }

    writeFileSync(join(projectDir, 'project.json'), JSON.stringify(projectData, null, 2))

    return NextResponse.json({
      projectId,
      status: 'downloaded',
      videoInfo: projectData.videoInfo
    })

  } catch (error: any) {
    console.error('YouTube download error:', error)
    return NextResponse.json({ error: error.message || 'Failed to download video' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const projects: any[] = []

  if (existsSync(PROJECTS_DIR)) {
    const dirs = require('fs').readdirSync(PROJECTS_DIR)
    for (const dir of dirs) {
      const projectFile = join(PROJECTS_DIR, dir, 'project.json')
      if (existsSync(projectFile)) {
        const project = JSON.parse(readFileSync(projectFile, 'utf-8'))
        projects.push(project)
      }
    }
  }

  return NextResponse.json(projects.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ))
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const projectDir = join(PROJECTS_DIR, projectId)
  
  if (existsSync(projectDir)) {
    require('fs').rmSync(projectDir, { recursive: true, force: true })
  }

  return NextResponse.json({ success: true })
}