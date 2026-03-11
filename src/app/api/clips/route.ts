import { NextRequest, NextResponse } from 'next/server'
import { analyzeVideo, getAllProjects, getProject, deleteProject, calculateCost } from '@/lib/clip-api'

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl, numClips = 2 } = await request.json()
    
    if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    const project = await analyzeVideo({ youtubeUrl, numClips })
    
    // Calculate estimated cost
    const estimatedCost = calculateCost(numClips)
    
    return NextResponse.json({
      projectId: project.id,
      status: project.status,
      clipsCount: project.clips.length,
      estimatedCost,
      message: 'Video analysis started. Poll /api/clips/status to check progress.'
    })

  } catch (error: any) {
    console.error('Clip analysis error:', error)
    return NextResponse.json({ error: error.message || 'Failed to analyze video' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')

  try {
    if (projectId) {
      const project = getProject(projectId)
      return NextResponse.json(project)
    }

    const projects = getAllProjects()
    return NextResponse.json(projects)

  } catch (error: any) {
    console.error('Get clips error:', error)
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
    return NextResponse.json({ success: true, message: 'Project deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete project' }, { status: 500 })
  }
}