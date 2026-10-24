import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Shield, Brain, LayoutDashboard, Info, FlaskConical, GitBranch, BookOpen, Settings, Lock } from 'lucide-react'
import HomePage from './pages/HomePage'
import WorkspacePage from './pages/WorkspacePage'
import DecisionEnginePage from './pages/DecisionEnginePage'
import DashboardPage from './pages/DashboardPage'
import AboutPage from './pages/AboutPage'
import TutorialPage from './pages/TutorialPage'
import AdminPage from './pages/AdminPage'
import { isExpertModeActive } from './engine/TrustScore'

export default function App() {
  const expertMode = isExpertModeActive()

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#f4f4f4]">

        {/* IBM-style top bar */}
        <header className="bg-[#161616] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12">

              {/* Logo */}
              <NavLink to="/" className="flex items-center gap-2.5">
                <div className="w-6 h-6 bg-[#0f62fe] flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-white text-sm tracking-tight">
                  ThinkShield AI
                </span>
              </NavLink>

              {/* Nav */}
              <nav className="hidden md:flex items-center">
                {[
                  { to: '/', label: 'Home', icon: <Shield className="w-3.5 h-3.5" /> },
                  { to: '/workspace', label: 'Workspace', icon: <Brain className="w-3.5 h-3.5" /> },
                  { to: '/decision-engine', label: 'Decision Engine', icon: <GitBranch className="w-3.5 h-3.5" /> },
                  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
                  { to: '/tutorial', label: 'Tutorial', icon: <BookOpen className="w-3.5 h-3.5" /> },
                  { to: '/about', label: 'About', icon: <Info className="w-3.5 h-3.5" /> },
                  { to: '/admin', label: 'Admin', icon: <Lock className="w-3.5 h-3.5" /> },
                ].map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 h-12 text-sm transition-colors border-b-2 ${
                        isActive
                          ? 'text-white border-[#0f62fe]'
                          : 'text-[#c6c6c6] border-transparent hover:text-white hover:bg-[#262626]'
                      }`
                    }
                  >
                    {icon}
                    <span className="hidden lg:block">{label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-2">
                {expertMode && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-[#6929c4] text-white text-xs font-semibold">
                    <Settings className="w-3 h-3" /> Expert Mode
                  </span>
                )}
                <span className="flex items-center gap-1 px-2 py-0.5 bg-[#393939] text-[#c6c6c6] text-xs font-medium">
                  <FlaskConical className="w-3 h-3" /> Demo
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/decision-engine" element={<DecisionEnginePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tutorial" element={<TutorialPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <footer className="border-t border-[#e0e0e0] bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 text-center text-xs text-[#6f6f6f]">
            ThinkShield AI — Responsible AI × IBM Hackathon Prototype.
            Not certified. Not legally compliant. For demonstration purposes only.
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}
