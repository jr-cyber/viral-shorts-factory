// Social Media Publisher Integration
// Based on n8n workflow: Potato/Publer/Blotato integration

import { NextRequest, NextResponse } from 'next/server'
import { getProject } from '@/lib/clip-api'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

// Potato API (social media scheduler)
const POTATO_API_URL = process.env.POTATO_API_URL || 'https://api.potato.tools'
const POTATO_API_KEY = process.env.POTATO_API_KEY || ''

// Alternative: Publer API
const PUBLER_API_URL = process.env.PUBLER_API_URL || 'https://publer.io/api/v1'
const PUBLER_API_KEY = process.env.PUBLER_API_KEY || ''

// Alternative: Blotato API
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://api.blotato.com/v1'
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || ''

export interface PublishRequest {
  clipId: string
  platform: 'tiktok' | 'instagram' | 'youtube'
  scheduledDate?: string
  caption?: string
  accountId?: string
}

export interface PublishResult {
  success: boolean
  postId?: string
  platform: string
  scheduledDate?: string
  error?: string
}

// Upload to Potato scheduler
async function uploadToPotato(clipId: string, videoUrl: string, caption: string, scheduledDate?: string): Promise<PublishResult> {
  console.log(`[Potato] Uploading clip ${clipId} to TikTok`)
  
  // In production:
  // POST ${POTATO_API_URL}/posts
  // {
  //   media_url: videoUrl,
  //   caption: caption,
  //   platform: 'tiktok',
  //   scheduled_at: scheduledDate,
  //   account_id: accountId
  // }
  
  return {
    success: true,
    postId: `potato_${Date.now()}`,
    platform: 'tiktok',
    scheduledDate
  }
}

// Upload to Publer
async function uploadToPubler(clipId: string, videoUrl: string, caption: string, scheduledDate?: string): Promise<PublishResult> {
  console.log(`[Publer] Uploading clip ${clipId} to social platforms`)
  
  // In production:
  // POST ${PUBLER_API_URL}/posts
  // Headers: Authorization: Bearer ${PUBLER_API_KEY}
  // Body: { media: videoUrl, text: caption, scheduled_at: scheduledDate }
  
  return {
    success: true,
    postId: `publer_${Date.now()}`,
    platform: 'tiktok',
    scheduledDate
  }
}

// Upload to Blotato
async function uploadToBlotato(clipId: string, videoUrl: string, caption: string, scheduledDate?: string): Promise<PublishResult> {
  console.log(`[Blotato] Uploading clip ${clipId}`)
  
  // In production:
  // POST ${BLOTATO_API_URL}/repost
  // Headers: Authorization: Bearer ${BLOTATO_API_KEY}
  
  return {
    success: true,
    postId: `blotato_${Date.now()}`,
    platform: 'tiktok',
    scheduledDate
  }
}

// Main publish endpoint
export async function POST(request: NextRequest) {
  try {
    const { clipId, platform = 'tiktok', scheduledDate, caption, scheduler = 'potato' } = await request.json()

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID required' }, { status: 400 })
    }

    // Get project and clip
    const projectsDir = join(process.cwd(), 'data', 'clips')
    let clip = null
    let project = null

    // Find clip across all projects
    const dirs = require('fs').readdirSync(projectsDir)
    for (const dir of dirs) {
      const projectFile = join(projectsDir, dir, 'project.json')
      if (existsSync(projectFile)) {
        const p = JSON.parse(readFileSync(projectFile, 'utf-8'))
        const foundClip = p.clips.find((c: any) => c.id === clipId)
        if (foundClip) {
          project = p
          clip = foundClip
          break
        }
      }
    }

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    if (!clip.exportUrl) {
      return NextResponse.json({ error: 'Clip not exported yet' }, { status: 400 })
    }

    const finalCaption = caption || clip.caption

    // Upload based on scheduler choice
    let result: PublishResult

    switch (scheduler) {
      case 'publer':
        result = await uploadToPubler(clipId, clip.exportUrl, finalCaption, scheduledDate)
        break
      case 'blotato':
        result = await uploadToBlotato(clipId, clip.exportUrl, finalCaption, scheduledDate)
        break
      case 'potato':
      default:
        result = await uploadToPotato(clipId, clip.exportUrl, finalCaption, scheduledDate)
        break
    }

    // Update clip status if published
    if (result.success && project) {
      const projectFile = join(projectsDir, project.id, 'project.json')
      const p = JSON.parse(readFileSync(projectFile, 'utf-8'))
      const clipIndex = p.clips.findIndex((c: any) => c.id === clipId)
      if (clipIndex >= 0) {
        p.clips[clipIndex].status = 'published'
        p.clips[clipIndex].publishedUrl = result.postId
        p.clips[clipIndex].scheduledDate = scheduledDate
        writeFileSync(projectFile, JSON.stringify(p, null, 2))
      }
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish' }, { status: 500 })
  }
}

// Batch publish all clips in a project
export async function PUT(request: NextRequest) {
  try {
    const { projectId, scheduler = 'potato', scheduleType = 'daily' } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const project = getProject(projectId)

    if (project.clips.length === 0) {
      return NextResponse.json({ error: 'No clips to publish' }, { status: 400 })
    }

    // Calculate schedule
    const schedule: Date[] = []
    const start = new Date()
    
    if (scheduleType === 'hourly') {
      for (let i = 0; i < project.clips.length; i++) {
        const date = new Date(start)
        date.setHours(date.getHours() + i)
        schedule.push(date)
      }
    } else {
      // Daily
      for (let i = 0; i < project.clips.length; i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        date.setHours(18, 0, 0, 0) // 6 PM EST
        schedule.push(date)
      }
    }

    // Publish each clip
    const results: PublishResult[] = []
    
    for (let i = 0; i < project.clips.length; i++) {
      const clip = project.clips[i]
      if (!clip.exportUrl) continue
      
      const result = await uploadToPotato(
        clip.id,
        clip.exportUrl,
        clip.caption,
        schedule[i].toISOString()
      )
      results.push(result)
    }

    return NextResponse.json({
      success: true,
      projectId,
      clipsPublished: results.filter(r => r.success).length,
      results
    })

  } catch (error: any) {
    console.error('Batch publish error:', error)
    return NextResponse.json({ error: error.message || 'Failed to batch publish' }, { status: 500 })
  }
}