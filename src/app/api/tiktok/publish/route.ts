import { NextRequest, NextResponse } from 'next/server'
import { publishTikTokVideo } from '@/lib/tiktok'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('tiktok_token')?.value
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { videoUrl, title } = await request.json()
    if (!videoUrl || !title) {
      return NextResponse.json({ error: 'Missing videoUrl or title' }, { status: 400 })
    }

    const result = await publishTikTokVideo(accessToken, videoUrl, title)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 })
  }
}