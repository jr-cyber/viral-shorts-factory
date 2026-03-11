"use client"

import { useState, useEffect } from "react"

interface Clip {
  id: string
  startTime: number
  endTime: number
  duration: number
  viralityScore: number
  energyScore: number
  insightScore: number
  entertainmentScore: number
  shareabilityScore: number
  hookScore: number
  trendRelevance: number
  keyMoment: string
  caption: string
  hashtags: string[]
  localPath?: string
}

interface Project {
  projectId: string
  fileName?: string
  status: string
  createdAt: string
  clipsCount?: number
  clips?: Clip[]
  processingTime?: number
}

const API = "http://localhost:3000"

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [numClips, setNumClips] = useState(3)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API}/api/virality`)
      if (res.ok) setProjects(await res.json())
    } catch (e) { console.error(e) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append("video", file)
    formData.append("numClips", numClips.toString())
    try {
      const res = await fetch(`${API}/api/virality`, { method: "POST", body: formData })
      const result = await res.json()
      if (result.status === "completed") {
        setProjects([{ projectId: result.projectId, fileName: file.name, status: "completed", createdAt: new Date().toISOString(), clipsCount: result.clipsCount, clips: result.clips, processingTime: result.processingTime }, ...projects])
        setFile(null)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleDownload = (projectId: string, clipId: string) => {
    window.open(`${API}/api/download?projectId=${projectId}&clipId=${clipId}`, "_blank")
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm("Delete?")) return
    await fetch(`${API}/api/virality?id=${projectId}`, { method: "DELETE" })
    setProjects(projects.filter(p => p.projectId !== projectId))
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  const color = (n: number) => n >= 85 ? "text-red-400" : n >= 70 ? "text-orange-400" : n >= 50 ? "text-yellow-400" : "text-green-400"
  const barColor = (n: number) => n >= 85 ? "from-red-500 to-pink-500" : n >= 70 ? "from-orange-500 to-red-500" : n >= 50 ? "from-yellow-500 to-orange-500" : "from-green-500 to-emerald-500"

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: "#09090b", color: "white" }}>
      <div className="fixed inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(at 40% 20%, rgba(225,29,72,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(225,29,72,0.05) 0px, transparent 50%)" }} />
      <div className="relative z-10">
        <header className="border-b border-zinc-800/50 backdrop-blur-sm sticky top-0" style={{ background: "rgba(9,9,11,0.8)" }}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e11d48, #be123c)" }}>
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ background: "linear-gradient(135deg, #e11d48, #fb7185)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Viral Shorts Factory</h1>
                  <p className="text-sm text-zinc-500">AI-powered content creation</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(39,39,42,0.5)", border: "1px solid #3f3f46" }}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-zinc-400">Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="lg:col-span-2">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(to right, rgba(225,29,72,0.2), rgba(225,29,72,0.2))" }} />
                <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer backdrop-blur-sm ${dragActive ? "border-rose-500" : "border-zinc-700 hover:border-zinc-600"}`} style={{ background: "rgba(24,24,27,0.5)" }}
                  onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                  {file ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e11d48, #be123c)" }}>
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                      </div>
                      <p className="text-lg font-semibold text-white mb-2">{file.name}</p>
                      <p className="text-sm text-zinc-500 mb-4">{Math.round(file.size / 1024 / 1024)}MB</p>
                      <button onClick={() => setFile(null)} className="text-sm" style={{ color: "#fb7185" }}>Remove</button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-zinc-800/50">
                        <svg className="w-10 h-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <p className="text-lg font-semibold text-white mb-2">Drop video to analyze</p>
                      <p className="text-sm text-zinc-500">AI finds viral moments</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-zinc-400">Clips:</label>
                    <select value={numClips} onChange={(e) => setNumClips(+e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm" disabled={loading}>
                      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <button onClick={handleUpload} disabled={loading || !file} className="flex-1 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #e11d48, #be123c)", boxShadow: "0 0 20px rgba(225,29,72,0.4)" }}>
                    {loading ? <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <span>Analyze & Extract</span>}
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(24,24,27,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: "#e11d48" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Stats
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between"><span className="text-zinc-400">Projects</span><span className="text-2xl font-bold text-white">{projects.length}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Clips</span><span className="text-2xl font-bold" style={{ background: "linear-gradient(135deg, #e11d48, #fb7185)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{projects.reduce((a, p) => a + (p.clipsCount || 0), 0)}</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6">Your Projects</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full text-center py-12 rounded-2xl text-zinc-500" style={{ background: "rgba(24,24,27,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>Drop a video above to get started!</div>
            ) : (
              projects.map((p) => (
                <div key={p.projectId} className="rounded-2xl overflow-hidden transition-colors hover:border-rose-500/30" style={{ background: "rgba(24,24,27,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">{p.status}</span>
                      <p className="text-sm text-zinc-400 mt-2">{p.fileName}</p>
                    </div>
                    <button onClick={() => handleDelete(p.projectId)} className="text-zinc-500 hover:text-red-400 text-sm">Delete</button>
                  </div>
                  <div className="p-4 space-y-4">
                    {p.clips?.map((c, i) => (
                      <div key={c.id} className="rounded-xl overflow-hidden">
                        <div className="p-3 flex items-center justify-between" style={{ background: c.viralityScore >= 85 ? "linear-gradient(135deg, #e11d48, #be123c)" : c.viralityScore >= 70 ? "linear-gradient(135deg, #f97316, #ea580c)" : c.viralityScore >= 50 ? "linear-gradient(135deg, #eab308, #ca8a04)" : "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                          <span className="font-semibold text-white">Clip {i + 1}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white">🔥 {c.viralityScore}%</span>
                        </div>
                        <div className="p-4 space-y-3" style={{ background: "rgba(39,39,42,0.5)" }}>
                          <div className="flex justify-between text-xs"><span className="text-zinc-400">{fmt(c.startTime)} - {fmt(c.endTime)}</span></div>
                          {[["Energy", c.energyScore], ["Insights", c.insightScore], ["Entertainment", c.entertainmentScore], ["Shareability", c.shareabilityScore], ["Hook", c.hookScore]].map(([l, s]) => (
                            <div key={l} className="space-y-1">
                              <div className="flex justify-between text-xs"><span className="text-zinc-400">{l}</span><span className={color(Number(s))}>{s}%</span></div>
                              <div className="h-1.5 bg-zinc-800 rounded-full">
                                <div className={`h-full rounded-full bg-gradient-to-r ${barColor(Number(s))}`} style={{ width: s + "%" }} />
                              </div>
                            </div>
                          ))}
                          <button onClick={() => handleDownload(p.projectId, c.id)} className="w-full text-white font-medium py-2 rounded-lg mt-2" style={{ background: "linear-gradient(135deg, #e11d48, #be123c)" }}>Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
