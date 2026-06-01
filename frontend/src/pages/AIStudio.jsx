import { useState, useEffect, useRef } from 'react'
import { api } from '../hooks/api'
import { ImageIcon, Video, Layers, Square, Send, Copy, ExternalLink, Sparkles, CheckCircle, AlertCircle, Loader, RotateCcw, ArrowLeft } from 'lucide-react'

const MODES = [
  { id: 'image', label: 'Image', icon: ImageIcon, color: 'text-acid', bg: 'bg-acid/10', border: 'border-acid/30', desc: 'JPEG · 4-100MP · max 45MB' },
  { id: 'transparent_png', label: 'Trans PNG', icon: Square, color: 'text-ice', bg: 'bg-ice/10', border: 'border-ice/30', desc: 'PNG transparan · max 45MB' },
  { id: 'vector', label: 'Vector', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', desc: 'AI/EPS/SVG · 15-65MP' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-coral', bg: 'bg-coral/10', border: 'border-coral/30', desc: 'MP4 · 720p-4K · 5-60 detik' },
]

const WELCOME = {
  image: '🖼️ Mode **Image** aktif!\n\nCeritakan ide gambar untuk Adobe Stock. Saya bantu sempurnakan promptnya.\n\nContoh: *"Saya mau foto orang bekerja di kafe modern"*',
  transparent_png: '🔲 Mode **Transparent PNG** aktif!\n\nObjek apa yang ingin dibuat dengan background transparan?\n\nContoh: *"Ikon coffee cup minimalis untuk desain"*',
  vector: '🎨 Mode **Vector** aktif!\n\nIlustrasi vector apa yang ingin dibuat?\n\nContoh: *"Flat design kota modern dengan gedung-gedung"*',
  video: '🎬 Mode **Video** aktif!\n\nCeritakan scene video untuk Adobe Stock. Harus 5-60 detik, min 720p.\n\nContoh: *"Time-lapse sunset di pantai dengan ombak"*',
}

