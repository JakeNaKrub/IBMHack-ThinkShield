import type { Policy, PolicyRule, Domain, SensitiveCategory, DecisionAction, RiskLevel } from '../types'

// ─── Healthcare Policy ────────────────────────────────────────────────────────

const healthcareRules: PolicyRule[] = [
  {
    ruleId: 'HC-001',
    description: 'Block prompts containing patient identifiers',
    categories: ['patient_id'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Patient identifiers directly link data to an individual. Sharing them with any external AI service is prohibited under healthcare data protection standards.',
    regulatoryNote: 'Contextual reference: GDPR Art. 9 (special categories of data), HIPAA Safe Harbor provisions. This prototype does not claim regulatory compliance.',
  },
  {
    ruleId: 'HC-002',
    description: 'Block prompts containing patient names in clinical context',
    categories: ['patient_name'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Patient names in a clinical context directly identify individuals. They must be removed or replaced before any AI processing.',
    regulatoryNote: 'Contextual reference: GDPR Art. 4 (personal data definition). This prototype does not claim regulatory compliance.',
  },
  {
    ruleId: 'HC-003',
    description: 'Block prompts containing dates of birth',
    categories: ['date_of_birth'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Dates of birth are personally identifiable information. Combined with a diagnosis, they can identify a patient even without a name.',
  },
  {
    ruleId: 'HC-004',
    description: 'Block prompts containing medical diagnoses linked to identifiable patients',
    categories: ['diagnosis'],
    riskLevel: 'high',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Medical diagnoses are sensitive health information. When linked to an identifiable patient, they must not be shared with external AI services.',
  },
  {
    ruleId: 'HC-005',
    description: 'Warn and require review for medication information',
    categories: ['medication'],
    riskLevel: 'high',
    action: 'anonymize',
    canBeAcknowledged: false,
    userExplanation: 'Prescription and medication information is sensitive health data. Please anonymize before proceeding.',
  },
  {
    ruleId: 'HC-006',
    description: 'Warn for lab values — re-identification risk',
    categories: ['lab_value'],
    riskLevel: 'medium',
    action: 'warn',
    canBeAcknowledged: true,
    userExplanation: 'Clinical measurements (lab values) can contribute to patient re-identification when combined with other data. Consider whether they are necessary.',
  },
  {
    ruleId: 'HC-007',
    description: 'Block credentials in any domain',
    categories: ['password_or_token'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Credentials, passwords, or API tokens must never be shared with any AI service.',
  },
  {
    ruleId: 'HC-008',
    description: 'Warn about re-identification risk from combinations',
    categories: ['lab_value', 'diagnosis', 'medication'],
    riskLevel: 'high',
    action: 'warn',
    canBeAcknowledged: false,
    userExplanation: 'Warning: Even after removing a patient name or ID, combinations of age, rare diagnoses, lab values, and dates may still identify an individual. Anonymization alone may not be sufficient.',
  },
]

export const HEALTHCARE_POLICY: Policy = {
  policyId: 'POL-HC-001',
  version: '1.0.0',
  domain: 'healthcare',
  displayName: 'Healthcare Data Protection Policy',
  description: 'Strict protections for patient data in clinical environments. All patient identifiers, diagnoses, and health measurements require anonymization or removal before AI processing.',
  rules: healthcareRules,
  defaultAction: 'warn',
}

// ─── Banking Policy ───────────────────────────────────────────────────────────

const bankingRules: PolicyRule[] = [
  {
    ruleId: 'BK-001',
    description: 'Block account numbers',
    categories: ['account_number'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Bank account numbers are confidential financial identifiers. They must not be shared with external AI services.',
  },
  {
    ruleId: 'BK-002',
    description: 'Block IBAN identifiers',
    categories: ['iban'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'IBANs are sensitive financial identifiers subject to banking secrecy regulations.',
  },
  {
    ruleId: 'BK-003',
    description: 'Block payment card numbers',
    categories: ['payment_card'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Payment card numbers are highly sensitive and must never be shared with AI services.',
  },
  {
    ruleId: 'BK-004',
    description: 'Anonymize customer names with financial data',
    categories: ['personal_identifier', 'financial_info'],
    riskLevel: 'high',
    action: 'anonymize',
    canBeAcknowledged: false,
    userExplanation: 'Customer names combined with financial information are confidential. Please anonymize before proceeding.',
  },
  {
    ruleId: 'BK-005',
    description: 'Block credentials',
    categories: ['password_or_token'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Credentials must never be shared with any AI service.',
  },
]

export const BANKING_POLICY: Policy = {
  policyId: 'POL-BK-001',
  version: '1.0.0',
  domain: 'banking',
  displayName: 'Banking & Finance Data Protection Policy',
  description: 'Protections for customer financial data in banking environments.',
  rules: bankingRules,
  defaultAction: 'warn',
}

// ─── Legal Policy ─────────────────────────────────────────────────────────────

const legalRules: PolicyRule[] = [
  {
    ruleId: 'LG-001',
    description: 'Escalate or block confidential legal content',
    categories: ['legal_confidential', 'confidential_phrase'],
    riskLevel: 'high',
    action: 'escalate',
    canBeAcknowledged: false,
    userExplanation: 'Legal confidentiality markers detected. Content related to legal strategy, client matters, or privileged communications requires review before any AI processing.',
    regulatoryNote: 'Note: Attorney-client privilege and legal professional privilege vary by jurisdiction. This prototype does not provide legal advice.',
  },
  {
    ruleId: 'LG-002',
    description: 'Block credentials',
    categories: ['password_or_token'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Credentials must never be shared with any AI service.',
  },
]

export const LEGAL_POLICY: Policy = {
  policyId: 'POL-LG-001',
  version: '1.0.0',
  domain: 'legal',
  displayName: 'Legal Services Confidentiality Policy',
  description: 'Protections for privileged legal communications and client confidential information.',
  rules: legalRules,
  defaultAction: 'warn',
}

// ─── General Policy ───────────────────────────────────────────────────────────

const generalRules: PolicyRule[] = [
  {
    ruleId: 'GN-001',
    description: 'Block credentials in any context',
    categories: ['password_or_token'],
    riskLevel: 'critical',
    action: 'block',
    canBeAcknowledged: false,
    userExplanation: 'Credentials, passwords, or API tokens must never be shared with any AI service.',
  },
  {
    ruleId: 'GN-002',
    description: 'Warn for email addresses',
    categories: ['email'],
    riskLevel: 'medium',
    action: 'warn',
    canBeAcknowledged: true,
    userExplanation: 'An email address was detected. Consider whether it is necessary to include it in your prompt.',
  },
  {
    ruleId: 'GN-003',
    description: 'Warn for phone numbers',
    categories: ['phone'],
    riskLevel: 'medium',
    action: 'warn',
    canBeAcknowledged: true,
    userExplanation: 'A phone number was detected. Consider whether it needs to be included.',
  },
]

export const GENERAL_POLICY: Policy = {
  policyId: 'POL-GN-001',
  version: '1.0.0',
  domain: 'general',
  displayName: 'General Use Policy',
  description: 'Baseline protections for general AI use.',
  rules: generalRules,
  defaultAction: 'allow',
}

// ─── Policy Registry ──────────────────────────────────────────────────────────

export const ALL_POLICIES: Record<Domain, Policy> = {
  healthcare: HEALTHCARE_POLICY,
  banking: BANKING_POLICY,
  legal: LEGAL_POLICY,
  general: GENERAL_POLICY,
}

// ─── Policy Engine ────────────────────────────────────────────────────────────

const ACTION_PRECEDENCE: Record<DecisionAction, number> = {
  allow: 0,
  warn: 1,
  anonymize: 2,
  escalate: 3,
  block: 4,
}

export interface PolicyEvaluationResult {
  applicablePolicies: Policy[]
  matchedRules: PolicyRule[]
  finalAction: DecisionAction
  finalRiskLevel: RiskLevel
  explanations: string[]
  canBeAcknowledged: boolean
  regulatoryNotes: string[]
}

export function evaluatePolicies(
  detectedCategories: SensitiveCategory[],
  domain: Domain,
  hasHardBlockTriggers: boolean,
): PolicyEvaluationResult {
  // Always include the domain-specific policy plus general baseline
  const applicablePolicies = domain === 'general'
    ? [GENERAL_POLICY]
    : [ALL_POLICIES[domain], GENERAL_POLICY]

  const matchedRules: PolicyRule[] = []
  let finalAction: DecisionAction = 'allow'
  let finalRiskLevel: RiskLevel = 'low'
  let canBeAcknowledged = true
  const explanations: string[] = []
  const regulatoryNotes: string[] = []

  const RISK_PRECEDENCE: Record<RiskLevel, number> = {
    low: 0, medium: 1, high: 2, critical: 3,
  }

  for (const policy of applicablePolicies) {
    for (const rule of policy.rules) {
      const hasMatch = rule.categories.some(cat => detectedCategories.includes(cat))
      if (!hasMatch) continue

      matchedRules.push(rule)
      explanations.push(`[${rule.ruleId}] ${rule.userExplanation}`)
      if (rule.regulatoryNote) regulatoryNotes.push(rule.regulatoryNote)

      // Higher action wins
      if (ACTION_PRECEDENCE[rule.action] > ACTION_PRECEDENCE[finalAction]) {
        finalAction = rule.action
      }
      // Higher risk wins
      if (RISK_PRECEDENCE[rule.riskLevel] > RISK_PRECEDENCE[finalRiskLevel]) {
        finalRiskLevel = rule.riskLevel
      }
      // If any rule cannot be acknowledged → overall cannot be acknowledged
      if (!rule.canBeAcknowledged) {
        canBeAcknowledged = false
      }
    }
  }

  // Hard block triggers always result in block, regardless
  if (hasHardBlockTriggers && ACTION_PRECEDENCE[finalAction] < ACTION_PRECEDENCE['block']) {
    finalAction = 'block'
    finalRiskLevel = 'critical'
    canBeAcknowledged = false
    explanations.push('Hard block: one or more detected items require mandatory blocking under the active policy.')
  }

  return {
    applicablePolicies,
    matchedRules,
    finalAction,
    finalRiskLevel,
    explanations,
    canBeAcknowledged,
    regulatoryNotes,
  }
}
