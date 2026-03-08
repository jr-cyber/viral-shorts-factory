import { NextRequest, NextResponse } from 'next/server'
import { getTikTokAccessToken } from '@/lib/tiktok'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.json({ error: error || 'No code received' }, { status: 400 })
  }

  try {
    const tokenData = await getTikTokAccessToken(code)
    const response = NextResponse.redirect(new URL('/?tiktok_connected=true', request.url))
    response.cookies.set('tiktok_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  } catch (error) {
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 })
  }
}