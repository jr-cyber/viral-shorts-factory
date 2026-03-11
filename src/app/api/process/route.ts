import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)
const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
const PROCESSED_DIR = join(process.cwd(), 'data', 'processed')

export async function POST(request: NextRequest) {
  try {
    const { projectId, options } = await request.json()
    
    const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
    if (!existsSync(projectFile)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = JSON.parse(readFileSync(projectFile, 'utf-8'))
    const outputPath = join(PROCESSED_DIR, `${projectId}_tiktok.mp4`)

    const {
      cropMode = 'smart',
      addBackground = true,
      backgroundColor = '#000000',
      speed = 1.0,
      trimStart = 0,
      trimEnd = null
    } = options || {}

    let ffmpegCmd = `ffmpeg -y`

    // Input file
    ffmpegCmd += ` -i "${project.originalVideoPath}"`

    // Trim if specified
    if (trimEnd) {
      ffmpegCmd += ` -ss ${trimStart} -to ${trimEnd}`
    } else if (trimStart > 0) {
      ffmpegCmd += ` -ss ${trimStart}`
    }

    // Speed adjustment
    if (speed !== 1.0) {
      ffmpegCmd += ` -filter:v "setpts=${1/speed}*PTS"`
    }

    // Crop to 9:16 (1080x1920) - TikTok format
    if (cropMode === 'smart' || cropMode === 'center') {
      ffmpegCmd += ` -filter:v "crop=ih*(9/16):ih,scale=1080:1920,pad=1080:1920:(ow-iw)/2:(oh-ih)/2${addBackground ? `:${backgroundColor}` : ''}"`
    } else if (cropMode === 'top') {
      ffmpegCmd += ` -filter:v "crop=ih*(9/16):ih:0:0,scale=1080:1920,pad=1080:1920:(ow-iw)/2:(oh-ih)/2${addBackground ? `:${backgroundColor}` : ''}"`
    } else {
      ffmpegCmd += ` -filter:v "crop=ih*(9/16):ih,scale=1080:1920,pad=1080:1920:(ow-iw)/2:(oh-ih)/2${addBackground ? `:${backgroundColor}` : ''}"`
    }

    // Output settings
    ffmpegCmd += ` -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart`
    ffmpegCmd += ` "${outputPath}"`

    console.log('Processing video with ffmpeg...')
    await execAsync(ffmpegCmd, { timeout: 300000 })

    // Update project status
    project.status = 'processed'
    project.processedVideoPath = outputPath
    project.processOptions = options
    project.processedAt = new Date().toISOString()
    writeFileSync(projectFile, JSON.stringify(project, null, 2))

    // Get output file info
    const { stdout: outputInfo } = await execAsync(`ffprobe -v quiet -print_format json -show_streams "${outputPath}"`)
    const outputStream = JSON.parse(outputInfo).streams[0]

    return NextResponse.json({
      projectId,
      status: 'processed',
      outputPath,
      outputInfo: {
        width: outputStream?.width,
        height: outputStream?.height
      }
    })

  } catch (error: any) {
    console.error('Video processing error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process video' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
  if (!existsSync(projectFile)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const project = JSON.parse(readFileSync(projectFile, 'utf-8'))

  return NextResponse.json(project)
}