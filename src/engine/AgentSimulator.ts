import type { AgentAction } from '../types'

let agentCounter = 0

// ─── Simulated Agent Actions ──────────────────────────────────────────────────

export const AGENT_SCENARIOS: Record<string, Omit<AgentAction, 'actionId' | 'timestamp'>> = {
  diabetes_agent: {
    agentName: 'Clinical Decision Support Agent v2.1',
    dataProcessed: [
      { category: 'Diagnosis', description: 'Type 2 diabetes mellitus (E11)' },
      { category: 'Current medication', description: 'Metformin 500mg BD' },
      { category: 'Lab value', description: 'HbA1c 8.2% (most recent)' },
      { category: 'Previous lab value', description: 'HbA1c 7.9% (6 months prior)' },
    ],
    internalPrompt: 'Given a patient with Type 2 diabetes on metformin 500mg BD and HbA1c 8.2%, provide general medication adjustment considerations based on current ADA guidelines.',
    confidenceScore: 72,
    modelUsed: 'Demo Clinical LLM (simulated)',
    sourcesReferenced: [
      {
        name: 'ADA Standards of Medical Care in Diabetes 2024',
        note: '⚠️ Simulated reference — verify against official ADA publication',
      },
      {
        name: 'NICE Guideline NG28: Type 2 Diabetes in Adults',
        note: '⚠️ Simulated reference — verify against official NICE publication',
      },
    ],
    identifiedGaps: [
      'Renal function (eGFR, creatinine) — not available in processed data',
      'Gastrointestinal tolerance history — not recorded',
      'Patient age and cardiovascular risk factors — not included',
      'Patient preferences and lifestyle context — not assessed',
      'Full medication list (potential interactions) — incomplete',
    ],
    guardrailsApplied: [
      'Patient identifiers removed before processing',
      'Response limited to general educational considerations',
      'Clinical decision disclaimer appended',
      'No patient-specific diagnosis or prescription generated',
    ],
    recommendation: `Based on available data, general considerations for optimising glycaemic control in a patient with Type 2 diabetes on metformin 500mg BD with HbA1c 8.2% include: dose optimisation (if renal function permits), assessment of adherence and lifestyle factors, and evaluation of whether additional pharmacotherapy may be indicated per current guidelines.

⚠️ IMPORTANT: This recommendation is educational only. Clinical decisions must be made by the treating physician with full patient context. Renal function assessment is essential before any dose change.`,
  },
}

// ─── Simulate Agent Run ───────────────────────────────────────────────────────

export function runAgentSimulation(scenarioKey: string = 'diabetes_agent'): AgentAction {
  const base = AGENT_SCENARIOS[scenarioKey] ?? AGENT_SCENARIOS.diabetes_agent
  return {
    ...base,
    actionId: `AGT-${String(++agentCounter).padStart(4, '0')}`,
    timestamp: Date.now(),
  }
}

// ─── Skill Degradation Monitor ────────────────────────────────────────────────

export interface ApprovalRecord {
  timestamp: number
  timeToApprovalMs: number
  hadFreeTextResponse: boolean
}

const QUICK_APPROVAL_THRESHOLD_MS = 5000
const CONSECUTIVE_QUICK_THRESHOLD = 3

const approvalHistory: ApprovalRecord[] = []

export function recordApproval(
  timeToApprovalMs: number,
  hadFreeTextResponse: boolean,
): { alert: boolean; reason: string; consecutiveQuickApprovals: number } {
  const record: ApprovalRecord = {
    timestamp: Date.now(),
    timeToApprovalMs,
    hadFreeTextResponse,
  }
  approvalHistory.push(record)

  const recent = approvalHistory.slice(-5)
  const consecutiveQuick = recent.reduce((count, r) => {
    return r.timeToApprovalMs < QUICK_APPROVAL_THRESHOLD_MS ? count + 1 : 0
  }, 0)

  if (timeToApprovalMs < QUICK_APPROVAL_THRESHOLD_MS) {
    return {
      alert: true,
      reason: `You approved this recommendation in under ${Math.round(timeToApprovalMs / 1000)} seconds. Did you have a chance to review it? Taking a moment to apply your clinical expertise helps catch what AI might miss.`,
      consecutiveQuickApprovals: consecutiveQuick,
    }
  }

  if (consecutiveQuick >= CONSECUTIVE_QUICK_THRESHOLD) {
    return {
      alert: true,
      reason: `You have approved ${consecutiveQuick} recommendations quickly in a row without written responses. Consistent rapid approval can indicate passive reliance on AI output.`,
      consecutiveQuickApprovals: consecutiveQuick,
    }
  }

  return { alert: false, reason: '', consecutiveQuickApprovals: consecutiveQuick }
}

export function getApprovalHistory(): ApprovalRecord[] {
  return [...approvalHistory]
}

export function resetApprovalHistory(): void {
  approvalHistory.length = 0
}
