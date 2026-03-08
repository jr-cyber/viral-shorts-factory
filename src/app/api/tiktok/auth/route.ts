import { NextRequest, NextResponse } from 'next/server'
import { getTikTokAuthUrl } from '@/lib/tiktok'

export async function GET() {
  return NextResponse.redirect(getTikTokAuthUrl())
}