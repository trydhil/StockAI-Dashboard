import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AIStudio from './pages/AIStudio'
import DriveFiles from './pages/DriveFiles'
import Workflow from './pages/Workflow'
import Desktop from './pages/Desktop'
import Settings from './pages/Settings'

function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <Sidebar />
      {/* Main content */}
      <main className="flex-1 ml-0 md:ml-56 p-4 md:p-8 pb-20 md:pb-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/studio" element={<AIStudio />} />
          <Route path="/drive" element={<DriveFiles />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/desktop" element={<Desktop />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {/* Bottom nav mobile */}
      <BottomNav />
    </div>
  )
}

function AppRoutes() {
  const { isAuth } = useAuth()
  return isAuth ? <Layout /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
