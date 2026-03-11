# Viral Shorts Factory - Backend API

## Endpoints

### Clips API

#### Create Analysis Job
```
POST /api/clips
Body: { youtubeUrl: string, numClips?: number }
Response: { projectId, status, clipsCount, estimatedCost }
```

#### Get Projects/Clips
```
GET /api/clips
GET /api/clips?projectId=xxx
Response: Project or array of Projects
```

#### Check Status
```
GET /api/clips/status?projectId=xxx&action=export
Response: { projectId, status, clips, schedule }
```

### Schedule API

#### Calculate Schedule
```
POST /api/schedule
Body: { projectId, scheduleType: 'hourly'|'daily'|'weekly', platforms?: [] }
Response: { schedule: [{ clipId, scheduledDate, platform, caption }] }
```

### Publish API

#### Publish Single Clip
```
POST /api/publish
Body: { clipId, platform, scheduledDate?, caption?, scheduler: 'potato'|'publer'|'blotato' }
Response: { success, postId, platform, scheduledDate }
```

#### Batch Publish
```
PUT /api/publish
Body: { projectId, scheduler, scheduleType }
Response: { success, clipsPublished, results }
```

## Workflow (from n8n design)

1. **Form Submit** → `POST /api/clips` with YouTube URL
2. **Analyze Video** → Clip API analyzes and generates clips
3. **Status Loop** → Poll `/api/clips/status` until ready
4. **Fetch Metadata** → Get clips with virality scores
5. **Export** → `?action=export` triggers high-res export
6. **Schedule** → `POST /api/schedule` calculates posting times
7. **Publish** → `POST /api/publish` uploads to scheduler

## Cost Breakdown

- Video Analysis: ~$0.25
- Per Clip Generation: ~$0.35
- Per High-Res Export: ~$0.15
- **Total for 2 clips**: ~$1.08

## Environment Variables

```
CLIP_API_URL=https://api.clipapp.io
CLIP_API_KEY=your_api_key
POTATO_API_URL=https://api.potato.tools
POTATO_API_KEY=your_potato_key
PUBLER_API_URL=https://publer.io/api/v1
PUBLER_API_KEY=your_publer_key
BLOTATO_API_URL=https://api.blotato.com/v1
BLOTATO_API_KEY=your_blotato_key
```