import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Shield, Brain, RefreshCw, ChevronRight, AlertTriangle,
  CheckCircle, XCircle, Bot, User, Cpu, Eye, Clock, AlertOctagon,
  Lightbulb, FileText, FlaskConical, Edit3, Check, Plus, X, Zap
} from 'lucide-react'
import { scanText } from '../engine/PrivacyScanner'
import { runDecisionTreeA, runDecisionTreeARecheck } from '../engine/DecisionTreeEngine'
import { anonymizeText, generateAlternativeSuggestion } from '../engine/AnonymizationEngine'
import { generateDemoResponse, runDecisionTreeB } from '../engine/DemoAIProvider'
import { runAgentSimulation, recordApproval } from '../engine/AgentSimulator'
import { recordScan, recordAgentReview, recordSkillDegradationAlert, recordQuickApproval, recordCriticalThinkingActivity } from '../engine/SessionMetrics'
import { recordTrustEvent, getTrustScore, isExpertModeActive } from '../engine/TrustScore'
import { getCustomKeywords, addCustomKeyword, removeCustomKeyword, scanCustomKeywords } from '../engine/CustomKeywords'
import { DEMO_SCENARIOS } from '../data/demoScenarios'
import type {
  WorkspaceStage, DecisionResult, AnonymizationResult,
  AIResponse, AgentAction, CriticalThinkingDecisionResult,
  CriticalThinkingActivity, SkillDegradationAlert, HumanDecision, Domain
} from '../types'

// ─── Stage indicator ──────────────────────────────────────────────────────────

const STAGES: { id: WorkspaceStage; label: string }[] = [
  { id: 'input', label: 'Write' },
  { id: 'privacy_review', label: 'Privacy' },
  { id: 'anonymization', label: 'Anonymize' },
  { id: 'ai_response', label: 'AI Response' },
  { id: 'critical_thinking', label: 'Think' },
  { id: 'human_decision', label: 'Decide' },
]

