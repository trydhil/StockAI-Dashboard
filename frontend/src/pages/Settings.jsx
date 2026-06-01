import { useState } from 'react'
import { Settings as SettingsIcon, Info, Github, ExternalLink } from 'lucide-react'

export default function Settings() {
  const [pin, setPin] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSavePin = () => {
    if (pin.length < 4) return
    localStorage.setItem('stockai_pin', pin)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl tracking-tight">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Konfigurasi dashboard</p>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* PIN */}
        <div className="card">
          <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <SettingsIcon size={16} className="text-acid" />
            Ganti PIN
          </h2>
          <div className="flex gap-2">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN baru (min 4 digit)"
              maxLength={6}
              className="flex-1 bg-ink-700 border border-ink-500 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-acid transition-colors"
            />
            <button onClick={handleSavePin} className="btn-acid">
              {saved ? 'Tersimpan ✓' : 'Simpan'}
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-2">PIN disimpan di browser lokal Anda</p>
        </div>

        {/* Links */}
        <div className="card">
          <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <ExternalLink size={16} className="text-ice" />
            Quick Links
          </h2>
          <div className="space-y-2">
            {[
              { label: 'n8n Dashboard', url: 'http://localhost:5678', desc: 'Buka n8n workflow editor' },
              { label: 'Google Drive', url: 'https://drive.google.com', desc: 'Buka Google Drive' },
              { label: 'Adobe Stock', url: 'https://contributor.stock.adobe.com', desc: 'Adobe Stock Contributor portal' },
            ].map(({ label, url, desc }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-ink-700 hover:bg-ink-600 transition-all group"
              >
                <div>
                  <p className="text-sm font-body font-medium">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <ExternalLink size={14} className="text-gray-500 group-hover:text-acid transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <Info size={16} className="text-gray-400" />
            About
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="font-mono text-xs">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stack</span>
              <span className="font-mono text-xs">React + Express + n8n</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">AI</span>
              <span className="font-mono text-xs">Gemini 1.5 Flash</span>
            </div>
          </div>
          <a
            href="https://github.com/trydhil/StockAI-Dashboard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 mt-4 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <Github size={14} />
            github.com/trydhil/StockAI-Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
