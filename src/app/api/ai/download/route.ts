import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const clipId = searchParams.get('clipId')

  if (!projectId || !clipId) {
    return NextResponse.json({ error: 'projectId and clipId required' }, { status: 400 })
  }

  const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
  if (!existsSync(projectFile)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const project = JSON.parse(readFileSync(projectFile, 'utf-8'))
  const clip = project.clips?.find((c: any) => c.id === clipId)

  if (!clip || !clip.localPath || !existsSync(clip.localPath)) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
  }

  const file = readFileSync(clip.localPath)

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="clip_${clipId.slice(0, 8)}.mp4"`,
      'Content-Length': file.length.toString()
    }
  })
}