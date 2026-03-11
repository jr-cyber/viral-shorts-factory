// Clip API Service - Based on n8n automation design
// Integrates with Clip App API for AI-powered video clipping

import { v4 as uuidv4 } from 'uuid'
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const CLIPS_DIR = join(process.cwd(), 'data', 'clips')
mkdirSync(CLIPS_DIR, { recursive: true })

// Clip App API Configuration (replace with actual API)
const CLIP_API_BASE = process.env.CLIP_API_URL || 'https://api.clipapp.io'
const CLIP_API_KEY = process.env.CLIP_API_KEY || ''

export interface ClipRequest {
  youtubeUrl: string
  numClips: number
  platform?: 'tiktok' | 'instagram' | 'youtube'
}

export interface Clip {
  id: string
  projectId: string
  shortId: string
  name: string
  viralityScore: number
  caption: string
  platformCaption?: string
  status: 'pending' | 'processing' | 'ready' | 'exporting' | 'exported' | 'scheduled' | 'published'
  exportUrl?: string
  localPath?: string
  scheduledDate?: string
  publishedUrl?: string
  createdAt: string
  processedAt?: string
}

export interface Project {
  id: string
  youtubeUrl: string
  taskId?: string
  status: 'pending' | 'analyzing' | 'clips_ready' | 'exporting' | 'scheduled' | 'completed'
  numClips: number
  clips: Clip[]
  createdAt: string
  totalCost?: number
}

// Simulate Clip App API call (replace with actual API in production)
async function analyzeVideoWithClipAPI(youtubeUrl: string, numClips: number): Promise<{ taskId: string }> {
  console.log(`[ClipAPI] Analyzing video: ${youtubeUrl} for ${numClips} clips`)
  
  // In production, this would call the actual Clip App API
  // POST ${CLIP_API_BASE}/v1/analyze
  // { url: youtubeUrl, num_clips: numClips }
  
  // Simulated response
  return {
    taskId: `task_${uuidv4()}`
  }
}

// Check analysis status
async function checkAnalysisStatus(taskId: string): Promise<{
  status: 'processing' | 'ready' | 'failed'
  clips?: Clip[]
  error?: string
}> {
  console.log(`[ClipAPI] Checking status for task: ${taskId}`)
  
  // In production: GET ${CLIP_API_BASE}/v1/status/${taskId}
  
  // Simulated response - in real implementation, this would poll the API
  // For demo, we return ready immediately
  return {
    status: 'ready',
    clips: []
  }
}

// Fetch clip metadata and captions
async function fetchClipMetadata(taskId: string): Promise<Clip[]> {
  console.log(`[ClipAPI] Fetching metadata for task: ${taskId}`)
  
  // In production: GET ${CLIP_API_BASE}/v1/clips/${taskId}
  
  // Return simulated clips with virality scores and captions
  return []
}

// Export high-resolution video
async function exportHighResolution(shortId: string): Promise<{ exportId: string }> {
  console.log(`[ClipAPI] Exporting high-res for short: ${shortId}`)
  
  // In production: POST ${CLIP_API_BASE}/v1/export
  // { short_id: shortId, quality: 'high' }
  
  return {
    exportId: `export_${uuidv4()}`
  }
}

// Check export status
async function checkExportStatus(exportId: string): Promise<{
  status: 'processing' | 'ready' | 'failed'
  url?: string
  error?: string
}> {
  console.log(`[ClipAPI] Checking export status: ${exportId}`)
  
  // In production: GET ${CLIP_API_BASE}/v1/export/${exportId}
  
  return {
    status: 'ready',
    url: ''
  }
}

