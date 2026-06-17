import { useState, useEffect, useRef } from 'react'
import { api } from '../hooks/api'
import { Upload, Trash2, FolderOpen, Image, FileText, RefreshCw, ExternalLink, Video, Layers, Square, AlertCircle } from 'lucide-react'

const FOLDERS = [
  { key: 'pictures_upload',    label: 'Upload',        icon: Upload,      color: 'text-acid' },
  { key: 'converted_jpeg',     label: 'JPEG',          icon: Image,       color: 'text-green-400' },
  { key: 'transparent_png',    label: 'Trans PNG',     icon: Square,      color: 'text-ice' },
  { key: 'vector',             label: 'Vector',        icon: Layers,      color: 'text-purple-400' },
  { key: 'ai_generated_image', label: 'AI Image',      icon: Image,       color: 'text-pink-400' },
  { key: 'belum_upscale',      label: 'Belum Upscale', icon: AlertCircle, color: 'text-yellow-400' },
  { key: 'pictures_csv',       label: 'CSV Image',     icon: FileText,    color: 'text-yellow-300' },
  { key: 'videos_upload',      label: 'Video Upload',  icon: Video,       color: 'text-coral' },
  { key: 'converted_mp4',      label: 'MP4',           icon: Video,       color: 'text-orange-400' },
  { key: 'ai_generated_video', label: 'AI Video',      icon: Video,       color: 'text-red-400' },
  { key: 'videos_csv',         label: 'CSV Video',     icon: FileText,    color: 'text-blue-300' },
]

function formatSize(bytes) {
  if (!bytes) return '-'
  const mb = bytes / 1024 / 1024
  return mb > 1 ? `${mb.toFixed(1)}MB` : `${(bytes/1024).toFixed(0)}KB`
}

function formatDate(str) {
  return str ? new Date(str).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'
}

export default function DriveFiles() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFolder, setActiveFolder] = useState('pictures_upload')
  const [folderIds, setFolderIds] = useState({})
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState([])
  const [toast, setToast] = useState(null)
  const fileRef = useRef()

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    api.getFolders().then(r => setFolderIds(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (folderIds[activeFolder]) loadFiles()
    setSelected([])
  }, [activeFolder, folderIds])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const fid = folderIds[activeFolder]
      if (!fid) return setFiles([])
      const res = await api.getFiles(fid)
      setFiles(res.data.files || [])
    } catch { setFiles([]) }
    finally { setLoading(false) }
  }

  const handleUpload = async (e) => {
    if (!e.target.files.length) return
    setUploading(true)
    try {
      const form = new FormData()
      Array.from(e.target.files).forEach(f => form.append('files', f))
      form.append('folderId', folderIds[activeFolder])
      await api.uploadFiles(form)
      showToast(`${e.target.files.length} file diupload!`)
      loadFiles()
    } catch { showToast('Upload gagal', 'error') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleDelete = async (fileId, fileName) => {
    if (!confirm(`Hapus "${fileName}"?`)) return
    try {
      await api.deleteFile(fileId)
      showToast('File dihapus!')
      loadFiles()
    } catch { showToast('Gagal hapus', 'error') }
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Hapus ${selected.length} file?`)) return
    try {
      await Promise.all(selected.map(id => api.deleteFile(id)))
      showToast(`${selected.length} file dihapus!`)
      setSelected([])
      loadFiles()
    } catch { showToast('Gagal hapus', 'error') }
  }

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const currentFolder = FOLDERS.find(f => f.key === activeFolder)
  const isUploadFolder = ['pictures_upload', 'videos_upload', 'belum_upscale', 'ai_generated_image', 'ai_generated_video'].includes(activeFolder)
  const isBelumUpscale = activeFolder === 'belum_upscale'

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm animate-slide-up max-w-xs
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-acid/20 text-acid border border-acid/30'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight">Drive Files</h1>
          <p className="text-gray-500 text-xs mt-0.5">{files.length} file · {currentFolder?.label}</p>
        </div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <button onClick={handleDeleteSelected} className="btn-ghost text-coral border-red-500/30 text-xs px-3 py-2">
              <Trash2 size={13} className="inline mr-1" />
              Hapus ({selected.length})
            </button>
          )}
          <button onClick={loadFiles} className="btn-ghost text-xs px-3 py-2">
            <RefreshCw size={13} className={`inline mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {isUploadFolder && (
            <>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleUpload} />
              <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-acid text-xs px-3 py-2">
                <Upload size={13} className="inline mr-1" />
                {uploading ? '...' : 'Upload'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Belum Upscale Warning */}
      {isBelumUpscale && files.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertCircle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-yellow-400 text-xs font-semibold">File perlu di-upscale dulu</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              {files.length} file di sini resolusinya terlalu kecil ({'<'}4MP). 
              Upscale dulu dengan Upscayl, lalu pindahkan ke folder Upload.
            </p>
          </div>
        </div>
      )}

      {/* Folder Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {FOLDERS.map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setActiveFolder(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0
              ${activeFolder === key
                ? key === 'belum_upscale'
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                  : 'bg-acid/15 text-acid border border-acid/30'
                : 'bg-ink-700 text-gray-400 hover:text-white'}`}>
            <Icon size={12} className={activeFolder === key ? (key === 'belum_upscale' ? 'text-yellow-400' : 'text-acid') : color} />
            {label}
          </button>
        ))}
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="w-6 h-6 border-2 border-acid border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Memuat...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={36} className="text-ink-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {!folderIds[activeFolder] ? 'Folder ID tidak ditemukan di .env' : 'Folder kosong'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
          {files.map(file => (
            <div key={file.id} onClick={() => toggleSelect(file.id)}
              className={`card p-3 cursor-pointer transition-all hover:border-ink-400 relative group
                ${selected.includes(file.id) ? 'border-acid/50 bg-acid/5' : ''}`}>
              {/* Thumbnail */}
              <div className="aspect-square rounded-lg overflow-hidden bg-ink-700 mb-2 flex items-center justify-center">
                {file.thumbnailLink
                  ? <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                  : file.mimeType?.includes('video')
                  ? <Video size={20} className="text-ink-500" />
                  : file.mimeType?.includes('image')
                  ? <Image size={20} className="text-ink-500" />
                  : <FileText size={20} className="text-ink-500" />
                }
              </div>
              <p className="text-[10px] font-mono text-white truncate">{file.name}</p>
              <p className="text-[10px] text-gray-500">{formatSize(parseInt(file.size))} · {formatDate(file.modifiedTime)}</p>

              {/* Hover actions */}
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                {file.webViewLink && (
                  <a href={file.webViewLink} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="w-6 h-6 bg-ink-600/90 hover:bg-ink-500 rounded-md flex items-center justify-center">
                    <ExternalLink size={10} />
                  </a>
                )}
                <button onClick={e => { e.stopPropagation(); handleDelete(file.id, file.name) }}
                  className="w-6 h-6 bg-red-500/20 hover:bg-red-500/40 rounded-md flex items-center justify-center">
                  <Trash2 size={10} className="text-coral" />
                </button>
              </div>

              {/* Selected */}
              {selected.includes(file.id) && (
                <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-acid rounded-full flex items-center justify-center">
                  <span className="text-ink-900 text-[10px] font-bold">✓</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}