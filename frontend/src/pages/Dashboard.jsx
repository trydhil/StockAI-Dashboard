import { useState, useEffect } from 'react'
import { api } from '../hooks/api'
import { ImageIcon, CheckCircle, XCircle, Clock, Zap, TrendingUp, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [executions, setExecutions] = useState([])
  const [autoMode, setAutoMode] = useState(false)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState(null)
  const [sysInfo, setSysInfo] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    try {
      const [execRes, autoRes, sysRes] = await Promise.allSettled([
        api.getExecutions(),
        api.getAutoMode(),
        api.getSysInfo(),
      ])
      if (execRes.status === 'fulfilled') setExecutions(execRes.value.data.data || [])
      if (autoRes.status === 'fulfilled') setAutoMode(autoRes.value.data.enabled)
      if (sysRes.status === 'fulfilled') setSysInfo(sysRes.value.data)
    } catch {}
  }

  const handleExecute = async () => {
  if (running) return;
  setRunning(true);
  try {
    const res = await api.executeWorkflow();
    console.log('[Dashboard] Execute response:', res.data);
    showToast('Workflow berhasil dijalankan! 🚀');
    setTimeout(loadData, 3000);
  } catch (err) {
    console.error('[Dashboard] Execute error:', err);
    showToast(err.response?.data?.error || 'Gagal menjalankan workflow', 'error');
  } finally {
    setRunning(false);
  }
};

  const toggleAutoMode = async () => {
    try {
      await api.setAutoMode(!autoMode)
      setAutoMode(!autoMode)
      showToast(`Auto mode ${!autoMode ? 'aktif' : 'dimatikan'}`)
    } catch { showToast('Gagal', 'error') }
  }

  const successCount = executions.filter(e => e.status === 'success').length
  const errorCount = executions.filter(e => e.status === 'error').length
  const lastExec = executions[0]

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm animate-slide-up max-w-xs
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-acid/20 text-acid border border-acid/30'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-xs mt-0.5">StockAI v2.0</p>
        </div>
        <button onClick={() => navigate('/studio')}
          className="flex items-center gap-2 bg-acid/10 border border-acid/30 text-acid px-3 py-2 rounded-xl text-xs font-semibold hover:bg-acid/20 transition-all active:scale-95">
          <Sparkles size={13} />
          AI Studio
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
        {[
          { label: 'Total Eksekusi', value: executions.length, icon: Clock, color: 'text-ice' },
          { label: 'Sukses', value: successCount, icon: TrendingUp, color: 'text-acid' },
          { label: 'Error', value: errorCount, icon: XCircle, color: 'text-coral' },
          { label: 'Auto Mode', value: autoMode ? 'ON' : 'OFF', icon: autoMode ? CheckCircle : Clock, color: autoMode ? 'text-acid' : 'text-gray-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <Icon size={16} className={`${color} mb-2`} />
            <div className="font-display font-bold text-xl md:text-2xl">{value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Execute */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} className="text-acid" />
            <h2 className="font-display font-semibold text-sm">Jalankan Workflow</h2>
          </div>
          <p className="text-gray-500 text-xs mb-3">Proses semua file baru di Drive → konversi → metadata CSV</p>
          <button onClick={handleExecute} disabled={running} className="btn-acid w-full disabled:opacity-40">
            {running
              ? <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
                  Menjalankan...
                </span>
              : '▶ Execute Workflow'}
          </button>
        </div>

        {/* Auto Mode */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-ice" />
              <h2 className="font-display font-semibold text-sm">Mode Otomatis</h2>
            </div>
            <button onClick={toggleAutoMode} className="transition-all active:scale-90">
              {autoMode ? <ToggleRight size={26} className="text-acid" /> : <ToggleLeft size={26} className="text-gray-500" />}
            </button>
          </div>
          <p className="text-gray-500 text-xs mb-2">
            {autoMode ? '✅ Aktif — cek file baru setiap 5 menit' : 'Jalankan otomatis saat ada file baru'}
          </p>
          <div className={`text-xs font-mono px-2.5 py-1 rounded-lg inline-block
            ${autoMode ? 'bg-acid/10 text-acid' : 'bg-ink-700 text-gray-500'}`}>
            {autoMode ? '● AKTIF' : '○ OFF'}
          </div>
        </div>
      </div>

      {/* System Info */}
      {sysInfo && (
        <div className="card mb-4 p-4">
          <h2 className="font-semibold text-xs text-gray-400 mb-3">System Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Hostname', value: sysInfo.hostname },
              { label: 'Uptime', value: `${sysInfo.uptime}m` },
              { label: 'RAM Total', value: `${sysInfo.totalMem}GB` },
              { label: 'RAM Bebas', value: `${sysInfo.freeMem}GB` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-gray-500">{label}</div>
                <div className="font-mono text-sm text-white mt-0.5 truncate">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Executions */}
      <div className="card">
        <h2 className="font-display font-semibold text-sm mb-3">Riwayat Eksekusi</h2>
        {executions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Belum ada eksekusi</p>
        ) : (
          <div className="space-y-1.5">
            {executions.slice(0, 8).map((exec) => (
              <div key={exec.id} className="flex items-center justify-between py-2 border-b border-ink-700 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={
                    exec.status === 'success' ? 'badge-success' :
                    exec.status === 'error' ? 'badge-error' :
                    exec.status === 'running' ? 'badge-running' : 'badge-waiting'
                  }>{exec.status}</span>
                  <span className="text-xs text-gray-500 font-mono hidden sm:block">#{exec.id?.slice(-6)}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {exec.startedAt ? new Date(exec.startedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
