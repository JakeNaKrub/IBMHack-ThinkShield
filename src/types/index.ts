// ─── Risk Levels ──────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ─── Decision Actions ─────────────────────────────────────────────────────────

export type DecisionAction = 'allow' | 'warn' | 'anonymize' | 'block' | 'escalate'

// ─── Sensitive Data Categories ────────────────────────────────────────────────

export type SensitiveCategory =
  | 'patient_name'
  | 'date_of_birth'
  | 'patient_id'
  | 'diagnosis'
  | 'medication'
  | 'lab_value'
  | 'email'
  | 'phone'
  | 'iban'
  | 'payment_card'
  | 'password_or_token'
  | 'confidential_phrase'
  | 'financial_info'
  | 'account_number'
  | 'legal_confidential'
  | 'personal_identifier'

// ─── Domain ───────────────────────────────────────────────────────────────────

export type Domain = 'healthcare' | 'banking' | 'legal' | 'general'

// ─── Detection Result ─────────────────────────────────────────────────────────

export interface DetectionMatch {
  id: string
  category: SensitiveCategory
  riskLevel: RiskLevel
  matchedText: string
  startIndex: number
  endIndex: number
  explanation: string
  suggestedReplacement: string
  confidence: 'deterministic' | 'heuristic'
}

export interface ScanResult {
  matches: DetectionMatch[]
  overallRisk: RiskLevel
  domain: Domain
  hasHardBlockTriggers: boolean
  scanTimestamp: number
}

// ─── Policy ───────────────────────────────────────────────────────────────────

export interface PolicyRule {
  ruleId: string
  description: string
  categories: SensitiveCategory[]
  riskLevel: RiskLevel
  action: DecisionAction
  canBeAcknowledged: boolean
  userExplanation: string
  regulatoryNote?: string
}

export interface Policy {
  policyId: string
  version: string
  domain: Domain
  displayName: string
  description: string
  rules: PolicyRule[]
  defaultAction: DecisionAction
}

// ─── Decision Tree ────────────────────────────────────────────────────────────

export interface DecisionNode {
  nodeId: string
  question: string
  outcome: DecisionAction | null
  ruleId?: string
  explanation: string
  branch: 'taken' | 'not-taken' | 'pending'
  color: 'green' | 'amber' | 'red' | 'blue' | 'grey'
  children?: DecisionNode[]
}

export interface DecisionResult {
  decisionId: string
  inputText: string
  scanResult: ScanResult
  applicablePolicies: Policy[]
  matchedRuleIds: string[]
  riskLevel: RiskLevel
  action: DecisionAction
  explanation: string
  requiredUserActions: string[]
  decisionPath: DecisionNode[]
  canProceed: boolean
  requiresReview: boolean
  approvedText: string | null
  isAnonymized: boolean
  timestamp: number
}

// ─── Anonymization ────────────────────────────────────────────────────────────

export interface AnonymizationResult {
  original: string
  anonymized: string
  replacements: Array<{
    original: string
    placeholder: string
    category: SensitiveCategory
  }>
  reIdentificationWarnings: string[]
}

// ─── Agent Mode ───────────────────────────────────────────────────────────────

export interface AgentAction {
  actionId: string
  agentName: string
  dataProcessed: Array<{ category: string; description: string }>
  internalPrompt: string
  confidenceScore: number
  modelUsed: string
  sourcesReferenced: Array<{ name: string; note: string }>
  identifiedGaps: string[]
  guardrailsApplied: string[]
  recommendation: string
  timestamp: number
}

// ─── Critical Thinking ────────────────────────────────────────────────────────

export type CriticalThinkingActivityType =
  | 'spot_claim'
  | 'challenge_answer'
  | 'verification_plan'

export interface CriticalThinkingQuestion {
  questionId: string
  text: string
  activityType: CriticalThinkingActivityType
  isHighStakes: boolean
  hints?: string[]
  options?: string[]
  requiresFreeText: boolean
}

export interface CriticalThinkingActivity {
  activityId: string
  type: CriticalThinkingActivityType
  title: string
  description: string
  questions: CriticalThinkingQuestion[]
  completed: boolean
  userResponses: Record<string, string>
}

export interface CriticalThinkingDecisionResult {
  isHighStakesDomain: boolean
  hasVerifiableClaims: boolean
  claimsToChallenge: string[]
  activities: CriticalThinkingActivity[]
  decisionPath: DecisionNode[]
  requiredActivitiesCount: number
  completedActivitiesCount: number
  canProceedToDecision: boolean
}

// ─── Human Decision ───────────────────────────────────────────────────────────

export type HumanDecisionChoice =
  | 'accept_with_review'
  | 'revise_prompt'
  | 'challenge_again'
  | 'mark_for_verification'

export interface HumanDecision {
  choice: HumanDecisionChoice
  checkedItems: string[]
  timestamp: number
  verificationPlan?: string
  notes?: string
}

// ─── Skill Degradation ────────────────────────────────────────────────────────

export interface SkillDegradationAlert {
  triggered: boolean
  reason: string
  approvalTimeMs?: number
  consecutiveQuickApprovals: number
}

// ─── Session Metrics ──────────────────────────────────────────────────────────

export interface SessionMetrics {
  promptsScanned: number
  sensitiveDetectionEvents: number
  hardBlocksTriggered: number
  promptsAnonymized: number
  promptsAllowed: number
  promptsWarned: number
  escalationRequests: number
  agentActionsReviewed: number
  transparencyCardsViewed: number
  skillDegradationAlerts: number
  quickApprovals: number
  clinicalCheckpointsCompleted: number
  freeTextResponsesWritten: number
  verificationPlansCreated: number
  humanDecisionsRecorded: number
  domainPolicyActivations: Record<Domain, number>
  decisionTreePathsExecuted: number
}

// ─── Demo Scenario ────────────────────────────────────────────────────────────

export interface DemoScenario {
  scenarioId: string
  title: string
  description: string
  domain: Domain
  mode: 'manual' | 'agent' | 'both'
  preloadedPrompt: string
  expectedAction: DecisionAction
  tags: string[]
}

// ─── AI Response ──────────────────────────────────────────────────────────────

export interface AIResponse {
  responseId: string
  promptUsed: string
  content: string
  isSimulated: true
  simulationNote: string
  verifiableClaims: string[]
  domain: Domain
  timestamp: number
}

// ─── Workspace State ──────────────────────────────────────────────────────────

export type WorkspaceStage =
  | 'input'
  | 'scanning'
  | 'privacy_review'
  | 'anonymization'
  | 'generating'
  | 'ai_response'
  | 'critical_thinking'
  | 'human_decision'

export interface WorkspaceState {
  stage: WorkspaceStage
  mode: 'manual' | 'agent'
  prompt: string
  decisionResult: DecisionResult | null
  anonymizationResult: AnonymizationResult | null
  approvedPrompt: string | null
  aiResponse: AIResponse | null
  agentAction: AgentAction | null
  criticalThinkingResult: CriticalThinkingDecisionResult | null
  humanDecision: HumanDecision | null
  skillDegradationAlert: SkillDegradationAlert | null
}
