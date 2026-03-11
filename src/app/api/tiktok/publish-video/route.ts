import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getServerSession } from 'next-auth'
import { publishTikTokVideo, tiktokConfig } from '@/lib/tiktok'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { projectId, title } = await request.json()
    
    // Get project
    const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
    const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
    
    if (!existsSync(projectFile)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = JSON.parse(readFileSync(projectFile, 'utf-8'))
    
    if (project.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!project.processedVideoPath || !existsSync(project.processedVideoPath)) {
      return NextResponse.json({ error: 'Video not processed yet' }, { status: 400 })
    }

    // Get TikTok access token from cookie or database
    // For now, we'll use the token from the TikTok connection
    // In production, store tokens securely in database
    const accessToken = request.cookies.get('tiktok_token')?.value

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'TikTok not connected',
        needsAuth: true,
        authUrl: '/api/tiktok/auth'
      }, { status: 401 })
    }

    // Upload video to TikTok
    const result = await publishTikTokVideo(accessToken, project.processedVideoPath, title || 'Viral Short created with Viral Shorts Factory!')

    if (result.error) {
      return NextResponse.json({ error: result.error.message || 'Failed to publish' }, { status: 500 })
    }

    // Update project status
    project.status = 'published'
    project.tiktokPostId = result.data?.post_id
    project.publishedAt = new Date().toISOString()
    writeFileSync(projectFile, JSON.stringify(project, null, 2))

    return NextResponse.json({
      success: true,
      postId: result.data?.post_id,
      message: 'Video published to TikTok successfully!'
    })

  } catch (error: any) {
    console.error('TikTok publish error:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish to TikTok' }, { status: 500 })
  }
}