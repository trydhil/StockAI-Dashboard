import { useState, useEffect } from 'react'
import { api } from '../hooks/api'
import { Play, RefreshCw, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'

function formatDuration(start, end) {
  if (!start || !end) return '-'
  const ms = new Date(end) - new Date(start)
  return ms > 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`
}

function formatDate(str) {
  return str ? new Date(str).toLocaleString('id-ID') : '-'
}

export default function Workflow() {
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState(null)
  const [n8nStatus, setN8nStatus] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [execRes, statusRes] = await Promise.allSettled([
        api.getExecutions(),
        api.getN8nStatus(),
      ])
      if (execRes.status === 'fulfilled') setExecutions(execRes.value.data.data || [])
      if (statusRes.status === 'fulfilled') setN8nStatus(statusRes.value.data)
    } catch {}
    setLoading(false)
  }

  const handleExecute = async () => {
    setRunning(true)
    try {
      await api.executeWorkflow()
      showToast('Workflow berhasil dijalankan!')
      setTimeout(loadData, 3000)
    } catch {
      showToast('Gagal menjalankan workflow', 'error')
    } finally {
      setRunning(false)
    }
  }

  const statusBadge = (status) => {
    const map = {
      success: 'badge-success',
      error: 'badge-error',
      running: 'badge-running',
      waiting: 'badge-waiting',
    }
    return map[status] || 'badge-waiting'
  }

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm animate-slide-up
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-acid/20 text-acid border border-acid/30'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Workflow</h1>
          <p className="text-gray-500 text-sm mt-1">Kontrol & monitor n8n workflow</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-ghost">
            <RefreshCw size={14} className={`inline mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={handleExecute} disabled={running} className="btn-acid">
            <Play size={14} className="inline mr-1" />
            {running ? 'Running...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* n8n Status */}
      {n8nStatus && (
        <div className="card mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Workflow Name</p>
            <p className="font-display font-semibold text-sm">{n8nStatus.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={n8nStatus.active ? 'badge-success' : 'badge-error'}>
              {n8nStatus.active ? 'Active' : 'Inactive'}
            </span>
            <a
              href="http://localhost:5678"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs"
            >
              <ExternalLink size={12} className="inline mr-1" />
              Buka n8n
            </a>
          </div>
        </div>
      )}

      {/* Execution Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total', value: executions.length, icon: Clock, color: 'text-ice' },
          { label: 'Sukses', value: executions.filter(e => e.status === 'success').length, icon: CheckCircle, color: 'text-acid' },
          { label: 'Error', value: executions.filter(e => e.status === 'error').length, icon: XCircle, color: 'text-coral' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center">
            <Icon size={20} className={`${color} mx-auto mb-2`} />
            <div className="font-display font-bold text-xl">{value}</div>
            <div className="text-gray-500 text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Execution Table */}
      <div className="card">
        <h2 className="font-display font-semibold text-sm mb-4">Riwayat Eksekusi (20 terakhir)</h2>
        {executions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Belum ada eksekusi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-600">
                  <th className="text-left text-xs text-gray-500 pb-3 font-body font-medium">ID</th>
                  <th className="text-left text-xs text-gray-500 pb-3 font-body font-medium">Status</th>
                  <th className="text-left text-xs text-gray-500 pb-3 font-body font-medium">Mulai</th>
                  <th className="text-left text-xs text-gray-500 pb-3 font-body font-medium">Durasi</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(exec => (
                  <tr key={exec.id} className="border-b border-ink-700 last:border-0">
                    <td className="py-3 font-mono text-xs text-gray-400">#{exec.id?.slice(-8)}</td>
                    <td className="py-3">
                      <span className={statusBadge(exec.status)}>{exec.status}</span>
                    </td>
                    <td className="py-3 text-xs text-gray-400">{formatDate(exec.startedAt)}</td>
                    <td className="py-3 text-xs font-mono text-gray-400">
                      {formatDuration(exec.startedAt, exec.stoppedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
