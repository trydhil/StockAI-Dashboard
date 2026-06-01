import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, FolderOpen, Play, Monitor, Settings, LogOut, Zap, Sparkles } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/studio', icon: Sparkles, label: 'AI Studio', badge: 'NEW' },
  { to: '/drive', icon: FolderOpen, label: 'Drive Files' },
  { to: '/workflow', icon: Play, label: 'Workflow' },
  { to: '/desktop', icon: Monitor, label: 'Desktop' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { logout } = useAuth()
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-ink-800 border-r border-ink-600 flex-col z-50">
      <div className="p-4 flex items-center gap-3 border-b border-ink-600">
        <div className="w-8 h-8 bg-acid rounded-lg flex items-center justify-center shrink-0">
          <Zap size={14} className="text-ink-900" />
        </div>
        <div>
          <span className="font-display font-bold text-sm tracking-tight">StockAI</span>
          <span className="text-xs text-gray-500 block">v2.0</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {links.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm
              ${isActive ? 'bg-acid/15 text-acid' : 'text-gray-400 hover:text-white hover:bg-ink-700'}`}>
            <Icon size={17} className="shrink-0" />
            <span className="flex items-center gap-2 flex-1 font-medium">
              {label}
              {badge && <span className="text-[10px] bg-acid text-ink-900 px-1.5 py-0.5 rounded-full font-bold">{badge}</span>}
            </span>
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t border-ink-600">
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-coral hover:bg-red-500/10 transition-all w-full text-sm">
          <LogOut size={17} className="shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
