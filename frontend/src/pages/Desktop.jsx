import { useState } from 'react'
import { api } from '../hooks/api'
import { Monitor, FolderOpen, Terminal, ArrowUpCircle } from 'lucide-react'

const actions = [
  {
    id: 'upscayl', label: 'Buka Upscayl',
    desc: 'Launch Upscayl untuk upscale gambar',
    icon: ArrowUpCircle, color: 'text-acid', bg: 'bg-acid/10 hover:bg-acid/20', border: 'border-acid/20',
    fn: () => api.openUpscayl(),
  },
  {
    id: 'explorer-stock', label: 'Buka ContriAI_Stock',
    desc: 'Buka folder ContriAI_Stock di File Explorer',
    icon: FolderOpen, color: 'text-ice', bg: 'bg-ice/10 hover:bg-ice/20', border: 'border-ice/20',
    fn: () => api.openExplorer('C:\\Users\\ASUS\\ContriAI_Stock'),
  },
  {
    id: 'explorer-kerja', label: 'Buka Folder Kerja',
    desc: 'Buka folder kerja utama',
    icon: FolderOpen, color: 'text-ice', bg: 'bg-ice/10 hover:bg-ice/20', border: 'border-ice/20',
    fn: () => api.openExplorer('C:\\Users\\ASUS\\kerja'),
  },
  {
    id: 'cmd', label: 'Buka CMD',
    desc: 'Buka Command Prompt baru',
    icon: Terminal, color: 'text-coral', bg: 'bg-coral/10 hover:bg-coral/20', border: 'border-coral/20',
    fn: () => api.openCmd(),
  },
]

export default function Desktop() {
  const [loading, setLoading] = useState({})
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = async (action) => {
    setLoading(l => ({ ...l, [action.id]: true }))
    try {
      await action.fn()
      showToast(`${action.label} berhasil!`)
    } catch {
      showToast(`${action.label} gagal`, 'error')
    } finally {
      setLoading(l => ({ ...l, [action.id]: false }))
    }
  }

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm animate-slide-up max-w-xs
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-acid/20 text-acid border border-acid/30'}`}>
          {toast.msg}
        </div>
      )}
      <div className="mb-5">
        <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight">Desktop Remote</h1>
        <p className="text-gray-500 text-sm mt-1">Kontrol PC dari browser atau HP</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map(action => (
          <button key={action.id} onClick={() => handleAction(action)} disabled={loading[action.id]}
            className={`card text-left transition-all border ${action.border} ${action.bg} active:scale-95 disabled:opacity-50`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.bg} shrink-0`}>
                {loading[action.id]
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <action.icon size={18} className={action.color} />}
              </div>
              <div>
                <p className={`font-semibold text-sm ${action.color}`}>{action.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{action.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="card mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Monitor size={14} className="text-gray-400" />
          <h2 className="font-semibold text-xs text-gray-400">Info</h2>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">
          Fitur ini hanya berfungsi saat browser dan PC berada di jaringan WiFi yang sama.
        </p>
      </div>
    </div>
  )
}
