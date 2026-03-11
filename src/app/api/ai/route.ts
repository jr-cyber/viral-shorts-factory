import { NextRequest, NextResponse } from 'next/server'
import { analyzeVideo, getAllProjects, getProject, deleteProject, calculateCost } from '@/lib/openrouter-clipper'

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl, numClips = 3 } = await request.json()
    
    if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Start analysis (non-blocking in production with webhooks)
    const project = await analyzeVideo(youtubeUrl, numClips)
    
    // Calculate estimated cost
    const cost = calculateCost(numClips)

    return NextResponse.json({
      projectId: project.id,
      status: project.status,
      clipsCount: project.clips?.length || 0,
      estimatedCost: cost,
      processingTime: project.processingTime,
      clips: project.clips?.map((clip: any) => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        viralityScore: clip.viralityScore,
        caption: clip.caption
      })),
      message: project.status === 'completed' 
        ? 'Clips generated successfully!'
        : 'Analysis in progress'
    })

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
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
        clips: project.clips,
        processingTime: project.processingTime
      })
    }

    const projects = getAllProjects()
    return NextResponse.json(projects.map((p: any) => ({
      projectId: p.id,
      youtubeUrl: p.youtubeUrl,
      status: p.status,
      clipsCount: p.clips?.length || 0,
      createdAt: p.createdAt,
      processingTime: p.processingTime
    })))

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get projects' }, { status: 500 })
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
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 })
  }
}