function StageIndicator({ current }: { current: WorkspaceStage }) {
  const visible = STAGES.filter(s => s.id !== 'scanning' && s.id !== 'generating')
  const currentIdx = visible.findIndex(s => s.id === current)

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {visible.map((stage, idx) => {
        const done = idx < currentIdx
        const active = idx === currentIdx
        return (
          <React.Fragment key={stage.id}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
              active ? 'bg-[#0f62fe] text-white' :
              done ? 'bg-[#defbe6] text-[#044317]' :
              'bg-[#e0e0e0] text-[#6f6f6f]'
            }`}>
              {done ? <Check className="w-3 h-3" /> : <span>{idx + 1}</span>}
              <span className="hidden sm:block">{stage.label}</span>
            </div>
            {idx < visible.length - 1 && (
              <div className="w-px h-6 bg-[#c6c6c6]" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const cfg: Record<string, string> = {
    low: 'risk-badge-low',
    medium: 'risk-badge-medium',
    high: 'risk-badge-high',
    critical: 'risk-badge-critical',
  }
  return <span className={cfg[level] ?? 'risk-badge-low'}>{level.toUpperCase()}</span>
}

// ─── Highlighted Text ─────────────────────────────────────────────────────────

function HighlightedPrompt({ text, matches }: {
  text: string
  matches: Array<{ startIndex: number; endIndex: number; matchedText: string; category: string; riskLevel: string }>
}) {
  if (matches.length === 0) return <span className="text-[#161616]">{text}</span>

  const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex)
  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const m of sorted) {
    if (m.startIndex > cursor) {
      parts.push(<span key={`t-${cursor}`} className="text-[#161616]">{text.slice(cursor, m.startIndex)}</span>)
    }
    const color = m.riskLevel === 'critical' || m.riskLevel === 'high'
      ? 'bg-[#ffd7d9] text-[#750e13] font-semibold'
      : 'bg-[#f6f2c0] text-[#8e4f00] font-semibold'
    parts.push(
      <span key={`h-${m.startIndex}`} className={color} title={m.category}>
        {text.slice(m.startIndex, m.endIndex)}
      </span>
    )
    cursor = m.endIndex
  }
  if (cursor < text.length) {
    parts.push(<span key="t-end" className="text-[#161616]">{text.slice(cursor)}</span>)
  }
  return <>{parts}</>
}

// ─── AI Mirror Component ──────────────────────────────────────────────────────

function AIMirror({ question, responded, onRespond, onReconsider, confirmLabel, reconsiderLabel }: {
  question: string
  responded: boolean
  onRespond: () => void
  onReconsider?: () => void
  confirmLabel?: string
  reconsiderLabel?: string
}) {
  const handleRespond = () => {
    recordTrustEvent('read_risk_explanation', 'AI Mirror interaction')
    onRespond()
  }

  const handleReconsider = () => {
    recordTrustEvent('read_risk_explanation', 'AI Mirror — chose to reconsider')
    if (onReconsider) onReconsider()
    else onRespond()
  }

  return (
    <div className="mirror-bubble">
      <div className="flex items-center gap-2 text-[#0f62fe] font-semibold text-xs uppercase tracking-widest">
        <Eye className="w-3.5 h-3.5" />
        AI Mirror
      </div>
      <p className="text-sm text-[#161616] font-medium">{question}</p>
      {!responded ? (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleRespond}
            className="text-xs px-3 py-1.5 bg-[#0f62fe] text-white font-semibold hover:bg-[#0043ce] transition-colors"
          >
            {confirmLabel ?? 'Yes, I meant to share this'}
          </button>
          <button
            onClick={handleReconsider}
            className="text-xs px-3 py-1.5 border border-[#0f62fe] text-[#0f62fe] font-semibold hover:bg-[#edf5ff] transition-colors"
          >
            {reconsiderLabel ?? 'No, let me reconsider'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#24a148] flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" /> Noted. Continue below.
        </p>
      )}
    </div>
  )
}

// ─── Custom Keywords Panel ────────────────────────────────────────────────────

function CustomKeywordsPanel() {
  const [keywords, setKeywords] = useState(getCustomKeywords())
  const [newTerm, setNewTerm] = useState('')
  const [newCategory, setNewCategory] = useState('Custom Sensitive Term')
  const [newRisk, setNewRisk] = useState<'low' | 'medium' | 'high'>('medium')
  const [adding, setAdding] = useState(false)

  const handleAdd = () => {
    if (!newTerm.trim()) return
    addCustomKeyword(newTerm, newCategory, newRisk)
    setKeywords(getCustomKeywords())
    setNewTerm('')
    setAdding(false)
  }

  const handleRemove = (id: string) => {
    removeCustomKeyword(id)
    setKeywords(getCustomKeywords())
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#161616] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-[#0f62fe]" />
          Custom Keywords to Flag
        </p>
        <button onClick={() => setAdding(!adding)} className="text-xs text-[#0f62fe] font-semibold hover:underline">
          {adding ? 'Cancel' : '+ Add keyword'}
        </button>
      </div>

      {adding && (
        <div className="space-y-2 p-3 bg-[#f4f4f4]">
          <input
            value={newTerm}
            onChange={e => setNewTerm(e.target.value)}
            placeholder="Term to flag (e.g. Project Phoenix, Client XYZ)"
            className="w-full px-3 py-2 border border-[#8d8d8d] text-sm focus:border-[#0f62fe] outline-none"
          />
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border border-[#8d8d8d] text-xs focus:border-[#0f62fe] outline-none"
            />
            <select
              value={newRisk}
              onChange={e => setNewRisk(e.target.value as 'low' | 'medium' | 'high')}
              className="px-3 py-2 border border-[#8d8d8d] text-xs focus:border-[#0f62fe] outline-none bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button onClick={handleAdd} className="btn-primary text-xs">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      )}

      {keywords.length === 0 && !adding && (
        <p className="text-xs text-[#6f6f6f]">No custom keywords added yet. Add terms specific to your organization that should always be flagged.</p>
      )}

      {keywords.map(kw => (
        <div key={kw.id} className="flex items-center justify-between text-xs py-1 border-b border-[#f4f4f4]">
          <div className="flex items-center gap-2">
            <code className="font-mono bg-[#e8daff] text-[#491d8b] px-1.5 py-0.5">{kw.term}</code>
            <span className="text-[#6f6f6f]">{kw.category}</span>
            <RiskBadge level={kw.riskLevel} />
          </div>
          <button onClick={() => handleRemove(kw.id)} className="text-[#da1e28] hover:text-[#750e13]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Domain-aware text helpers ────────────────────────────────────────────────

function getDomainLabel(domain: Domain): string {
  return { healthcare: 'clinical', banking: 'financial', legal: 'legal', general: 'your' }[domain]
}

function getDisclaimerText(domain: Domain): string {
  return {
    healthcare: 'Do not enter real patient data. All examples use entirely synthetic fictional information.',
    banking: 'Do not enter real customer or financial data. All examples use entirely synthetic fictional information.',
    legal: 'Do not enter real client or confidential information. All examples use entirely synthetic fictional information.',
    general: 'Do not enter real personal or sensitive data. All examples use entirely synthetic fictional information.',
  }[domain]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'manual' | 'agent'>('manual')
  const [prompt, setPrompt] = useState('')
  const [stage, setStage] = useState<WorkspaceStage>('input')
  const [currentDomain, setCurrentDomain] = useState<Domain>('general')
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null)
  const [anonymizationResult, setAnonymizationResult] = useState<AnonymizationResult | null>(null)
  const [editedAnonymized, setEditedAnonymized] = useState('')
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [agentAction, setAgentAction] = useState<AgentAction | null>(null)
  const [ctResult, setCtResult] = useState<CriticalThinkingDecisionResult | null>(null)
  const [humanDecision, setHumanDecision] = useState<HumanDecision | null>(null)
  const [skillAlert, setSkillAlert] = useState<SkillDegradationAlert | null>(null)
  const [selectedVerification, setSelectedVerification] = useState<string[]>([])
  const [freeTextResponses, setFreeTextResponses] = useState<Record<string, string>>({})
  const [checkedDecisionItems, setCheckedDecisionItems] = useState<string[]>([])
  const [showHint, setShowHint] = useState<Record<string, boolean>>({})
  const [mirrorDismissed, setMirrorDismissed] = useState(false)
  const [mirrorPreResponded, setMirrorPreResponded] = useState(false)
  const [mirrorPostResponded, setMirrorPostResponded] = useState(false)
  const [showKeywordsPanel, setShowKeywordsPanel] = useState(false)
  const agentRevealedRef = useRef<number | null>(null)
  const expertMode = isExpertModeActive()
  const trustScore = getTrustScore()

  // Load scenario from URL
  useEffect(() => {
    const scenarioId = searchParams.get('scenario')
    if (scenarioId) {
      const scenario = DEMO_SCENARIOS.find(s => s.scenarioId === scenarioId)
      if (scenario) {
        setPrompt(scenario.preloadedPrompt)
        setCurrentDomain(scenario.domain)
        setMode(scenario.mode === 'agent' ? 'agent' : 'manual')
      }
    }
  }, [searchParams])

  const resetAll = useCallback(() => {
    setStage('input')
    setDecisionResult(null)
    setAnonymizationResult(null)
    setEditedAnonymized('')
    setAiResponse(null)
    setAgentAction(null)
    setCtResult(null)
    setHumanDecision(null)
    setSkillAlert(null)
    setSelectedVerification([])
    setFreeTextResponses({})
    setCheckedDecisionItems([])
    setShowHint({})
    setMirrorDismissed(false)
    setMirrorPreResponded(false)
    setMirrorPostResponded(false)
    agentRevealedRef.current = null
  }, [])

  // ── Stage 1→2: Check prompt ─────────────────────────────────────────────────
  const handleCheckPrompt = useCallback(() => {
    if (!prompt.trim()) return
    setStage('scanning')
    setTimeout(() => {
      const scan = scanText(prompt)
      // Also check custom keywords
      const customHits = scanCustomKeywords(prompt)
      const domain = scan.domain !== 'general' ? scan.domain : currentDomain

      // Merge custom keyword matches into scan result
      if (customHits.length > 0) {
        scan.matches.push(...customHits.map(h => ({
          id: `ck_${h.keyword.id}`,
          category: 'personal_identifier' as const,
          riskLevel: h.keyword.riskLevel as 'low' | 'medium' | 'high' | 'critical',
          matchedText: h.matchedText,
          startIndex: h.startIndex,
          endIndex: h.endIndex,
          explanation: `Custom keyword flagged: "${h.matchedText}" — ${h.keyword.category}`,
          suggestedReplacement: h.keyword.replacement,
          confidence: 'heuristic' as const,
        })))
        if (scan.overallRisk === 'low') scan.overallRisk = customHits.some(h => h.keyword.riskLevel === 'high') ? 'high' : 'medium'
      }

      const decision = runDecisionTreeA(prompt, scan)
      recordScan(scan.matches.length > 0, decision.action, domain)
      setCurrentDomain(domain)
      setMirrorDismissed(false)

      if (decision.action === 'allow') {
        setDecisionResult(decision)
        setStage('generating')
        setTimeout(() => {
          const response = generateDemoResponse(prompt, domain)
          const ct = runDecisionTreeB(response)
          setAiResponse(response)
          setCtResult(ct)
          setStage('ai_response')
        }, 1000)
      } else {
        if (decision.action === 'block' || decision.action === 'anonymize') {
          const anonResult = anonymizeText(prompt, scan.matches)
          setAnonymizationResult(anonResult)
          setEditedAnonymized(anonResult.anonymized)
          recordTrustEvent('anonymized_voluntarily', 'Anonymization suggested after block')
        }
        setDecisionResult(decision)
        setStage('privacy_review')
      }
    }, expertMode ? 200 : 600)
  }, [prompt, currentDomain, expertMode])

  // ── Use anonymized version ──────────────────────────────────────────────────
  const handleUseAnonymized = useCallback(() => {
    setStage('anonymization')
  }, [])

  // ── Submit anonymized after recheck ────────────────────────────────────────
  const handleSubmitAnonymized = useCallback(() => {
    const scan2 = scanText(editedAnonymized)
    const recheckResult = runDecisionTreeARecheck(editedAnonymized, scan2)

    if (!recheckResult.canProceed) {
      setDecisionResult(recheckResult)
      setStage('privacy_review')
      return
    }

    recordTrustEvent('anonymized_voluntarily', 'Submitted anonymized prompt')
    setDecisionResult(recheckResult)
    setStage('generating')
    setTimeout(() => {
      const response = generateDemoResponse(editedAnonymized, scan2.domain)
      const ct = runDecisionTreeB(response)
      setAiResponse(response)
      setCtResult(ct)
      setStage('ai_response')
    }, 1000)
  }, [editedAnonymized])

  // ── Agent mode ──────────────────────────────────────────────────────────────
  const handleViewAgentRecommendation = useCallback(() => {
    if (!agentRevealedRef.current) {
      agentRevealedRef.current = Date.now()
    }
    recordAgentReview(true)
    recordTrustEvent('transparency_card_viewed', 'Agent Transparency Card opened')

    // Compute decisionResult from the agent's internal prompt so privacy_review renders correctly
    if (agentAction) {
      const scan = scanText(agentAction.internalPrompt)
      const decision = runDecisionTreeA(agentAction.internalPrompt, scan)
      const anonResult = anonymizeText(agentAction.internalPrompt, scan.matches)
      setAnonymizationResult(anonResult)
      setEditedAnonymized(anonResult.anonymized)
      setDecisionResult(decision)
    }

    setStage('privacy_review')
  }, [agentAction])

  const handleAgentApprove = useCallback(() => {
    if (!agentRevealedRef.current || !agentAction) return
    const elapsed = Date.now() - agentRevealedRef.current
    const alertResult = recordApproval(elapsed, Object.values(freeTextResponses).some(v => v.length > 10))

    if (alertResult.alert) {
      recordSkillDegradationAlert()
      if (elapsed < 5000) recordQuickApproval()
      recordTrustEvent('quick_approval', 'Approved agent recommendation too quickly')
      setSkillAlert({
        triggered: true,
        reason: alertResult.reason,
        approvalTimeMs: elapsed,
        consecutiveQuickApprovals: alertResult.consecutiveQuickApprovals,
      })
      return
    }

    const response = generateDemoResponse(agentAction.internalPrompt, 'healthcare')
    const ct = runDecisionTreeB(response)
    setAiResponse(response)
    setCtResult(ct)
    setStage('ai_response')
  }, [agentAction, freeTextResponses])

  const handleSkillAlertReview = useCallback(() => {
    setSkillAlert(null)
    agentRevealedRef.current = Date.now()
  }, [])

  const handleSkillAlertConfirm = useCallback(() => {
    if (!agentAction) return
    setSkillAlert(null)
    const response = generateDemoResponse(agentAction.internalPrompt, 'healthcare')
    const ct = runDecisionTreeB(response)
    setAiResponse(response)
    setCtResult(ct)
    setStage('ai_response')
  }, [agentAction])

  // ── CT ──────────────────────────────────────────────────────────────────────
  const handleProceedToCT = useCallback(() => {
    setStage('critical_thinking')
  }, [])

  const handleActivityComplete = useCallback((activityId: string, type: CriticalThinkingActivity['type']) => {
    if (!ctResult) return
    recordCriticalThinkingActivity('checkpoint')
    recordTrustEvent('completed_critical_thinking', 'Critical thinking activity completed')
    if (type === 'verification_plan') {
      recordCriticalThinkingActivity('verification')
      recordTrustEvent('created_verification_plan', 'Verification plan created')
    }
    if (Object.values(freeTextResponses).some(v => v.length > 10)) {
      recordCriticalThinkingActivity('freetext')
      recordTrustEvent('wrote_freetext_response', 'Free-text response written')
    }

    setCtResult(prev => {
      if (!prev) return prev
      const updated = prev.activities.map(a =>
        a.activityId === activityId ? { ...a, completed: true } : a
      )
      const completedCount = updated.filter(a => a.completed).length
      return {
        ...prev,
        activities: updated,
        completedActivitiesCount: completedCount,
        canProceedToDecision: completedCount >= prev.requiredActivitiesCount,
      }
    })
  }, [ctResult, freeTextResponses])

  const handleRecordDecision = useCallback((choice: HumanDecision['choice']) => {
    const decision: HumanDecision = {
      choice,
      checkedItems: checkedDecisionItems,
      timestamp: Date.now(),
    }
    setHumanDecision(decision)
    recordCriticalThinkingActivity('decision')
    recordTrustEvent('human_decision_recorded', 'Human decision recorded')
  }, [checkedDecisionItems])

  // ── Agent startup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'agent') {
      const agent = runAgentSimulation('diabetes_agent')
      setAgentAction(agent)
    }
  }, [mode])

  const scanResult = decisionResult?.scanResult
  const completedActivities = ctResult?.activities.filter(a => a.completed).length ?? 0
  const requiredActivities = ctResult?.requiredActivitiesCount ?? 1
  const canProceedToDecision = ctResult?.canProceedToDecision ?? false

  // Mirror question based on stage and mode
  const mirrorPreQuestion = mode === 'agent'
    ? `The agent processed this data autonomously. Have you checked what it included — and what it missed?`
    : `Did you mean to share that ${getDomainLabel(currentDomain)} information?`
  const mirrorPostQuestion = `What part of this answer would you verify before trusting it?`

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#161616]">AI Workspace</h1>
              {expertMode && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-[#6929c4] text-white text-xs font-semibold">
                  <Zap className="w-3 h-3" /> Expert Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[#6f6f6f] mt-0.5">
              Responsible AI assistant — demo mode
              {trustScore !== 50 && <span className="ml-2 text-[#0f62fe]">Trust: {trustScore}/100</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode toggle */}
            <div className="flex items-center gap-0 bg-[#e0e0e0]">
              <button
                onClick={() => { setMode('manual'); resetAll() }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${mode === 'manual' ? 'bg-[#0f62fe] text-white' : 'text-[#525252] hover:bg-[#c6c6c6]'}`}
              >
                <User className="w-3.5 h-3.5" /> Manual
              </button>
              <button
                onClick={() => { setMode('agent'); resetAll() }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${mode === 'agent' ? 'bg-[#6929c4] text-white' : 'text-[#525252] hover:bg-[#c6c6c6]'}`}
              >
                <Cpu className="w-3.5 h-3.5" /> Agent
              </button>
            </div>
            <button
              onClick={() => setShowKeywordsPanel(!showKeywordsPanel)}
              className="btn-secondary text-xs gap-1.5"
            >
              <Plus className="w-3 h-3" /> Custom Keywords
            </button>
            {stage !== 'input' && (
              <button onClick={resetAll} className="btn-secondary text-xs gap-1.5">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        <StageIndicator current={stage} />
      </div>

      {/* Custom keywords panel */}
      {showKeywordsPanel && <CustomKeywordsPanel />}

      {/* Demo scenario picker */}
      {stage === 'input' && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold text-[#525252] uppercase tracking-wide">Load a demo scenario</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_SCENARIOS.map(s => (
              <button
                key={s.scenarioId}
                onClick={() => {
                    resetAll()
                    setPrompt(s.preloadedPrompt)
                    setCurrentDomain(s.domain)
                    setMode(s.mode === 'agent' ? 'agent' : 'manual')
                  }}
                className="text-xs px-3 py-1.5 border border-[#c6c6c6] hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors text-[#525252]"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STAGE: INPUT (Manual) ───────────────────────────────────────────── */}
      {mode === 'manual' && stage === 'input' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#161616]">
            <User className="w-4 h-4 text-[#0f62fe]" />
            Write your {getDomainLabel(currentDomain)} query
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Type your query here…`}
            className="w-full h-36 px-4 py-3 border border-[#8d8d8d] focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe] outline-none text-sm text-[#161616] resize-none transition-all"
          />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-[#6f6f6f]">
              ⚠️ {getDisclaimerText(currentDomain)}
            </p>
            <button
              onClick={handleCheckPrompt}
              disabled={!prompt.trim()}
              className="btn-primary"
            >
              <Shield className="w-4 h-4" />
              Check My Prompt
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE: INPUT (Agent) ────────────────────────────────────────────── */}
      {mode === 'agent' && stage === 'input' && agentAction && (
        <div className="card p-5 border-l-4 border-[#6929c4] space-y-4">
          <div className="flex items-center gap-2 text-[#6929c4] font-semibold text-sm">
            <Cpu className="w-4 h-4" />
            AI Agent Active — Clinical Decision Support
          </div>

          {/* Agent mode explanation */}
          <div className="bg-[#f6f2ff] border border-[#d4bbff] p-4 space-y-2 text-sm">
            <p className="font-semibold text-[#491d8b]">What is Agent Mode?</p>
            <p className="text-[#525252]">
              In Agent Mode, an AI agent acts <strong>autonomously</strong> — it reads available data, constructs its own prompt, and generates a recommendation <strong>without you writing anything</strong>.
            </p>
            <p className="text-[#525252]">
              This simulates real-world clinical AI tools (e.g. diagnostic support systems) where the AI acts on your behalf. The risk: you may approve something you haven't fully understood.
            </p>
            <p className="text-[#525252]">
              ThinkShield's job here is to force you to <strong>slow down</strong> — review what the agent processed, spot what it missed, and make the final call yourself.
            </p>
          </div>

          <p className="text-sm text-[#525252]">
            The <strong className="text-[#161616]">{agentAction.agentName}</strong> has automatically
            processed available patient data and generated a clinical recommendation.
            You did not write this prompt — the agent acted autonomously.
          </p>
          <button onClick={handleViewAgentRecommendation} className="btn-primary">
            <Eye className="w-4 h-4" />
            Review Agent Action
          </button>
        </div>
      )}

      {/* ── STAGE: SCANNING ─────────────────────────────────────────────────── */}
      {stage === 'scanning' && (
        <div className="card p-8 text-center space-y-3">
          <div className="w-10 h-10 bg-[#0f62fe] flex items-center justify-center mx-auto animate-pulse">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <p className="text-[#161616] font-semibold text-sm">Scanning for sensitive information…</p>
          <p className="text-xs text-[#6f6f6f]">All analysis runs locally in your browser. Nothing is transmitted.</p>
        </div>
      )}

      {/* ── STAGE: PRIVACY REVIEW ───────────────────────────────────────────── */}
      {stage === 'privacy_review' && decisionResult && (
        <div className="space-y-4">

          {/* Decision banner */}
          <div className={`card p-5 space-y-3 border-l-4 ${
            decisionResult.action === 'block' ? 'border-[#da1e28]' :
            decisionResult.action === 'escalate' ? 'border-[#f1c21b]' :
            decisionResult.action === 'anonymize' ? 'border-[#f1c21b]' :
            'border-[#24a148]'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-semibold text-[#161616] text-sm">
                {decisionResult.action === 'block' || decisionResult.action === 'escalate'
                  ? <XCircle className="w-5 h-5 text-[#da1e28]" />
                  : <AlertTriangle className="w-5 h-5 text-[#f1c21b]" />}
                Privacy Guardian — {
                  decisionResult.action === 'block' ? 'Submission Blocked' :
                  decisionResult.action === 'escalate' ? 'Escalation Required' :
                  decisionResult.action === 'anonymize' ? 'Anonymization Required' :
                  'Review Required'
                }
              </div>
              <RiskBadge level={decisionResult.riskLevel} />
            </div>
            <p className="text-sm text-[#525252]">{decisionResult.explanation.split('\n')[0]}</p>
          </div>

          {/* AI Mirror — alongside, not replacing */}
          {!mirrorDismissed && decisionResult.action !== 'allow' && (
            <AIMirror
              question={mirrorPreQuestion}
              responded={mirrorPreResponded}
              confirmLabel={mode === 'agent' ? "Yes, I've reviewed what the agent processed" : 'Yes, I meant to share this'}
              reconsiderLabel={mode === 'agent' ? 'No, I need to look more carefully' : 'No, let me reconsider'}
              onRespond={() => { setMirrorPreResponded(true); setMirrorDismissed(true) }}
              onReconsider={() => {
                setMirrorDismissed(false)
                setMirrorPreResponded(false)
                setDecisionResult(null)
                setAnonymizationResult(null)
                setEditedAnonymized('')
                setStage('input')
              }}
            />
          )}

          {/* Agent Transparency Card — FIXED: always shown in agent mode */}
          {mode === 'agent' && agentAction && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-[#161616] text-sm">
                <Cpu className="w-4 h-4 text-[#6929c4]" />
                Agent Transparency Card
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Data Processed</p>
                  {agentAction.dataProcessed.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs px-2 py-0.5 bg-[#e8daff] text-[#491d8b] font-medium shrink-0">{d.category}</span>
                      <span className="text-[#525252] text-xs">{d.description}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Identified Gaps</p>
                  {agentAction.identifiedGaps.map((g, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-[#da1e28]">
                      <AlertOctagon className="w-3 h-3 mt-0.5 shrink-0" /> {g}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-[#e0e0e0] space-y-1">
                <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Internal Prompt (sanitized)</p>
                <p className="text-xs text-[#525252] font-mono bg-[#f4f4f4] px-3 py-2">{agentAction.internalPrompt}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div className={`text-xs font-semibold px-2 py-1 ${
                  agentAction.confidenceScore >= 80 ? 'bg-[#defbe6] text-[#044317]' :
                  agentAction.confidenceScore >= 60 ? 'bg-[#f6f2c0] text-[#8e4f00]' :
                  'bg-[#fff1f1] text-[#a2191f]'
                }`}>
                  Confidence: {agentAction.confidenceScore}%
                </div>
                <span className="text-xs text-[#6f6f6f]">Model: {agentAction.modelUsed}</span>
                <span className="text-xs text-[#6f6f6f] flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> Simulated
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Guardrails Applied</p>
                {agentAction.guardrailsApplied.map((g, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-[#24a148]">
                    <CheckCircle className="w-3 h-3 shrink-0" /> {g}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected items */}
          {scanResult && scanResult.matches.length > 0 && (
            <div className="card p-5 space-y-3">
              <p className="text-sm font-semibold text-[#161616]">
                Detected sensitive information — {scanResult.matches.length} finding{scanResult.matches.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {scanResult.matches.map(m => (
                  <div key={m.id} className={`p-3 text-xs space-y-1 ${
                    m.riskLevel === 'critical' || m.riskLevel === 'high' ? 'bg-[#fff1f1] border-l-2 border-[#da1e28]' : 'bg-[#f6f2c0] border-l-2 border-[#f1c21b]'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono font-bold text-[#161616]">{m.matchedText}</code>
                      <span className={`px-1.5 py-0.5 font-semibold uppercase tracking-wide text-xs ${
                        m.riskLevel === 'critical' ? 'bg-[#da1e28] text-white' :
                        m.riskLevel === 'high' ? 'bg-[#fff1f1] text-[#a2191f]' :
                        'bg-[#f6f2c0] text-[#8e4f00]'
                      }`}>{m.category.replace(/_/g, ' ')}</span>
                      <span className="text-[#8d8d8d] italic">{m.confidence}</span>
                    </div>
                    <p className="text-[#525252]">{m.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlighted original (compact in expert mode) */}
          {mode === 'manual' && scanResult && scanResult.matches.length > 0 && !expertMode && (
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Original Prompt</p>
              <p className="text-sm leading-relaxed">
                <HighlightedPrompt text={decisionResult.inputText} matches={scanResult.matches} />
              </p>
            </div>
          )}

          {/* Required actions */}
          {decisionResult.requiredUserActions.length > 0 && (
            <div className="card-inset p-4 space-y-2">
              <p className="text-xs font-semibold text-[#525252] uppercase tracking-wide">Required actions</p>
              {decisionResult.requiredUserActions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#161616]">
                  <ChevronRight className="w-4 h-4 text-[#0f62fe] mt-0.5 shrink-0" /> {a}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {(decisionResult.action === 'block' || decisionResult.action === 'anonymize') && anonymizationResult && (
              <button onClick={handleUseAnonymized} className="btn-primary">
                <Shield className="w-4 h-4" />
                Review Anonymized Version
              </button>
            )}
            {decisionResult.action === 'escalate' && (
              <div className="w-full p-4 notification-warning text-sm text-[#8e4f00]">
                <strong>Escalation required.</strong> This content requires organizational or human review before proceeding.
                ThinkShield cannot authorize submission of potentially privileged content.
              </div>
            )}
            {decisionResult.action === 'warn' && (
              <button onClick={() => {
                setStage('generating')
                setTimeout(() => {
                  const response = generateDemoResponse(prompt, scanResult?.domain ?? 'general')
                  const ct = runDecisionTreeB(response)
                  setAiResponse(response)
                  setCtResult(ct)
                  setStage('ai_response')
                }, 800)
              }} className="btn-warning">
                <CheckCircle className="w-4 h-4" />
                I understand the risk — Continue
              </button>
            )}
            {mode === 'agent' && agentAction && decisionResult.action !== 'escalate' && (
              <button onClick={handleAgentApprove} className="btn-primary">
                <CheckCircle className="w-4 h-4" />
                Approve Agent Recommendation
              </button>
            )}
            <button onClick={resetAll} className="btn-secondary">
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>

          {/* Skill degradation alert */}
          {skillAlert?.triggered && (
            <div className="notification-warning p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#8e4f00]">
                <Clock className="w-5 h-5" />
                Skill Degradation Alert
              </div>
              <p className="text-sm text-[#8e4f00]">{skillAlert.reason}</p>
              <div className="flex gap-3">
                <button onClick={handleSkillAlertReview} className="btn-warning">
                  <Eye className="w-4 h-4" /> Review Again
                </button>
                <button onClick={handleSkillAlertConfirm} className="btn-secondary text-sm">
                  I reviewed it carefully
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STAGE: ANONYMIZATION ────────────────────────────────────────────── */}
      {stage === 'anonymization' && anonymizationResult && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-[#161616] text-sm">
              <Edit3 className="w-5 h-5 text-[#f1c21b]" />
              Review Anonymized Prompt
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Original (blocked)</p>
                <div className="p-3 bg-[#fff1f1] border border-[#da1e28] text-sm text-[#161616] leading-relaxed">
                  <HighlightedPrompt text={anonymizationResult.original} matches={decisionResult?.scanResult.matches ?? []} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Anonymized (editable)</p>
                <textarea
                  value={editedAnonymized}
                  onChange={e => setEditedAnonymized(e.target.value)}
                  className="w-full h-40 px-3 py-3 border border-[#f1c21b] focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe] outline-none text-sm text-[#161616] resize-none bg-[#f6f2c0]"
                />
              </div>
            </div>

            {/* Alternative suggestion */}
            {decisionResult?.scanResult.matches && decisionResult.scanResult.matches.length > 0 && (() => {
              const suggestion = generateAlternativeSuggestion(anonymizationResult.original, decisionResult.scanResult.matches)
              return suggestion !== anonymizationResult.original ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[#f1c21b]" /> Suggested alternative phrasing
                  </p>
                  <div className="p-3 bg-[#edf5ff] border border-[#0f62fe] text-sm text-[#161616] leading-relaxed">
                    <p className="text-xs text-[#0f62fe] font-semibold mb-1">Use this privacy-safe version instead:</p>
                    <p className="text-[#161616]">{suggestion}</p>
                    <button
                      onClick={() => {
                        // Apply suggestion and immediately submit it — no extra click required
                        setEditedAnonymized(suggestion)
                        const scan2 = scanText(suggestion)
                        const recheckResult = runDecisionTreeARecheck(suggestion, scan2)
                        recordTrustEvent('anonymized_voluntarily', 'Used alternative suggestion')
                        if (!recheckResult.canProceed) {
                          // Still has issues — surface them so user can see what's wrong
                          setDecisionResult(recheckResult)
                          setAnonymizationResult(anonymizeText(suggestion, scan2.matches))
                          setStage('privacy_review')
                          return
                        }
                        setDecisionResult(recheckResult)
                        setStage('generating')
                        setTimeout(() => {
                          const response = generateDemoResponse(suggestion, scan2.domain !== 'general' ? scan2.domain : currentDomain)
                          const ct = runDecisionTreeB(response)
                          setAiResponse(response)
                          setCtResult(ct)
                          setStage('ai_response')
                        }, expertMode ? 200 : 800)
                      }}
                      className="mt-2 text-xs px-3 py-1.5 bg-[#0f62fe] text-white font-semibold hover:bg-[#0043ce] transition-colors"
                    >
                      Use this suggestion
                    </button>
                  </div>
                </div>
              ) : null
            })()}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">What was replaced</p>
              <div className="flex flex-wrap gap-2">
                {anonymizationResult.replacements.map((r, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <code className="bg-[#fff1f1] text-[#a2191f] px-1.5 py-0.5 font-mono">{r.original.substring(0, 20)}</code>
                    <span className="text-[#6f6f6f]">→</span>
                    <code className="bg-[#defbe6] text-[#044317] px-1.5 py-0.5 font-mono">{r.placeholder}</code>
                  </div>
                ))}
              </div>
            </div>

            {anonymizationResult.reIdentificationWarnings.length > 0 && (
              <div className="notification-warning p-3 space-y-1">
                <p className="text-xs font-semibold text-[#8e4f00] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Re-identification Risk Warning
                </p>
                {anonymizationResult.reIdentificationWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-[#8e4f00]">{w}</p>
                ))}
              </div>
            )}

            <div className="notification-info p-3 text-xs text-[#002d9c]">
              <strong>Important:</strong> This triggers a fresh privacy check.
              The anonymized version is not automatically safe. Prior approval does not carry over.
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmitAnonymized} className="btn-primary">
              <Shield className="w-4 h-4" />
              Re-check & Submit Anonymized Version
            </button>
            <button onClick={resetAll} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* ── STAGE: GENERATING ───────────────────────────────────────────────── */}
      {stage === 'generating' && (
        <div className="card p-8 text-center space-y-3">
          <div className="w-10 h-10 bg-[#6929c4] flex items-center justify-center mx-auto animate-pulse">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <p className="text-[#161616] font-semibold text-sm">Demo AI generating response…</p>
          <p className="text-xs text-[#da1e28] font-medium flex items-center gap-1.5 justify-center">
            <FlaskConical className="w-3.5 h-3.5" />
            Simulated response — not a real AI service
          </p>
        </div>
      )}

      {/* ── STAGE: AI RESPONSE ──────────────────────────────────────────────── */}
      {stage === 'ai_response' && aiResponse && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#6929c4] flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#161616]">AI Response</p>
                <p className="text-xs text-[#da1e28] flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> {aiResponse.simulationNote}
                </p>
              </div>
            </div>
            <div className="text-sm text-[#161616] whitespace-pre-wrap leading-relaxed border-t border-[#e0e0e0] pt-4">
              {aiResponse.content}
            </div>
            {aiResponse.verifiableClaims.length > 0 && (
              <div className="notification-warning p-3 space-y-2">
                <p className="text-xs font-semibold text-[#8e4f00] flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> Claims that may require verification
                </p>
                {aiResponse.verifiableClaims.map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-[#8e4f00]">
                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /> {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Mirror post-response */}
          <AIMirror
            question={mirrorPostQuestion}
            responded={mirrorPostResponded}
            confirmLabel="I've identified what to verify"
            reconsiderLabel="I need to think more carefully"
            onRespond={() => setMirrorPostResponded(true)}
          />

          <button onClick={handleProceedToCT} className="btn-primary w-full justify-center py-3">
            <Brain className="w-4 h-4" />
            Before you trust this answer — Think Critically
          </button>
        </div>
      )}

      {/* ── STAGE: CRITICAL THINKING ────────────────────────────────────────── */}
      {stage === 'critical_thinking' && ctResult && aiResponse && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-[#161616]">
                <Brain className="w-5 h-5 text-[#6929c4]" />
                Before you trust this answer…
              </div>
              <div className={`text-xs font-semibold px-2 py-0.5 ${
                ctResult.isHighStakesDomain ? 'bg-[#fff1f1] text-[#a2191f]' : 'bg-[#f6f2c0] text-[#8e4f00]'
              }`}>
                {ctResult.isHighStakesDomain ? '⚠️ High-stakes domain' : 'Standard domain'}
              </div>
            </div>
            <p className="text-sm text-[#525252]">
              {ctResult.isHighStakesDomain
                ? `Complete ${requiredActivities} of ${ctResult.activities.length} activities. In high-stakes domains, AI output is not a substitute for professional judgment.`
                : `Complete ${requiredActivities} activity to proceed.`}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#6f6f6f]">
              <div className="flex-1 ibm-progress">
                <div className="ibm-progress-fill" style={{ width: `${(completedActivities / ctResult.activities.length) * 100}%` }} />
              </div>
              {completedActivities}/{ctResult.activities.length} completed
            </div>
          </div>

          {ctResult.activities.map((activity) => (
            <div key={activity.activityId} className={`card p-5 space-y-4 ${activity.completed ? 'border-[#24a148]' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[#161616] text-sm">
                  {activity.type === 'spot_claim' && <AlertTriangle className="w-4 h-4 text-[#f1c21b]" />}
                  {activity.type === 'challenge_answer' && <Brain className="w-4 h-4 text-[#6929c4]" />}
                  {activity.type === 'verification_plan' && <CheckCircle className="w-4 h-4 text-[#0f62fe]" />}
                  {activity.title}
                </div>
                {activity.completed && (
                  <span className="text-xs font-semibold text-[#24a148] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Done
                  </span>
                )}
              </div>
              <p className="text-sm text-[#525252]">{activity.description}</p>

              {!activity.completed && activity.questions.map(q => (
                <div key={q.questionId} className="space-y-3">
                  <p className="text-sm font-medium text-[#161616]">{q.text}</p>

                  {activity.type === 'spot_claim' && aiResponse.verifiableClaims.length > 0 && (
                    <div className="p-3 card-inset space-y-1">
                      <p className="text-xs font-semibold text-[#6f6f6f]">AI response claims:</p>
                      {aiResponse.verifiableClaims.map((c, i) => (
                        <div key={i} className="text-xs text-[#525252] flex items-start gap-1">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />{c}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.options && q.options.length > 0 && (
                    <div className="space-y-2">
                      {q.options.map((opt, i) => {
                        const isWeak = opt.toLowerCase().includes('immediately') || opt.toLowerCase().includes('reliable')
                        const isSelected = selectedVerification.includes(opt)
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (isWeak) return
                              setSelectedVerification(prev =>
                                prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]
                              )
                            }}
                            className={`w-full text-left text-sm px-4 py-3 border transition-all ${
                              isWeak ? 'border-[#da1e28] bg-[#fff1f1] text-[#a2191f] cursor-not-allowed opacity-60' :
                              isSelected ? 'border-[#0f62fe] bg-[#edf5ff] text-[#002d9c]' :
                              'border-[#c6c6c6] hover:border-[#0f62fe] text-[#161616]'
                            }`}
                          >
                            {opt}
                            {isWeak && <span className="ml-2 text-xs opacity-80">(Not sufficient)</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {q.requiresFreeText && (
                    <textarea
                      value={freeTextResponses[q.questionId] ?? ''}
                      onChange={e => setFreeTextResponses(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                      placeholder="Write your response here…"
                      className="w-full h-24 px-3 py-2 border border-[#8d8d8d] focus:border-[#6929c4] focus:ring-1 focus:ring-[#6929c4] outline-none text-sm resize-none"
                    />
                  )}

                  {q.hints && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowHint(prev => ({ ...prev, [q.questionId]: !prev[q.questionId] }))}
                        className="text-xs text-[#6f6f6f] hover:text-[#161616] flex items-center gap-1"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        {showHint[q.questionId] ? 'Hide hint' : 'Show hint'}
                      </button>
                      {showHint[q.questionId] && (
                        <p className="text-xs text-[#525252] italic">{q.hints[0]}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleActivityComplete(activity.activityId, activity.type)}
                    disabled={
                      (freeTextResponses[q.questionId] ?? '').trim().length < 10 &&
                      selectedVerification.filter(v => !v.toLowerCase().includes('immediately')).length === 0
                    }
                    className="btn-primary text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Submit Response
                  </button>
                </div>
              ))}
            </div>
          ))}

          {canProceedToDecision && (
            <button onClick={() => setStage('human_decision')} className="btn-primary w-full justify-center py-3">
              <ChevronRight className="w-5 h-5" />
              Proceed to Your Decision
            </button>
          )}
          {!canProceedToDecision && (
            <p className="text-center text-xs text-[#6f6f6f]">
              Complete {requiredActivities - completedActivities} more {requiredActivities - completedActivities === 1 ? 'activity' : 'activities'} to proceed.
            </p>
          )}
        </div>
      )}

      {/* ── STAGE: HUMAN DECISION ───────────────────────────────────────────── */}
      {stage === 'human_decision' && !humanDecision && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 font-bold text-[#161616]">
            <User className="w-5 h-5 text-[#0f62fe]" />
            Your Decision — You Remain Responsible
          </div>
          <p className="text-sm text-[#525252]">
            ThinkShield does not guarantee the AI response is correct. The final decision is yours.
          </p>
          <div className="space-y-2">
            {[
              'I have reviewed the privacy risks identified by ThinkShield.',
              'I understand which claims in the AI response are unverified.',
              'I have identified a method to verify the key information.',
              'I acknowledge this is a simulated response, not certified advice.',
              'I am making this decision based on my own judgment.',
            ].map(item => (
              <label key={item} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedDecisionItems.includes(item)}
                  onChange={e => setCheckedDecisionItems(prev =>
                    e.target.checked ? [...prev, item] : prev.filter(i => i !== item)
                  )}
                  className="mt-0.5 accent-[#0f62fe]"
                />
                <span className="text-sm text-[#161616]">{item}</span>
              </label>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleRecordDecision('accept_with_review')}
              disabled={checkedDecisionItems.length < 1}
              className="btn-primary justify-center"
            >
              <CheckCircle className="w-4 h-4" />
              Accept With Review
            </button>
            <button onClick={() => handleRecordDecision('mark_for_verification')} className="btn-secondary justify-center">
              <FileText className="w-4 h-4" />
              Mark for Verification
            </button>
            <button onClick={() => handleRecordDecision('revise_prompt')} className="btn-secondary justify-center">
              <Edit3 className="w-4 h-4" />
              Revise Prompt
            </button>
            <button onClick={() => setStage('critical_thinking')} className="btn-secondary justify-center">
              <Brain className="w-4 h-4" />
              Challenge Again
            </button>
          </div>
          <p className="text-xs text-[#6f6f6f]">
            ⚠️ Completing this workflow does not mean the AI response is correct or verified.
          </p>
        </div>
      )}

      {/* ── DECISION RECORDED ───────────────────────────────────────────────── */}
      {stage === 'human_decision' && humanDecision && (
        <div className="card p-6 space-y-4 border-l-4 border-[#24a148]">
          <div className="flex items-center gap-2 font-bold text-[#24a148]">
            <CheckCircle className="w-5 h-5" />
            Decision Recorded
          </div>
          <p className="text-sm text-[#525252]">
            You chose: <strong className="text-[#161616]">{humanDecision.choice.replace(/_/g, ' ')}</strong>.
            {humanDecision.checkedItems.length} review items acknowledged.
          </p>
          <div className="notification-success p-3 text-xs text-[#044317]">
            <strong>Reminder:</strong> AI responses may contain errors. Your professional judgment and
            independent verification remain essential.
          </div>
          <button onClick={resetAll} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Start New Query
          </button>
        </div>
      )}
    </div>
  )
}
