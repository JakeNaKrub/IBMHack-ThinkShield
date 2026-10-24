import type {
  DecisionResult,
  DecisionNode,
  ScanResult,
  DecisionAction,
  RiskLevel,
} from '../types'
import { evaluatePolicies } from './PolicyEngine'

let decisionCounter = 0

function makeDecisionId(): string {
  return `DEC-${String(++decisionCounter).padStart(4, '0')}`
}

function makeNode(
  nodeId: string,
  question: string,
  explanation: string,
  branch: DecisionNode['branch'],
  outcome: DecisionAction | null,
  color: DecisionNode['color'],
  ruleId?: string,
): DecisionNode {
  return { nodeId, question, explanation, branch, outcome, color, ruleId }
}

// ─── Decision Tree A — Input Safety ──────────────────────────────────────────

export function runDecisionTreeA(
  inputText: string,
  scanResult: ScanResult,
): DecisionResult {
  const path: DecisionNode[] = []

  // ── Node 1: Any sensitive data? ──────────────────────────────────────────
  const hasSensitive = scanResult.matches.length > 0

  path.push(makeNode(
    'N1',
    'Does the prompt contain sensitive information?',
    hasSensitive
      ? `Yes — ${scanResult.matches.length} potential finding(s) detected.`
      : 'No sensitive information was detected by the automated scanner. Note: automated detection is not a guarantee of safety.',
    'taken',
    null,
    hasSensitive ? 'amber' : 'green',
  ))

  if (!hasSensitive) {
    // Fast path — allow
    path.push(makeNode(
      'N1-ALLOW',
      'No sensitive data detected → ALLOW',
      'The prompt passed all automated checks. Automated scanning cannot guarantee safety — use your judgment.',
      'taken',
      'allow',
      'green',
    ))

    return buildResult(inputText, scanResult, [], path, 'allow', 'low',
      'No sensitive information was detected. The prompt may proceed. Note: automated detection is not a guarantee.',
      ['Review the note that automated detection is not 100% accurate.'],
      true, false, inputText, false)
  }

  // ── Node 2: Classify categories ──────────────────────────────────────────
  const categories = [...new Set(scanResult.matches.map(m => m.category))]

  path.push(makeNode(
    'N2',
    'What type of sensitive information is present?',
    `Detected categories: ${categories.join(', ')}`,
    'taken',
    null,
    'amber',
  ))

  // ── Node 3: Apply policies ────────────────────────────────────────────────
  path.push(makeNode(
    'N3',
    `Which policy applies? (Domain: ${scanResult.domain})`,
    `Domain classified as "${scanResult.domain}". Applying domain-specific policy.`,
    'taken',
    null,
    'amber',
  ))

  const policyResult = evaluatePolicies(categories, scanResult.domain, scanResult.hasHardBlockTriggers)

  path.push(makeNode(
    'N3-POLICY',
    `Policy matched: ${policyResult.matchedRules.map(r => r.ruleId).join(', ') || 'baseline'}`,
    policyResult.explanations.slice(0, 2).join(' | '),
    'taken',
    null,
    policyResult.finalAction === 'block' ? 'red' : policyResult.finalAction === 'warn' ? 'amber' : 'green',
    policyResult.matchedRules[0]?.ruleId,
  ))

  // ── Node 4: Final action ──────────────────────────────────────────────────
  const actionColors: Record<DecisionAction, DecisionNode['color']> = {
    allow: 'green',
    warn: 'amber',
    anonymize: 'amber',
    block: 'red',
    escalate: 'red',
  }

  const actionLabels: Record<DecisionAction, string> = {
    allow: 'ALLOW — prompt may proceed',
    warn: 'WARN — user review required',
    anonymize: 'ANONYMIZE — rewrite required',
    block: 'BLOCK — raw prompt cannot be submitted',
    escalate: 'ESCALATE — human/organizational review required',
  }

  path.push(makeNode(
    'N4-ACTION',
    `DECISION: ${actionLabels[policyResult.finalAction]}`,
    policyResult.explanations.join(' '),
    'taken',
    policyResult.finalAction,
    actionColors[policyResult.finalAction],
    policyResult.matchedRules[0]?.ruleId,
  ))

  const canProceed = policyResult.finalAction === 'allow' || policyResult.finalAction === 'warn'
  const requiresReview = policyResult.finalAction !== 'allow'

  const requiredUserActions: string[] = []
  if (policyResult.finalAction === 'block') {
    requiredUserActions.push('Remove or replace all blocked content before resubmitting.')
    requiredUserActions.push('Run a fresh privacy check after editing.')
  } else if (policyResult.finalAction === 'anonymize') {
    requiredUserActions.push('Review the suggested anonymization.')
    requiredUserActions.push('Approve or edit the anonymized version.')
    requiredUserActions.push('A fresh check will run on the revised prompt.')
  } else if (policyResult.finalAction === 'warn') {
    requiredUserActions.push('Review the identified concerns before proceeding.')
    if (policyResult.canBeAcknowledged) {
      requiredUserActions.push('Acknowledge the risk if you choose to continue.')
    }
  } else if (policyResult.finalAction === 'escalate') {
    requiredUserActions.push('This content requires organizational or human review.')
    requiredUserActions.push('Do not proceed without appropriate authorization.')
  }

  return buildResult(
    inputText,
    scanResult,
    policyResult.matchedRules.map(r => r.ruleId),
    path,
    policyResult.finalAction,
    policyResult.finalRiskLevel,
    policyResult.explanations.join('\n'),
    requiredUserActions,
    canProceed,
    requiresReview,
    null,
    false,
  )
}

// ─── Decision Tree A — Re-evaluation after anonymization ─────────────────────

export function runDecisionTreeARecheck(
  anonymizedText: string,
  scanResult: ScanResult,
): DecisionResult {
  // Recheck always runs fresh — prior approval is not inherited
  const result = runDecisionTreeA(anonymizedText, scanResult)

  // Prepend a recheck node at the front
  const recheckNode = makeNode(
    'N0-RECHECK',
    'Re-evaluating anonymized prompt (prior approval does not carry over)',
    'Anonymization was applied. A fresh decision tree evaluation is required. Anonymized prompts are not automatically considered safe.',
    'taken',
    null,
    'blue',
  )

  return {
    ...result,
    decisionId: makeDecisionId(),
    decisionPath: [recheckNode, ...result.decisionPath],
    isAnonymized: true,
    approvedText: result.canProceed ? anonymizedText : null,
  }
}

// ─── Build result helper ──────────────────────────────────────────────────────

function buildResult(
  inputText: string,
  scanResult: ScanResult,
  matchedRuleIds: string[],
  path: DecisionNode[],
  action: DecisionAction,
  riskLevel: RiskLevel,
  explanation: string,
  requiredUserActions: string[],
  canProceed: boolean,
  requiresReview: boolean,
  approvedText: string | null,
  isAnonymized: boolean,
): DecisionResult {
  return {
    decisionId: makeDecisionId(),
    inputText,
    scanResult,
    applicablePolicies: [],
    matchedRuleIds,
    riskLevel,
    action,
    explanation,
    requiredUserActions,
    decisionPath: path,
    canProceed,
    requiresReview,
    approvedText,
    isAnonymized,
    timestamp: Date.now(),
  }
}