export default function AIStudio() {
  const [mode, setMode] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [finalPrompt, setFinalPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState(null)
  const [videoStatus, setVideoStatus] = useState(null)
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (mode === 'video') {
      api.getVideoStatus().then(r => setVideoStatus(r.data)).catch(() => setVideoStatus({ available: false }))
    }
  }, [mode])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const selectMode = (m) => {
    setMode(m)
    setMessages([{ role: 'assistant', content: WELCOME[m] }])
    setFinalPrompt('')
    setGeneratedImage(null)
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await api.botChat(newMessages, mode)
      const reply = res.data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      const match = reply.match(/\*\*Final Prompt[:\s]*\*\*\s*(.+?)(?:\n\n|\n$|$)/is) ||
                    reply.match(/Final [Pp]rompt[:\s]+(.+?)(?:\n\n|\n$|$)/is)
      if (match) setFinalPrompt(match[1].trim().replace(/^["']|["']$/g, ''))
    } catch { showToast('Gagal menghubungi bot', 'error') }
    finally { setLoading(false) }
  }

  const handleGenerate = async () => {
    const prompt = finalPrompt || messages.filter(m => m.role === 'user').pop()?.content || ''
    if (!prompt) { showToast('Diskusikan prompt dulu!', 'error'); return }
    setGenerating(true)
    try {
      if (mode === 'video') {
        const res = await api.generateVideo(prompt)
        if (res.data.limitReached) {
          showToast('Free.ai limit — gunakan Copy Prompt + Veo 3', 'error')
          setFinalPrompt(prompt)
        } else {
          showToast('Video tersimpan ke Drive! 🎉')
        }
      } else {
        const res = await api.generateImage(prompt, mode)
        setGeneratedImage(`data:image/jpeg;base64,${res.data.imageBase64}`)
        showToast('Gambar tersimpan ke Drive! 🎉')
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      if (err.response?.data?.limitReached) {
        showToast('Limit habis — gunakan Copy Prompt + Veo 3', 'error')
        setFinalPrompt(prompt)
      } else {
        showToast('Generate gagal: ' + msg, 'error')
      }
    } finally { setGenerating(false) }
  }

  const copyPrompt = () => {
    const prompt = finalPrompt || messages.filter(m => m.role === 'user').pop()?.content || ''
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showToast('Prompt disalin!')
  }

  const renderMessage = (msg, i) => {
    const isBot = msg.role === 'assistant'
    const text = msg.content.replace(/\*\*(.*?)\*\*/g, '$1')
    return (
      <div key={i} className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}>
        {isBot && (
          <div className="w-6 h-6 bg-acid/20 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
            <Sparkles size={12} className="text-acid" />
          </div>
        )}
        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isBot ? 'bg-ink-700 text-white rounded-tl-sm' : 'bg-acid/20 text-white rounded-tr-sm border border-acid/20'}`}>
          {text.split('\n').map((line, j) => (
            <p key={j} className={j > 0 && line ? 'mt-1.5' : j > 0 ? 'mt-0.5' : ''}>{line}</p>
          ))}
        </div>
      </div>
    )
  }

  // Mode selector
  if (!mode) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-acid" />
            AI Creative Studio
          </h1>
          <p className="text-gray-500 text-sm mt-1">Pilih mode untuk mulai brainstorm dengan AI</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          {MODES.map(m => (
            <button key={m.id} onClick={() => selectMode(m.id)}
              className={`card text-left border ${m.border} ${m.bg} transition-all active:scale-95 hover:scale-[1.02]`}>
              <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                <m.icon size={20} className={m.color} />
              </div>
              <p className={`font-display font-semibold text-sm ${m.color}`}>{m.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>
        <div className="card mt-4 max-w-lg border-ink-600">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="text-acid font-semibold">Cara pakai:</span> Pilih mode → Chat dengan AI → Sempurnakan prompt → Generate atau copy ke Veo 3
          </p>
        </div>
      </div>
    )
  }

  const currentMode = MODES.find(m => m.id === mode)

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-64px)]">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm animate-slide-up max-w-xs
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-acid/20 text-acid border border-acid/30'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <button onClick={() => setMode(null)} className="w-8 h-8 bg-ink-700 rounded-xl flex items-center justify-center hover:bg-ink-600">
          <ArrowLeft size={15} />
        </button>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${currentMode.bg} ${currentMode.border}`}>
          <currentMode.icon size={13} className={currentMode.color} />
          <span className={currentMode.color}>{currentMode.label}</span>
        </div>
        {mode === 'video' && videoStatus !== null && (
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl
            ${videoStatus.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {videoStatus.available ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
            Free.ai {videoStatus.available ? 'OK' : 'Limited'}
          </div>
        )}
        <button onClick={() => { setMessages([{ role: 'assistant', content: WELCOME[mode] }]); setFinalPrompt(''); setGeneratedImage(null); }}
          className="ml-auto w-8 h-8 bg-ink-700 rounded-xl flex items-center justify-center hover:bg-ink-600">
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Layout: mobile = stacked, desktop = side by side */}
      <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0">

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col card min-h-0 p-3 md:p-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-3 pr-0.5" style={{ minHeight: 0 }}>
            {messages.map(renderMessage)}
            {loading && (
              <div className="flex justify-start mb-3">
                <div className="w-6 h-6 bg-acid/20 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Sparkles size={12} className="text-acid" />
                </div>
                <div className="bg-ink-700 px-3.5 py-2.5 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1.5 items-center">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 shrink-0">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ketik pesan..."
              className="flex-1 bg-ink-700 border border-ink-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-acid transition-colors" />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="w-10 h-10 bg-acid text-ink-900 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 shrink-0">
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Action Panel */}
        <div className="md:w-56 flex flex-col gap-3 shrink-0">
          {/* Final Prompt */}
          <div className="card p-3">
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Final Prompt</p>
            <textarea value={finalPrompt} onChange={e => setFinalPrompt(e.target.value)}
              placeholder="Muncul otomatis dari chat..."
              className="w-full bg-ink-700 border border-ink-500 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-acid resize-none"
              rows={4} />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <button onClick={handleGenerate}
              disabled={generating || (mode === 'video' && !videoStatus?.available)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95
                ${generating || (mode === 'video' && !videoStatus?.available)
                  ? 'bg-ink-700 text-gray-500 cursor-not-allowed'
                  : 'bg-acid text-ink-900 hover:bg-acid-dim'}`}>
              {generating ? <><Loader size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate</>}
            </button>
            <button onClick={copyPrompt} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm py-2.5">
              {copied ? <CheckCircle size={14} className="text-acid" /> : <Copy size={14} />}
              {copied ? 'Tersalin!' : 'Copy Prompt'}
            </button>
            {mode === 'video' && (
              <a href="https://aistudio.google.com/generate/video" target="_blank" rel="noreferrer"
                className="btn-ghost w-full flex items-center justify-center gap-2 text-sm py-2.5 text-coral border-coral/30 hover:bg-coral/10">
                <ExternalLink size={14} />
                Buka Veo 3
              </a>
            )}
          </div>

          {/* Generated preview */}
          {generatedImage && (
            <div className="card p-3">
              <p className="text-xs text-gray-500 mb-2">Hasil Generate</p>
              <img src={generatedImage} alt="Generated" className="w-full rounded-xl" />
              <p className="text-xs text-green-400 mt-2 text-center">✅ Tersimpan ke Drive</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
