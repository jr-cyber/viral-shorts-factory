import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { processVideoWithVirality, getAllProjects, getProject, deleteProject } from '@/lib/virality-analyzer'

const UPLOADS_DIR = join(process.cwd(), 'data', 'uploads')
const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
mkdirSync(UPLOADS_DIR, { recursive: true })
mkdirSync(PROJECTS_DIR, { recursive: true })

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('video') as File
  const numClips = parseInt(formData.get('numClips') as string) || 3

  if (!file) {
    return NextResponse.json({ error: 'No video file uploaded' }, { status: 400 })
  }

  const validTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/x-m4v', 'video/webm']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid video format. Use MP4, MOV, or WebM.' }, { status: 400 })
  }

  try {
    const project = await processVideoWithVirality(file, numClips)
    const projectAny = project as any

    return NextResponse.json({
      projectId: project.id,
      status: project.status,
      clipsCount: projectAny.clips?.length || 0,
      processingTime: project.processingTime,
      clips: projectAny.clips?.map((clip: any) => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        viralityScore: clip.viralityScore,
        energyScore: clip.energyScore,
        insightScore: clip.insightScore,
        entertainmentScore: clip.entertainmentScore,
        shareabilityScore: clip.shareabilityScore,
        hookScore: clip.hookScore,
        trendRelevance: clip.trendRelevance,
        keyMoment: clip.keyMoment,
        uniqueAngle: clip.uniqueAngle,
        targetEmotion: clip.targetEmotion,
        caption: clip.caption,
        hashtags: clip.hashtags,
        localPath: clip.localPath
      })),
      message: project.status === 'completed' 
        ? `Analyzed in ${Math.round((project.processingTime || 0) / 1000)}s!`
        : `Failed: ${project.error}`
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')

  try {
    if (projectId) {
      const project = getProject(projectId)
      const projectAny = project as any
      return NextResponse.json({
        projectId: project.id,
        fileName: project.fileName,
        status: project.status,
        clips: projectAny.clips,
        processingTime: project.processingTime
      })
    }

    const projects = getAllProjects()
    return NextResponse.json(projects.map((p: any) => ({
      projectId: p.id,
      fileName: p.fileName,
      title: p.title,
      status: p.status,
      clipsCount: p.clips?.length || 0,
      createdAt: p.createdAt,
      processingTime: p.processingTime
    })))

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
    deleteProject(projectId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}