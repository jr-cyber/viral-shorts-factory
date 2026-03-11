import { NextRequest, NextResponse } from 'next/server'
import { getProject, exportClips, calculateSchedule } from '@/lib/clip-api'

// Check project status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const action = searchParams.get('action')

  try {
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const project = getProject(projectId)

    // If action is 'export', trigger clip exports
    if (action === 'export') {
      const exportedClips = await exportClips(projectId)
      
      // Calculate posting schedule
      const schedule = calculateSchedule(exportedClips.length)
      
      return NextResponse.json({
        projectId,
        status: 'exported',
        clipsExported: exportedClips.length,
        schedule: schedule.map((date, i) => ({
          clipId: exportedClips[i]?.id,
          scheduledDate: date.toISOString()
        })),
        message: 'Clips exported. Ready for scheduling.'
      })
    }

    // Default: return project status
    return NextResponse.json({
      projectId: project.id,
      status: project.status,
      clipsCount: project.clips.length,
      createdAt: project.createdAt,
      clips: project.clips.map(clip => ({
        id: clip.id,
        name: clip.name,
        viralityScore: clip.viralityScore,
        status: clip.status,
        caption: clip.caption
      }))
    })

  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: error.message || 'Failed to check status' }, { status: 500 })
  }
}