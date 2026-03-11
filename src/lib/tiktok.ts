// TikTok API Configuration
export const tiktokConfig = {
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/tiktok/callback',
  scopes: 'user.info.basic,video.list,video.publish',
}

export const tiktokEndpoints = {
  authorization: 'https://www.tiktok.com/v2/auth/authorize/',
  accessToken: 'https://open.tiktokapis.com/v2/oauth/token/',
  postVideo: 'https://open.tiktokapis.com/v2/post/publish/video/publish/',
  userInfo: 'https://open.tiktokapis.com/v2/user/info/',
}

export function getTikTokAuthUrl() {
  const params = new URLSearchParams({
    client_key: tiktokConfig.clientKey,
    scope: tiktokConfig.scopes,
    response_type: 'code',
    redirect_uri: tiktokConfig.redirectUri,
    state: crypto.randomUUID(),
  })
  return `${tiktokEndpoints.authorization}?${params.toString()}`
}

export async function getTikTokAccessToken(code: string) {
  const response = await fetch(tiktokEndpoints.accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: tiktokConfig.clientKey,
      client_secret: tiktokConfig.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: tiktokConfig.redirectUri,
    }),
  })
  return response.json()
}

export async function publishTikTokVideo(accessToken: string, videoUrl: string, title: string) {
  const response = await fetch(tiktokEndpoints.postVideo, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_token: accessToken,
      source_info: { source: 'VIDEO_UPLOAD', video_size: 0, title, privacy_level: 'PUBLIC_TO_EVERYONE' },
    }),
  })
  return response.json()
}