// Main workflow function - Analyze video and generate clips
export async function analyzeVideo(request: ClipRequest): Promise<Project> {
  const projectId = uuidv4()
  const projectDir = join(CLIPS_DIR, projectId)
  mkdirSync(projectDir, { recursive: true })
  
  const project: Project = {
    id: projectId,
    youtubeUrl: request.youtubeUrl,
    status: 'analyzing',
    numClips: request.numClips,
    clips: [],
    createdAt: new Date().toISOString()
  }
  
  // Step 1: Trigger video analysis
  const { taskId } = await analyzeVideoWithClipAPI(request.youtubeUrl, request.numClips)
  project.taskId = taskId
  
  // Step 2: Poll for analysis completion (status loop)
  let attempts = 0
  const maxAttempts = 60 // 15 minutes max
  
  while (attempts < maxAttempts) {
    const statusResult = await checkAnalysisStatus(taskId)
    
    if (statusResult.status === 'ready') {
      project.clips = statusResult.clips || []
      project.status = 'clips_ready'
      break
    }
    
    if (statusResult.status === 'failed') {
      throw new Error(statusResult.error || 'Analysis failed')
    }
    
    // Wait 15 seconds before retry (n8n Wait node logic)
    await new Promise(resolve => setTimeout(resolve, 15000))
    attempts++
  }
  
  if (project.status !== 'clips_ready') {
    throw new Error('Analysis timeout')
  }
  
  // Save project
  writeFileSync(join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
  
  return project
}

// Export all clips for a project
export async function exportClips(projectId: string): Promise<Clip[]> {
  const project = getProject(projectId)
  project.status = 'exporting'
  
  const exportedClips: Clip[] = []
  
  for (const clip of project.clips) {
    // Trigger export for each clip
    const { exportId } = await exportHighResolution(clip.shortId)
    clip.status = 'exporting'
    
    // Poll for export completion
    let attempts = 0
    const maxAttempts = 60
    
    while (attempts < maxAttempts) {
      const exportStatus = await checkExportStatus(exportId)
      
      if (exportStatus.status === 'ready') {
        clip.status = 'exported'
        clip.exportUrl = exportStatus.url
        break
      }
      
      if (exportStatus.status === 'failed') {
        throw new Error(`Export failed for clip: ${clip.id}`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 15000))
      attempts++
    }
    
    exportedClips.push(clip)
    saveProject(project)
  }
  
  project.status = 'scheduled'
  saveProject(project)
  
  return exportedClips
}

// Calculate posting schedule (JavaScript logic from n8n Code node)
export function calculateSchedule(numClips: number, startDate?: Date): Date[] {
  const schedule: Date[] = []
  const start = startDate || new Date()
  
  // Schedule one short per day starting from current date
  for (let i = 0; i < numClips; i++) {
    const scheduledDate = new Date(start)
    scheduledDate.setDate(scheduledDate.getDate() + i)
    // Set optimal posting time (e.g., 6 PM EST)
    scheduledDate.setHours(18, 0, 0, 0)
    schedule.push(scheduledDate)
  }
  
  return schedule
}

// Calculate cost (usage-based pricing)
export function calculateCost(numClips: number): number {
  // Example pricing:
  // Video analysis: ~$0.25 per video
  // Clip generation: ~$0.35 per clip
  // High-res export: ~$0.15 per export
  const analysisCost = 0.25
  const clipGenerationCost = 0.35 * numClips
  const exportCost = 0.15 * numClips
  
  return analysisCost + clipGenerationCost + exportCost
}

// Database operations
function getProjectDir(projectId: string): string {
  return join(CLIPS_DIR, projectId)
}

function saveProject(project: Project): void {
  const projectDir = getProjectDir(project.id)
  writeFileSync(join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
}

export function getProject(projectId: string): Project {
  const projectFile = join(getProjectDir(projectId), 'project.json')
  if (!existsSync(projectFile)) {
    throw new Error('Project not found')
  }
  return JSON.parse(readFileSync(projectFile, 'utf-8'))
}

export function getAllProjects(): Project[] {
  const projects: Project[] = []
  
  if (!existsSync(CLIPS_DIR)) return []
  
  const dirs = require('fs').readdirSync(CLIPS_DIR)
  for (const dir of dirs) {
    const projectFile = join(CLIPS_DIR, dir, 'project.json')
    if (existsSync(projectFile)) {
      projects.push(JSON.parse(readFileSync(projectFile, 'utf-8')))
    }
  }
  
  return projects.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function deleteProject(projectId: string): void {
  const projectDir = getProjectDir(projectId)
  if (existsSync(projectDir)) {
    rmSync(projectDir, { recursive: true, force: true })
  }
}