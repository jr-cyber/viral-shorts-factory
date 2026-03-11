import { NextRequest, NextResponse } from 'next/server'
import { analyzeVideoFast, getAllProjects, getProject, deleteProject } from '@/lib/fast-clipper'

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl, numClips = 3 } = await request.json()
    
    if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Start processing (non-blocking in production, sync for now)
    const project = await analyzeVideoFast(youtubeUrl, numClips)

    const projectAny = project as any
    return NextResponse.json({
      projectId: project.id,
      status: project.status,
      clipsCount: projectAny.clips?.length || 0,
      processingTime: project.processingTime,
      mode: 'ultrafast',
      clips: projectAny.clips?.map((clip: any) => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        viralityScore: clip.viralityScore,
        caption: clip.caption
      })),
      message: project.status === 'completed' 
        ? `Done in ${Math.round((project.processingTime || 0) / 1000)}s!`
        : `Failed: ${(project as any).error}`
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')

  try {
    if (projectId) {
      const project = getProject(projectId)
      return NextResponse.json({
        projectId: project.id,
        status: project.status,
        clips: projectAny.clips,
        processingTime: project.processingTime
      })
    }

    const projects = getAllProjects()
    return NextResponse.json(projects.map((p: any) => ({
      projectId: p.id,
      youtubeUrl: p.youtubeUrl,
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