// OpenRouter AI Integration for Fast Video Clipping
// No external API needed - runs directly with OpenRouter models

import { v4 as uuidv4 } from 'uuid'
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const PROJECTS_DIR = join(process.cwd(), 'data', 'projects')
mkdirSync(PROJECTS_DIR, { recursive: true })

// OpenRouter Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

interface OpenRouterRequest {
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  max_tokens?: number
  temperature?: number
}

interface ClipSegment {
  startTime: number
  endTime: number
  reason: string
  viralityScore: number
}

// Fast AI inference using OpenRouter
async function callOpenRouter(request: OpenRouterRequest): Promise<any> {
  console.log(`[OpenRouter] Calling ${request.model}`)
  
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Viral Shorts Factory'
    },
    body: JSON.stringify({
      ...request,
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.statusText}`)
  }

  return response.json()
}

// Analyze video transcript and find viral moments
async function analyzeVideoWithAI(youtubeUrl: string, numClips: number): Promise<ClipSegment[]> {
  console.log(`[AI] Analyzing ${youtubeUrl} for ${numClips} clips`)
  
  // Step 1: Get video transcript using yt-dlp
  const transcript = await getVideoTranscript(youtubeUrl)
  
  // Step 2: Use OpenRouter to find viral moments
  const prompt = `You are an expert viral content analyst. Analyze this video transcript and identify ${numClips} most engaging moments that would make great TikTok/Shorts clips.

Transcript:
${transcript.slice(0, 4000)}...

Return a JSON array of ${numClips} clip segments with:
- startTime: approximate start time in seconds
- endTime: approximate end time in seconds  
- reason: why this moment is engaging (hook, twist, reveal, etc.)
- viralityScore: 1-100 score based on engagement potential

Format: JSON array only, no other text.`

  const response = await callOpenRouter({
    model: 'openrouter/auto', // Uses fastest available model
    messages: [
      {
        role: 'system',
        content: 'You are a viral content expert. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.3
  })

  const content = response.choices?.[0]?.message?.content || '[]'
  
  // Parse JSON response
  try {
    const clips = JSON.parse(content)
    return Array.isArray(clips) ? clips : []
  } catch {
    console.error('[AI] Failed to parse response:', content)
    return []
  }
}

// Get video transcript
async function getVideoTranscript(youtubeUrl: string): Promise<string> {
  console.log('[Transcript] Fetching...')
  
  // Use yt-dlp to get transcript
  const transcriptPath = `/tmp/transcript_${uuidv4()}.txt`
  
  try {
    await execAsync(`yt-dlp --write-subs --sub-lang en --skip-download -o "${transcriptPath.replace('.txt', '')}" "${youtubeUrl}"`, {
      timeout: 120000
    })
    
    // Read transcript file
    if (existsSync(transcriptPath)) {
      return readFileSync(transcriptPath, 'utf-8')
    }
  } catch (error) {
    console.log('[Transcript] Using video info instead')
  }
  
  // Fallback: Get video metadata
  const { stdout } = await execAsync(`yt-dlp --dump-json "${youtubeUrl}" 2>/dev/null | head -100`)
  return stdout
}

// Generate caption for clip using AI
async function generateCaption(clip: ClipSegment, videoTitle: string): Promise<string> {
  const prompt = `Generate a viral TikTok caption for this clip:

Clip: ${clip.startTime}s - ${clip.endTime}s
Reason: ${clip.reason}
Virality Score: ${clip.viralityScore}/100
Video Title: ${videoTitle}

Create a caption that:
- Has a hook in first 3 words
- Uses 1-2 relevant emojis
- Includes 3-5 trending hashtags
- Is under 150 characters
- Uses conversational tone

Return only the caption, no quotes.`

  const response = await callOpenRouter({
    model: 'openrouter/auto',
    messages: [
      {
        role: 'system',
        content: 'You are a social media expert. Create viral TikTok captions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 200,
    temperature: 0.7
  })

  return response.choices?.[0]?.message?.content || `Check out this viral moment! 🔥`
}

// Fast export using ffmpeg with optimized settings
async function exportClipFast(
  youtubeUrl: string, 
  segment: ClipSegment,
  outputPath: string
): Promise<void> {
  console.log(`[Export] Fast export ${outputPath}`)
  
  // Optimized ffmpeg settings for speed
  const ffmpegCmd = [
    'ffmpeg',
    '-y',
    '-i', `"${youtubeUrl}"`,
    '-ss', segment.startTime.toString(),
    '-t', (segment.endTime - segment.startTime).toString(),
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',  // Speed over compression
    '-crf', '28',           // Higher CRF = smaller/faster
    '-c:a', 'aac',
    '-b:a', '96k',
    '-movflags', '+faststart',
    outputPath
  ].join(' ')

  await execAsync(ffmpegCmd, { timeout: 180000 })
}

// Main analysis function
export async function analyzeVideo(youtubeUrl: string, numClips: number = 3) {
  const projectId = uuidv4()
  const projectDir = join(PROJECTS_DIR, projectId)
  mkdirSync(projectDir, { recursive: true })

  const project: any = {
    id: projectId,
    youtubeUrl,
    status: 'analyzing',
    createdAt: new Date().toISOString(),
    clips: [],
    aiModel: 'openrouter/auto',
    processingTime: 0
  }

  const startTime = Date.now()

  try {
    // Parallel: Get video info and analyze with AI
    const [transcript, videoInfo] = await Promise.all([
      getVideoTranscript(youtubeUrl).catch(() => ''),
      getVideoInfo(youtubeUrl)
    ])

    // AI analysis (fast with OpenRouter)
    const clips = await analyzeVideoWithAI(youtubeUrl, numClips)

    // Generate captions in parallel
    const captionPromises = clips.map(clip => 
      generateCaption(clip, videoInfo.title)
    )
    const captions = await Promise.all(captionPromises)

    // Export clips in parallel (with concurrency limit)
    const exportedClips = []
    const concurrencyLimit = 3

    for (let i = 0; i < clips.length; i += concurrencyLimit) {
      const batch = clips.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map(async (clip, index) => {
        const outputPath = join(projectDir, `clip_${i + index + 1}.mp4`)
        await exportClipFast(youtubeUrl, clip, outputPath)
        return {
          id: uuidv4(),
          shortId: `short_${Date.now()}_${i + index}`,
          name: `Clip ${i + index + 1}`,
          startTime: clip.startTime,
          endTime: clip.endTime,
          reason: clip.reason,
          viralityScore: clip.viralityScore,
          caption: captions[i + index] || '',
          status: 'ready',
          localPath: outputPath,
          createdAt: new Date().toISOString()
        }
      })
      const batchResults = await Promise.all(batchPromises)
      exportedClips.push(...batchResults)
    }

    project.clips = exportedClips
    project.status = 'completed'
    project.processingTime = Date.now() - startTime

    console.log(`[Project] Completed in ${project.processingTime}ms`)

  } catch (error: any) {
    project.status = 'failed'
    console.error('[Project] Failed:', error.message)
  }

  writeFileSync(join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
  
  return project
}

async function getVideoInfo(youtubeUrl: string): Promise<{ title: string; duration: number }> {
  try {
    const { stdout } = await execAsync(`yt-dlp --dump-json "${youtubeUrl}" 2>/dev/null | head -1`)
    const info = JSON.parse(stdout)
    return {
      title: info.title || 'Unknown',
      duration: info.duration || 0
    }
  } catch {
    return { title: 'Unknown', duration: 0 }
  }
}

// Database operations
export function getProject(projectId: string) {
  const projectFile = join(PROJECTS_DIR, projectId, 'project.json')
  if (!existsSync(projectFile)) {
    throw new Error('Project not found')
  }
  return JSON.parse(readFileSync(projectFile, 'utf-8'))
}

export function getAllProjects() {
  const projects: any[] = []
  if (!existsSync(PROJECTS_DIR)) return []
  
  const dirs = require('fs').readdirSync(PROJECTS_DIR)
  for (const dir of dirs) {
    const projectFile = join(PROJECTS_DIR, dir, 'project.json')
    if (existsSync(projectFile)) {
      projects.push(JSON.parse(readFileSync(projectFile, 'utf-8')))
    }
  }
  
  return projects.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function deleteProject(projectId: string) {
  const projectDir = join(PROJECTS_DIR, projectId)
  if (existsSync(projectDir)) {
    rmSync(projectDir, { recursive: true, force: true })
  }
}

// Cost calculator (OpenRouter pricing)
export function calculateCost(numClips: number, model: string = 'auto') {
  // OpenRouter auto uses cheapest suitable model
  const costPer1kTokens = 0.0001  // ~$0.10/1M tokens for budget models
  const estimatedTokens = 500 * numClips // Analysis + captions
  const processingCost = 0.05 * numClips // ffmpeg processing
  
  return {
    aiCost: (estimatedTokens / 1000) * costPer1kTokens,
    processingCost,
    total: (estimatedTokens / 1000) * costPer1kTokens + processingCost
  }
}