import type { SessionMetrics, Domain, DecisionAction } from '../types'

// ─── Session Metrics Store (in-memory, no raw text) ──────────────────────────

function createEmptyMetrics(): SessionMetrics {
  return {
    promptsScanned: 0,
    sensitiveDetectionEvents: 0,
    hardBlocksTriggered: 0,
    promptsAnonymized: 0,
    promptsAllowed: 0,
    promptsWarned: 0,
    escalationRequests: 0,
    agentActionsReviewed: 0,
    transparencyCardsViewed: 0,
    skillDegradationAlerts: 0,
    quickApprovals: 0,
    clinicalCheckpointsCompleted: 0,
    freeTextResponsesWritten: 0,
    verificationPlansCreated: 0,
    humanDecisionsRecorded: 0,
    domainPolicyActivations: { healthcare: 0, banking: 0, legal: 0, general: 0 },
    decisionTreePathsExecuted: 0,
  }
}

let metrics: SessionMetrics = createEmptyMetrics()

export function getMetrics(): Readonly<SessionMetrics> {
  return { ...metrics, domainPolicyActivations: { ...metrics.domainPolicyActivations } }
}

export function recordScan(hasFindings: boolean, action: DecisionAction, domain: Domain): void {
  metrics.promptsScanned++
  metrics.decisionTreePathsExecuted++
  if (hasFindings) metrics.sensitiveDetectionEvents++
  if (action === 'block') metrics.hardBlocksTriggered++
  if (action === 'anonymize') metrics.promptsAnonymized++
  if (action === 'allow') metrics.promptsAllowed++
  if (action === 'warn') metrics.promptsWarned++
  if (action === 'escalate') metrics.escalationRequests++
  metrics.domainPolicyActivations[domain]++
}

export function recordAgentReview(viewedTransparencyCard: boolean): void {
  metrics.agentActionsReviewed++
  if (viewedTransparencyCard) metrics.transparencyCardsViewed++
}

export function recordSkillDegradationAlert(): void {
  metrics.skillDegradationAlerts++
}

export function recordQuickApproval(): void {
  metrics.quickApprovals++
}

export function recordCriticalThinkingActivity(
  type: 'checkpoint' | 'freetext' | 'verification' | 'decision',
): void {
  if (type === 'checkpoint') metrics.clinicalCheckpointsCompleted++
  if (type === 'freetext') metrics.freeTextResponsesWritten++
  if (type === 'verification') metrics.verificationPlansCreated++
  if (type === 'decision') metrics.humanDecisionsRecorded++
}

export function resetMetrics(): void {
  metrics = createEmptyMetrics()
}
