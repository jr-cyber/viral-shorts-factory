import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
const CLIPS_DIR = join(process.cwd(), 'data', 'clips')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const clipId = searchParams.get('clipId')

  if (!projectId || !clipId) {
    return NextResponse.json({ error: 'projectId and clipId required' }, { status: 400 })
  }

  // First try to find in project's clips
  let clipPath: string | null = null

  // Check if clipId is a direct path
  if (existsSync(clipId)) {
    clipPath = clipId
  } else {
    // Look in CLIPS_DIR
    const clipsDirClip = join(CLIPS_DIR, `${clipId}.mp4`)
    if (existsSync(clipsDirClip)) {
      clipPath = clipsDirClip
    } else {
      // Look in project directory
      const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
      if (existsSync(projectFile)) {
        const project = JSON.parse(readFileSync(projectFile, 'utf-8'))
        const clip = project.clips?.find((c: any) => c.id === clipId)
        if (clip?.localPath && existsSync(clip.localPath)) {
          clipPath = clip.localPath
        }
      }
    }
  }

  if (!clipPath || !existsSync(clipPath)) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
  }

  const file = readFileSync(clipPath)

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="clip_${clipId.slice(0, 8)}.mp4"`,
      'Content-Length': file.length.toString()
    }
  })
}