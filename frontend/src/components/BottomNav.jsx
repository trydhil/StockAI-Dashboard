import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Sparkles, FolderOpen, Play, Settings } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/studio', icon: Sparkles, label: 'Studio' },
  { to: '/drive', icon: FolderOpen, label: 'Drive' },
  { to: '/workflow', icon: Play, label: 'Workflow' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-ink-800 border-t border-ink-600 px-2 py-2 safe-area-bottom">
      <div className="flex items-center justify-around">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]
              ${isActive ? 'text-acid' : 'text-gray-500'}`}>
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all
                  ${isActive ? 'bg-acid/15' : ''}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
