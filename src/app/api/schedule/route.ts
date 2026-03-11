import { NextRequest, NextResponse } from 'next/server'
import { getProject, calculateSchedule } from '@/lib/clip-api'

export async function POST(request: NextRequest) {
  try {
    const { projectId, scheduleType = 'daily', startDate, platforms = ['tiktok'] } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const project = getProject(projectId)

    if (project.clips.length === 0) {
      return NextResponse.json({ error: 'No clips to schedule' }, { status: 400 })
    }

    // Calculate schedule based on type
    const start = startDate ? new Date(startDate) : new Date()
    let schedule: Date[] = []

    switch (scheduleType) {
      case 'hourly':
        // One clip per hour
        for (let i = 0; i < project.clips.length; i++) {
          const date = new Date(start)
          date.setHours(date.getHours() + i)
          schedule.push(date)
        }
        break
      case 'daily':
      default:
        // One clip per day (original logic)
        schedule = calculateSchedule(project.clips.length, start)
        break
      case 'weekly':
        // One clip per week
        for (let i = 0; i < project.clips.length; i++) {
          const date = new Date(start)
          date.setDate(date.getDate() + (i * 7))
          schedule.push(date)
        }
        break
    }

    // Map clips to schedule
    const scheduledClips = project.clips.map((clip, index) => ({
      clipId: clip.id,
      clipName: clip.name,
      platform: platforms[index % platforms.length],
      scheduledDate: schedule[index].toISOString(),
      caption: clip.caption,
      viralityScore: clip.viralityScore
    }))

    return NextResponse.json({
      projectId,
      scheduleType,
      totalClips: scheduledClips.length,
      schedule: scheduledClips,
      summary: {
        tiktok: scheduledClips.filter(c => c.platform === 'tiktok').length,
        instagram: scheduledClips.filter(c => c.platform === 'instagram').length,
        youtube: scheduledClips.filter(c => c.platform === 'youtube').length
      }
    })

  } catch (error: any) {
    console.error('Schedule error:', error)
    return NextResponse.json({ error: error.message || 'Failed to calculate schedule' }, { status: 500 })
  }
}