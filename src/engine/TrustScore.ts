// ─── Trust Score Engine ───────────────────────────────────────────────────────
// Persists in localStorage. Tracks responsible behavior over sessions.
// Score range: 0–100. Expert Mode unlocks at 85+.

export interface TrustEvent {
  type: TrustEventType
  delta: number
  reason: string
  timestamp: number
}

export type TrustEventType =
  | 'anonymized_voluntarily'
  | 'completed_critical_thinking'
  | 'created_verification_plan'
  | 'wrote_freetext_response'
  | 'read_risk_explanation'
  | 'human_decision_recorded'
  | 'transparency_card_viewed'
  | 'quick_approval'
  | 'bypass_attempt'
  | 'repeated_flagged_submission'
  | 'skill_degradation_triggered'
  | 'dismissed_warning'

const STORAGE_KEY = 'thinkshield_trust'
const HISTORY_KEY = 'thinkshield_trust_history'
const EXPERT_MODE_KEY = 'thinkshield_expert_mode'
const EXPERT_THRESHOLD = 85

interface TrustStore {
  score: number
  totalEvents: number
  lastUpdated: number
}

const EVENT_DELTAS: Record<TrustEventType, number> = {
  anonymized_voluntarily:       +3,
  completed_critical_thinking:  +2,
  created_verification_plan:    +3,
  wrote_freetext_response:      +2,
  read_risk_explanation:        +1,
  human_decision_recorded:      +2,
  transparency_card_viewed:     +1,
  quick_approval:               -3,
  bypass_attempt:               -5,
  repeated_flagged_submission:  -4,
  skill_degradation_triggered:  -2,
  dismissed_warning:            -1,
}

function loadStore(): TrustStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TrustStore
  } catch { /* ignore */ }
  return { score: 50, totalEvents: 0, lastUpdated: Date.now() }
}

function saveStore(store: TrustStore): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* ignore */ }
}

function loadHistory(): TrustEvent[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw) as TrustEvent[]
  } catch { /* ignore */ }
  return []
}

function saveHistory(history: TrustEvent[]): void {
  try {
    // Keep last 100 events
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-100)))
  } catch { /* ignore */ }
}

export function getTrustScore(): number {
  return loadStore().score
}

export function getTrustStore(): TrustStore {
  return loadStore()
}

export function getTrustHistory(): TrustEvent[] {
  return loadHistory()
}

export function recordTrustEvent(type: TrustEventType, reason?: string): number {
  const store = loadStore()
  const history = loadHistory()
  const delta = EVENT_DELTAS[type]

  const newScore = Math.min(100, Math.max(0, store.score + delta))

  const event: TrustEvent = {
    type,
    delta,
    reason: reason ?? type.replace(/_/g, ' '),
    timestamp: Date.now(),
  }

  store.score = newScore
  store.totalEvents++
  store.lastUpdated = Date.now()

  saveStore(store)
  saveHistory([...history, event])

  return newScore
}

export function isExpertModeEarned(): boolean {
  return loadStore().score >= EXPERT_THRESHOLD
}

export function isExpertModeActive(): boolean {
  try {
    return localStorage.getItem(EXPERT_MODE_KEY) === 'true'
  } catch { return false }
}

export function setExpertMode(active: boolean): void {
  try {
    localStorage.setItem(EXPERT_MODE_KEY, String(active))
  } catch { /* ignore */ }
}

export function resetTrustScore(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(HISTORY_KEY)
    localStorage.removeItem(EXPERT_MODE_KEY)
  } catch { /* ignore */ }
}

export function getTrustLevel(): 'low' | 'building' | 'established' | 'expert' {
  const score = getTrustScore()
  if (score >= EXPERT_THRESHOLD) return 'expert'
  if (score >= 65) return 'established'
  if (score >= 35) return 'building'
  return 'low'
}

export const EXPERT_THRESHOLD_VALUE = EXPERT_THRESHOLD
