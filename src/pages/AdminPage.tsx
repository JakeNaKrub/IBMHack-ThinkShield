import { useState } from 'react'
import { Lock, Unlock, Shield, TrendingUp, Clock, CheckCircle, AlertTriangle, Zap, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getTrustScore, getTrustStore, getTrustHistory, getTrustLevel,
  isExpertModeActive, isExpertModeEarned, setExpertMode, resetTrustScore,
  EXPERT_THRESHOLD_VALUE, type TrustEvent
} from '../engine/TrustScore'

const ADMIN_PIN = '1234' // demo PIN — in production this would be proper auth

function TrustBar({ score }: { score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[#6f6f6f]">
        <span>0</span>
        <span className="font-semibold text-[#0f62fe]">{score}/100</span>
        <span>100</span>
      </div>
      <div className="w-full bg-[#e0e0e0] h-3 relative">
        <div
          className="h-3 transition-all duration-500"
          style={{
            width: `${score}%`,
            background: score >= 85 ? '#6929c4' : score >= 65 ? '#24a148' : score >= 35 ? '#0f62fe' : '#da1e28'
          }}
        />
        {/* Expert threshold marker */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-[#6929c4]"
          style={{ left: `${EXPERT_THRESHOLD_VALUE}%` }}
          title={`Expert Mode threshold: ${EXPERT_THRESHOLD_VALUE}`}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[#da1e28]">Low</span>
        <span className="text-[#0f62fe]">Building</span>
        <span className="text-[#24a148]">Established</span>
        <span className="text-[#6929c4] font-semibold">Expert ≥{EXPERT_THRESHOLD_VALUE}</span>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [expertActive, setExpertActive] = useState(isExpertModeActive())
  const [score, setScore] = useState(getTrustScore())
  const [showHistory, setShowHistory] = useState(false)

  const store = getTrustStore()
  const history = getTrustHistory()
  const level = getTrustLevel()
  const earned = isExpertModeEarned()

  const handlePinSubmit = () => {
    if (pin === ADMIN_PIN) {
      setAuthenticated(true)
      setPinError(false)
    } else {
      setPinError(true)
      setPin('')
    }
  }

  const handleToggleExpert = () => {
    const next = !expertActive
    setExpertMode(next)
    setExpertActive(next)
  }

  const handleReset = () => {
    resetTrustScore()
    setScore(50)
    setExpertActive(false)
  }

  const eventColor = (delta: number) =>
    delta > 0 ? 'text-[#24a148]' : 'text-[#da1e28]'

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString()

  // ── Not authenticated ────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 space-y-6">
        <div className="card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#161616] flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-[#161616] text-base">Admin Panel</h1>
              <p className="text-xs text-[#6f6f6f]">ThinkShield AI — restricted access</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#161616]">
              Enter admin PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
              placeholder="PIN"
              className={`w-full px-4 py-2.5 border ${pinError ? 'border-[#da1e28]' : 'border-[#8d8d8d]'} focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe] outline-none text-sm`}
            />
            {pinError && (
              <p className="text-xs text-[#da1e28] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Incorrect PIN. Try again.
              </p>
            )}
            <p className="text-xs text-[#6f6f6f]">Demo PIN: <code className="font-mono bg-[#f4f4f4] px-1">1234</code></p>
          </div>

          <button onClick={handlePinSubmit} className="btn-primary w-full justify-center">
            <Unlock className="w-4 h-4" />
            Authenticate
          </button>
        </div>
      </div>
    )
  }

  // ── Authenticated ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#161616] flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-[#161616] text-lg">Admin Panel</h1>
            <p className="text-xs text-[#6f6f6f]">Trust Score & Expert Mode management</p>
          </div>
        </div>
        <button onClick={() => setAuthenticated(false)} className="btn-secondary text-xs gap-1.5">
          <Lock className="w-3 h-3" /> Lock
        </button>
      </div>

      {/* Trust Score overview */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-[#161616] text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0f62fe]" />
            User Trust Score
          </h2>
          <span className={`text-xs font-bold px-3 py-1 ${
            level === 'expert' ? 'bg-[#e8daff] text-[#491d8b]' :
            level === 'established' ? 'bg-[#defbe6] text-[#044317]' :
            level === 'building' ? 'bg-[#d0e2ff] text-[#002d9c]' :
            'bg-[#fff1f1] text-[#a2191f]'
          }`}>
            {level.toUpperCase()}
          </span>
        </div>

        <TrustBar score={score} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Current Score', value: score },
            { label: 'Total Events', value: store.totalEvents },
            { label: 'Expert Threshold', value: `${EXPERT_THRESHOLD_VALUE}` },
            { label: 'Status', value: earned ? 'Earned ✓' : 'Not yet' },
          ].map(s => (
            <div key={s.label} className="card-inset p-3 space-y-1">
              <p className="text-xs text-[#6f6f6f]">{s.label}</p>
              <p className="text-lg font-bold text-[#161616]">{s.value}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#6f6f6f]">
          Last updated: {formatTime(store.lastUpdated)}. Trust Score persists across sessions via localStorage.
          It measures observable responsible behavior — not cognitive ability.
        </p>
      </div>

      {/* Expert Mode control */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-[#161616] text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#6929c4]" />
          Expert / Sleep Mode
        </h2>
        <p className="text-sm text-[#525252]">
          When active, Expert Mode reduces friction — shorter checkpoints, no repeated explanations,
          compact warnings instead of full blocking flows. All hard-block rules remain enforced.
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2.5 ${
            expertActive ? 'bg-[#6929c4] text-white' : 'bg-[#e0e0e0] text-[#525252]'
          }`}>
            <Zap className="w-4 h-4" />
            <span className="font-semibold text-sm">
              Expert Mode: {expertActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>

          {!earned && !expertActive && (
            <p className="text-xs text-[#da1e28] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Trust Score {score}/100 — requires {EXPERT_THRESHOLD_VALUE} to unlock automatically
            </p>
          )}

          {earned && !expertActive && (
            <p className="text-xs text-[#24a148] flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Trust threshold reached — Expert Mode available
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleToggleExpert} className={expertActive ? 'btn-danger' : 'btn-primary'}>
            {expertActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {expertActive ? 'Deactivate Expert Mode' : 'Activate Expert Mode (Admin Override)'}
          </button>
        </div>

        <p className="text-xs text-[#6f6f6f] notification-warning p-2">
          <strong>Admin override:</strong> Activating Expert Mode bypasses the Trust Score threshold.
          This should only be used for verified experienced users. All overrides are logged.
        </p>
      </div>

      {/* Behavior breakdown */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-[#161616] text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0f62fe]" />
          Recent Behavioral Events
        </h2>

        {history.length === 0 ? (
          <p className="text-sm text-[#6f6f6f]">No events recorded yet. Use the workspace to build your Trust Score.</p>
        ) : (
          <>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {[...history].reverse().slice(0, showHistory ? 100 : 8).map((event: TrustEvent, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[#f4f4f4]">
                  <span className="text-[#525252]">{event.reason}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${eventColor(event.delta)}`}>
                      {event.delta > 0 ? '+' : ''}{event.delta}
                    </span>
                    <span className="text-[#8d8d8d]">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
            {history.length > 8 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-ghost text-xs gap-1"
              >
                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showHistory ? 'Show less' : `Show all ${history.length} events`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Danger zone */}
      <div className="card p-6 space-y-4 border-[#da1e28]">
        <h2 className="font-semibold text-[#da1e28] text-sm">Danger Zone</h2>
        <p className="text-sm text-[#525252]">
          Resetting the Trust Score clears all history and resets the score to the neutral starting value of 50.
          This cannot be undone.
        </p>
        <button onClick={handleReset} className="btn-danger">
          <RefreshCw className="w-4 h-4" />
          Reset Trust Score & History
        </button>
      </div>

      <div className="text-xs text-[#6f6f6f] text-center">
        Trust Score data is stored only in this browser's localStorage.
        No data is transmitted to any server.
      </div>
    </div>
  )
}
