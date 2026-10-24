import type { AnonymizationResult, DetectionMatch, SensitiveCategory } from '../types'
import { scanText } from './PrivacyScanner'

// ─── Placeholder Map ──────────────────────────────────────────────────────────

const PLACEHOLDER_MAP: Record<SensitiveCategory, string> = {
  patient_name: '[PATIENT_NAME]',
  patient_id: '[PATIENT_ID]',
  date_of_birth: '[DATE_OF_BIRTH]',
  diagnosis: '[DIAGNOSIS_INFORMATION]',
  medication: '[MEDICATION_INFORMATION]',
  lab_value: '[LAB_VALUE]',
  email: '[EMAIL_ADDRESS]',
  phone: '[PHONE_NUMBER]',
  iban: '[IBAN]',
  payment_card: '[CARD_NUMBER]',
  account_number: '[ACCOUNT_NUMBER]',
  password_or_token: '[CREDENTIAL_REDACTED]',
  confidential_phrase: '[CONFIDENTIAL_CONTENT]',
  financial_info: '[FINANCIAL_AMOUNT]',
  legal_confidential: '[LEGAL_REFERENCE]',
  personal_identifier: '[PERSONAL_IDENTIFIER]',
}

// ─── Re-identification risk combinations ──────────────────────────────────────

const REIDENTIFICATION_COMBOS: Array<{
  categories: SensitiveCategory[]
  warning: string
}> = [
  {
    categories: ['lab_value', 'date_of_birth'],
    warning: 'Combining lab values with a date of birth can re-identify a patient even after name removal.',
  },
  {
    categories: ['diagnosis', 'date_of_birth'],
    warning: 'A specific diagnosis combined with a date of birth may be sufficient to identify a patient, especially for rare conditions.',
  },
  {
    categories: ['medication', 'lab_value', 'diagnosis'],
    warning: 'The combination of medication, lab values, and diagnosis creates a detailed clinical profile that may re-identify a patient without an explicit name or ID.',
  },
  {
    categories: ['lab_value', 'diagnosis'],
    warning: 'Lab values combined with a diagnosis can narrow down a patient population significantly.',
  },
]

// ─── Anonymize ────────────────────────────────────────────────────────────────

export function anonymizeText(
  original: string,
  matches: DetectionMatch[],
): AnonymizationResult {
  if (matches.length === 0) {
    return {
      original,
      anonymized: original,
      replacements: [],
      reIdentificationWarnings: [],
    }
  }

  // Sort matches by startIndex descending so replacements don't shift indices
  const sorted = [...matches].sort((a, b) => b.startIndex - a.startIndex)

  let anonymized = original
  const replacements: AnonymizationResult['replacements'] = []

  for (const match of sorted) {
    const placeholder = PLACEHOLDER_MAP[match.category] ?? '[REDACTED]'
    anonymized =
      anonymized.slice(0, match.startIndex) +
      placeholder +
      anonymized.slice(match.endIndex)

    replacements.push({
      original: match.matchedText,
      placeholder,
      category: match.category,
    })
  }

  // Detect re-identification risks
  const presentCategories = new Set(matches.map(m => m.category))
  const reIdentificationWarnings: string[] = []

  for (const combo of REIDENTIFICATION_COMBOS) {
    const allPresent = combo.categories.every(c => presentCategories.has(c))
    if (allPresent) {
      reIdentificationWarnings.push(combo.warning)
    }
  }

  // Generic warning if multiple high-risk categories present
  if (presentCategories.size >= 3) {
    reIdentificationWarnings.push(
      'Multiple sensitive data categories were detected. Even after anonymization, the combination of remaining details may allow re-identification. Consider whether all remaining context is necessary for your task.',
    )
  }

  return {
    original,
    anonymized,
    replacements,
    reIdentificationWarnings,
  }
}

// ─── Natural language suggestion generator ────────────────────────────────────
// Produces a task-preserving rewrite instead of just placeholders

export function generateAlternativeSuggestion(original: string, matches: DetectionMatch[]): string {
  if (matches.length === 0) return original

  const categories = new Set(matches.map(m => m.category))
  const lower = original.toLowerCase()

  // Healthcare: medication/diagnosis query
  if (
    (categories.has('diagnosis') || categories.has('medication') || categories.has('lab_value')) &&
    (lower.includes('metformin') || lower.includes('diabetes') || lower.includes('hba1c') || lower.includes('medication'))
  ) {
    const labHint = lower.includes('hba1c') ? ' with above-target glycemic control' : ''
    const medHint = lower.includes('metformin') ? ' currently on first-line oral medication' : ''
    return `A patient with Type 2 diabetes${medHint}${labHint}. What general considerations exist for optimising glycemic management, assuming standard organ function? Please provide educational guidance only, without referencing any specific individual.`
  }

  // Healthcare: clinical notes summary
  if (categories.has('patient_id') || categories.has('patient_name')) {
    if (lower.includes('summar') || lower.includes('note') || lower.includes('clinical')) {
      return `Provide a general educational summary of the management considerations for the relevant condition, without referencing any specific patient, identifier, or personal information.`
    }
  }

  // Banking: customer account email
  if (categories.has('account_number') || categories.has('financial_info') || categories.has('iban')) {
    if (lower.includes('email') || lower.includes('write') || lower.includes('letter')) {
      return `Write a professional email to a customer regarding their account status and current balance, using generic placeholders instead of any specific personal or financial details.`
    }
    return `Summarise the general financial activity for a customer account, using anonymised figures and no personally identifiable information.`
  }

  // Legal: confidential strategy
  if (categories.has('legal_confidential') || categories.has('confidential_phrase')) {
    return `Analyse the general strategic considerations that might apply in a commercial acquisition dispute, without referencing any specific client, party, or confidential matter.`
  }

  // Generic fallback: strip names and IDs and describe the task abstractly
  const taskVerb = lower.includes('summar') ? 'Summarise'
    : lower.includes('analys') ? 'Analyse'
    : lower.includes('write') || lower.includes('draft') ? 'Draft'
    : lower.includes('explain') ? 'Explain'
    : 'Address'

  return `${taskVerb} the relevant topic in general terms, without including any personally identifiable information, account numbers, or other sensitive details. Use abstract descriptions or placeholders where specific values are needed.`
}

// ─── Anonymization Validator (mandatory re-scan) ──────────────────────────────

export interface AnonymizationValidationResult {
  passedRecheck: boolean
  recheckScanResult: ReturnType<typeof scanText>
  remainingRisks: string[]
  isReadyToSubmit: boolean
}

export function validateAnonymization(anonymizedText: string): AnonymizationValidationResult {
  const recheckScan = scanText(anonymizedText)

  const remainingRisks = recheckScan.matches.map(
    m => `[${m.category}] "${m.matchedText.substring(0, 30)}…" — ${m.explanation}`,
  )

  // Check if any hard-block triggers remain
  const passedRecheck =
    !recheckScan.hasHardBlockTriggers &&
    recheckScan.overallRisk !== 'critical'

  const isReadyToSubmit = passedRecheck

  return {
    passedRecheck,
    recheckScanResult: recheckScan,
    remainingRisks,
    isReadyToSubmit,
  }
}
