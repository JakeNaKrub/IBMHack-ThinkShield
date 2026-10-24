import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard, Shield, Brain, AlertTriangle, CheckCircle, Clock,
  TrendingUp, Users, FileText, RefreshCw, Info
} from 'lucide-react'
import { getMetrics, resetMetrics } from '../engine/SessionMetrics'
import type { SessionMetrics } from '../types'

function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  tooltip,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  tooltip?: string
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        {tooltip && (
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-slate-300 cursor-help" />
            <div className="absolute right-0 top-5 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 hidden group-hover:block z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-6 text-right">{value}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<SessionMetrics>(getMetrics() as SessionMetrics)

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getMetrics() as SessionMetrics)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleReset = () => {
    resetMetrics()
    setMetrics(getMetrics() as SessionMetrics)
  }

  const totalDomainActivations = Object.values(metrics.domainPolicyActivations).reduce((a, b) => a + b, 0)
  const engagementScore = metrics.humanDecisionsRecorded + metrics.freeTextResponsesWritten + metrics.verificationPlansCreated

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Responsible AI Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Session statistics — in-memory only, no raw text stored</p>
        </div>
        <button onClick={handleReset} className="btn-secondary text-sm gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Session
        </button>
      </div>

      {/* Privacy section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Shield className="w-4 h-4 text-blue-600" />
          Privacy Guardian
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            label="Prompts Scanned"
            value={metrics.promptsScanned}
            icon={<Shield className="w-4 h-4" />}
            color="blue"
            tooltip="Total number of prompts submitted to the privacy scanner."
          />
          <StatCard
            label="Sensitive Detections"
            value={metrics.sensitiveDetectionEvents}
            icon={<AlertTriangle className="w-4 h-4" />}
            color="amber"
            tooltip="Number of scans that returned at least one sensitive data finding."
          />
          <StatCard
            label="Hard Blocks"
            value={metrics.hardBlocksTriggered}
            icon={<AlertTriangle className="w-4 h-4" />}
            color="red"
            tooltip="Number of prompts blocked by a mandatory policy rule. These cannot be overridden by user consent."
          />
          <StatCard
            label="Prompts Anonymized"
            value={metrics.promptsAnonymized}
            icon={<FileText className="w-4 h-4" />}
            color="blue"
            tooltip="Number of prompts that were anonymized and re-evaluated before submission."
          />
          <StatCard
            label="Prompts Allowed"
            value={metrics.promptsAllowed}
            icon={<CheckCircle className="w-4 h-4" />}
            color="green"
            tooltip="Prompts that passed all privacy checks."
          />
          <StatCard
            label="Escalation Requests"
            value={metrics.escalationRequests}
            icon={<TrendingUp className="w-4 h-4" />}
            color="amber"
            tooltip="Prompts escalated for human or organizational review."
          />
          <StatCard
            label="Decision Trees Run"
            value={metrics.decisionTreePathsExecuted}
            icon={<FileText className="w-4 h-4" />}
            color="blue"
            tooltip="Total number of decision tree executions (each scan triggers one)."
          />
          <StatCard
            label="Prompts Warned"
            value={metrics.promptsWarned}
            icon={<AlertTriangle className="w-4 h-4" />}
            color="amber"
            tooltip="Prompts where a warning was shown but the user could acknowledge and continue."
          />
        </div>
      </section>

      {/* Domain activations */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Users className="w-4 h-4 text-blue-600" />
          Domain Policy Activations
        </div>
        <p className="text-xs text-slate-400">How many times each domain policy was applied this session.</p>
        <div className="space-y-3">
          {(Object.entries(metrics.domainPolicyActivations) as [string, number][]).map(([domain, count]) => (
            <div key={domain} className="flex items-center gap-3">
              <span className={`text-xs font-semibold w-20 ${
                domain === 'healthcare' ? 'text-blue-600' :
                domain === 'banking' ? 'text-green-600' :
                domain === 'legal' ? 'text-purple-600' : 'text-slate-500'
              }`}>{domain}</span>
              <MiniBar value={count} max={Math.max(totalDomainActivations, 1)} color={
                domain === 'healthcare' ? 'bg-blue-500' :
                domain === 'banking' ? 'bg-green-500' :
                domain === 'legal' ? 'bg-purple-500' : 'bg-slate-400'
              } />
            </div>
          ))}
        </div>
      </section>

      {/* Agent oversight */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Clock className="w-4 h-4 text-purple-600" />
          Agent Oversight & Skill Degradation
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Agent Actions Reviewed"
            value={metrics.agentActionsReviewed}
            icon={<CheckCircle className="w-4 h-4" />}
            color="purple"
            tooltip="Number of autonomous AI agent actions that were reviewed by the human."
          />
          <StatCard
            label="Transparency Cards Viewed"
            value={metrics.transparencyCardsViewed}
            icon={<FileText className="w-4 h-4" />}
            color="purple"
            tooltip="Number of times the Agent Transparency Card was opened."
          />
          <StatCard
            label="Skill Degradation Alerts"
            value={metrics.skillDegradationAlerts}
            icon={<Clock className="w-4 h-4" />}
            color="amber"
            tooltip="Number of times an alert was triggered because a recommendation was approved too quickly."
          />
          <StatCard
            label="Quick Approvals"
            value={metrics.quickApprovals}
            icon={<Clock className="w-4 h-4" />}
            color="red"
            tooltip="Approvals made in under 5 seconds. High numbers may indicate passive AI acceptance."
          />
        </div>
      </section>

      {/* Critical thinking */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Brain className="w-4 h-4 text-purple-600" />
          Critical Thinking Coach
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Checkpoints Completed"
            value={metrics.clinicalCheckpointsCompleted}
            icon={<CheckCircle className="w-4 h-4" />}
            color="purple"
            tooltip="Number of critical thinking activities completed."
          />
          <StatCard
            label="Free-Text Responses"
            value={metrics.freeTextResponsesWritten}
            icon={<FileText className="w-4 h-4" />}
            color="purple"
            tooltip="Number of times the user wrote an independent free-text response (minimum 10 characters). This measures active engagement, not cognitive ability."
          />
          <StatCard
            label="Verification Plans"
            value={metrics.verificationPlansCreated}
            icon={<TrendingUp className="w-4 h-4" />}
            color="green"
            tooltip="Number of verification strategies selected or created by the user."
          />
          <StatCard
            label="Human Decisions Recorded"
            value={metrics.humanDecisionsRecorded}
            icon={<Users className="w-4 h-4" />}
            color="green"
            tooltip="Number of final human decision steps completed."
          />
        </div>
      </section>

      {/* Engagement indicator */}
      <section className="card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-800">Responsible AI Engagement</span>
        </div>
        <p className="text-xs text-slate-400">
          This indicator counts meaningful review actions (human decisions + free-text responses + verification plans).
          It measures observable behavior, not cognitive ability or intelligence.
        </p>
        <div className="flex items-end gap-4">
          <div className="text-5xl font-black text-blue-600">{engagementScore}</div>
          <div className="text-sm text-slate-500 pb-1">meaningful review actions this session</div>
        </div>
        <div className="bg-slate-100 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(100, engagementScore * 10)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 italic">
          ⚠️ This is a session count only. It does not measure learning outcomes, cognitive health, or professional competence.
        </p>
      </section>

      <div className="text-xs text-slate-400 text-center">
        All metrics are stored in browser memory only and are cleared when you reset or close the session.
        No raw prompts, patient data, or sensitive text is included in these statistics.
      </div>
    </div>
  )
}
