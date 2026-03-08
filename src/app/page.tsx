export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🎬 Viral Shorts Factory</h1>
        <p className="text-gray-600">Create and manage viral short-form content</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Short</h2>
          <input type="text" placeholder="Video title..." className="w-full p-2 border rounded mb-4" />
          <textarea placeholder="Script..." className="w-full p-2 border rounded h-24 mb-4" />
          <input type="file" accept="video/*" className="w-full p-2 border rounded mb-4" />
          <button className="w-full bg-blue-600 text-white py-2 rounded">Upload & Create</button>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📱 TikTok Publishing</h2>
          <a href="/api/tiktok/auth" className="w-full bg-black text-white py-2 rounded flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
            Connect TikTok
          </a>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Analytics</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Total Views</span><span className="font-bold">0</span></div>
            <div className="flex justify-between"><span>Total Likes</span><span className="font-bold">0</span></div>
            <div className="flex justify-between"><span>Total Shares</span><span className="font-bold">0</span></div>
          </div>
        </div>
      </div>
    </main>
  )
}