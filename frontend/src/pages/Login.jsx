import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../hooks/api'

export default function Login() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleLogin = async () => {
    if (pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      await api.login(pin)
      login(pin)
    } catch {
      setError('PIN salah, coba lagi!')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (k) => {
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 6) return
    setPin(p => p + k)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="animate-slide-up text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-acid rounded-lg flex items-center justify-center">
            <span className="text-ink-900 font-display font-bold text-sm">S</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">StockAI</span>
        </div>
        <p className="text-gray-500 text-sm font-body">Masukkan PIN untuk akses dashboard</p>
      </div>

      <div className="animate-slide-up card w-full max-w-xs">
        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all
                ${pin.length > i ? 'border-acid bg-acid/10' : 'border-ink-500'}`}
            >
              {pin.length > i && <div className="w-3 h-3 bg-acid rounded-full" />}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-coral text-xs text-center mb-4 font-mono">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((k) => (
            <button
              key={k}
              onClick={() => k && handleKey(k)}
              disabled={!k}
              className={`h-12 rounded-xl font-display font-semibold text-lg transition-all active:scale-90
                ${!k ? 'invisible' : 
                  k === 'del' ? 'bg-ink-700 text-gray-400 hover:bg-ink-600 text-sm' :
                  'bg-ink-700 text-white hover:bg-ink-600'}`}
            >
              {k === 'del' ? '⌫' : k}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={pin.length < 4 || loading}
          className="btn-acid w-full mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Memverifikasi...' : 'Masuk →'}
        </button>
      </div>
    </div>
  )
}
