import type {
  DetectionMatch,
  ScanResult,
  SensitiveCategory,
  RiskLevel,
  Domain,
} from '../types'

// ─── Detection Patterns ───────────────────────────────────────────────────────

interface PatternDef {
  category: SensitiveCategory
  riskLevel: RiskLevel
  pattern: RegExp
  explanation: string
  replacement: string
  confidence: 'deterministic' | 'heuristic'
}

const PATTERNS: PatternDef[] = [
  // Patient / Medical IDs  (e.g. MED-10492, PAT-00123, P-1234)
  {
    category: 'patient_id',
    riskLevel: 'critical',
    pattern: /\b(?:MED|PAT|PT|P)-\d{3,10}\b/gi,
    explanation: 'A patient identifier was detected. Patient IDs directly link data to an individual and must never be shared with external AI services.',
    replacement: '[PATIENT_ID]',
    confidence: 'deterministic',
  },

  // Dates of birth — explicit label context (born DD Month YYYY, DOB, date of birth)
  {
    category: 'date_of_birth',
    riskLevel: 'critical',
    pattern: /\b(?:born|dob|date\s+of\s+birth)[:\s]+\d{1,2}[\s/.-](?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})[\s/.-]\d{2,4}\b/gi,
    explanation: 'A date of birth was detected. Combined with other data, this can re-identify a patient even after name removal.',
    replacement: '[DATE_OF_BIRTH]',
    confidence: 'deterministic',
  },

  // Generic date patterns near patient context (secondary — lower confidence)
  {
    category: 'date_of_birth',
    riskLevel: 'high',
    pattern: /\b\d{1,2}[\s](?:january|february|march|april|may|june|july|august|september|october|november|december)[\s]\d{4}\b/gi,
    explanation: 'A specific date was detected. In medical context, dates of birth can contribute to patient re-identification.',
    replacement: '[DATE]',
    confidence: 'heuristic',
  },

  // Email addresses
  {
    category: 'email',
    riskLevel: 'high',
    pattern: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    explanation: 'An email address was detected. This is personally identifiable information.',
    replacement: '[EMAIL_ADDRESS]',
    confidence: 'deterministic',
  },

  // Phone numbers (international and local formats)
  {
    category: 'phone',
    riskLevel: 'high',
    pattern: /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g,
    explanation: 'A phone number pattern was detected. This is personally identifiable information.',
    replacement: '[PHONE_NUMBER]',
    confidence: 'heuristic',
  },

  // IBAN (European banking identifier) — groups can contain letters and digits
  {
    category: 'iban',
    riskLevel: 'critical',
    pattern: /\b[A-Z]{2}\d{2}[\s]?(?:[A-Z0-9]{1,4}[\s]?){2,8}\b/g,
    explanation: 'An IBAN-like banking identifier was detected. This is sensitive financial information.',
    replacement: '[IBAN]',
    confidence: 'deterministic',
  },

  // Payment cards (Luhn-checked inline)
  {
    category: 'payment_card',
    riskLevel: 'critical',
    pattern: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
    explanation: 'A possible payment card number was detected.',
    replacement: '[CARD_NUMBER]',
    confidence: 'deterministic',
  },

  // Account numbers in banking context (8-10 digit sequences near banking terms)
  {
    category: 'account_number',
    riskLevel: 'critical',
    pattern: /\b(?:account|acc|acct|a\/c)[\s#:]*\d{6,12}\b/gi,
    explanation: 'A bank account number was detected. This is sensitive financial data.',
    replacement: '[ACCOUNT_NUMBER]',
    confidence: 'deterministic',
  },

  // Passwords / secrets / API tokens
  {
    category: 'password_or_token',
    riskLevel: 'critical',
    pattern: /\b(?:password|passwd|pwd|secret|api[_\s]?key|token|bearer|auth)[:\s=]+\S+/gi,
    explanation: 'A credential, password, or API token was detected. This must never be shared with any AI service.',
    replacement: '[CREDENTIAL_REDACTED]',
    confidence: 'deterministic',
  },

  // Confidentiality phrases
  {
    category: 'confidential_phrase',
    riskLevel: 'high',
    pattern: /\b(?:confidential|internal\s+use\s+only|do\s+not\s+distribute|strictly\s+private|privileged\s+and\s+confidential|attorney[–\-]client\s+privilege)\b/gi,
    explanation: 'A confidentiality marker was detected. This content may be subject to legal or professional privilege.',
    replacement: '[CONFIDENTIAL_CONTENT]',
    confidence: 'deterministic',
  },

  // Diagnoses in medical context (common keywords near patient data)
  {
    category: 'diagnosis',
    riskLevel: 'high',
    pattern: /\b(?:diagnosed\s+with|diagnosis[:\s]+|suffers?\s+from|condition[:\s]+|medical\s+history[:\s]+|presenting\s+with)\s+[A-Z][a-zA-Z\s,\d-]{3,60}/g,
    explanation: 'A medical diagnosis was detected. Health information requires the highest level of protection.',
    replacement: '[DIAGNOSIS_INFORMATION]',
    confidence: 'heuristic',
  },

  // Medications with dosage — triggers must be unambiguous (colon-label form, or specific drug names)
  {
    category: 'medication',
    riskLevel: 'high',
    pattern: /\b(?:taking|prescribed|medication:\s*|drug:\s*|on\s+(?:metformin|insulin|aspirin|warfarin|lisinopril|atorvastatin|omeprazole|amoxicillin|paracetamol|ibuprofen|ramipril|bisoprolol|amlodipine|sertraline|fluoxetine))\s*[a-zA-Z]*(?:\s+\d+\s*mg(?:\s+(?:twice|once|three\s+times)\s+(?:daily|a\s+day))?)?\b/gi,
    explanation: 'Medication information was detected. Prescriptions linked to a patient are sensitive health data.',
    replacement: '[MEDICATION_INFORMATION]',
    confidence: 'heuristic',
  },

  // Lab values linked to patient context (e.g. HbA1c 8.2%, eGFR 45)
  {
    category: 'lab_value',
    riskLevel: 'medium',
    pattern: /\b(?:HbA1c|eGFR|creatinine|glucose|cholesterol|LDL|HDL|triglycerides|PSA|INR|haemoglobin|hemoglobin|platelet|WBC|RBC|sodium|potassium|ALT|AST|bilirubin)\s*[=:]?\s*\d+(?:[.,]\d+)?\s*(?:%|mmol\/L|mg\/dL|U\/L|g\/dL)?\b/gi,
    explanation: 'A lab value or clinical measurement was detected. In combination with other patient data, this contributes to re-identification risk.',
    replacement: '[LAB_VALUE]',
    confidence: 'deterministic',
  },

  // Financial amounts linked to individuals (€12,000, $24,500 etc.)
  {
    category: 'financial_info',
    riskLevel: 'high',
    pattern: /(?:€|£|\$|USD|EUR|GBP)\s?\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2})?/g,
    explanation: 'A financial amount was detected. When linked to an individual, this is sensitive financial data.',
    replacement: '[FINANCIAL_AMOUNT]',
    confidence: 'deterministic',
  },

  // Legal confidential — client names near legal terms
  {
    category: 'legal_confidential',
    riskLevel: 'high',
    pattern: /\b(?:client|claimant|defendant|plaintiff|attorney|counsel|litigation|settlement|acquisition|dispute|lawsuit)\b/gi,
    explanation: 'Legal terminology was detected. Content related to legal matters may be subject to professional privilege.',
    replacement: '[LEGAL_REFERENCE]',
    confidence: 'heuristic',
  },
]

// ─── Name Heuristic ───────────────────────────────────────────────────────────
// Two-step: find context keyword (case-insensitive), then extract following Title Case words
// Using 'gi' on context-only pattern, then validate name words have uppercase first letter
const NAME_CONTEXT_RE = /\b(?:patient|customer|client|user|dr\.?|doctor|nurse)\s+/gi
const TITLE_CASE_NAME_RE = /^([A-Z][a-z]{1,20})(\s+[A-Z][a-z]{1,20}){0,2}/

// ─── Luhn Check ───────────────────────────────────────────────────────────────

function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  let sum = 0
  let isEven = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10)
    if (isEven) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    isEven = !isEven
  }
  return sum % 10 === 0
}

// ─── Domain Classifier ────────────────────────────────────────────────────────

const HEALTHCARE_KEYWORDS = [
  'patient', 'diagnosis', 'medication', 'prescribed', 'clinical', 'medical',
  'doctor', 'physician', 'nurse', 'hospital', 'treatment', 'symptom', 'disease',
  'therapy', 'prescription', 'laboratory', 'pathology', 'radiology', 'surgery',
  'hba1c', 'egfr', 'diabetes', 'hypertension', 'cholesterol', 'bmi',
  'med-', 'pat-', 'dob', 'date of birth',
]

const BANKING_KEYWORDS = [
  'account', 'balance', 'transaction', 'iban', 'bank', 'transfer', 'payment',
  'credit', 'debit', 'loan', 'mortgage', 'overdraft', 'customer', 'swift',
  'branch', 'financial activity', 'statement',
]

const LEGAL_KEYWORDS = [
  'confidential', 'attorney', 'client', 'privileged', 'litigation', 'settlement',
  'acquisition', 'dispute', 'lawsuit', 'counsel', 'legal strategy', 'claimant',
  'defendant', 'plaintiff', 'contract', 'legal advice',
]

export function classifyDomain(text: string): Domain {
  const lower = text.toLowerCase()
  const score = (keywords: string[]) =>
    keywords.filter(k => lower.includes(k)).length

  const scores: Record<Domain, number> = {
    healthcare: score(HEALTHCARE_KEYWORDS),
    banking: score(BANKING_KEYWORDS),
    legal: score(LEGAL_KEYWORDS),
    general: 0,
  }

  const maxDomain = (Object.entries(scores) as [Domain, number][])
    .filter(([d]) => d !== 'general')
    .sort(([, a], [, b]) => b - a)[0]

  if (maxDomain && maxDomain[1] >= 2) return maxDomain[0]
  return 'general'
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

let matchCounter = 0

function makeId(): string {
  return `match_${++matchCounter}_${Date.now()}`
}

function deduplicateMatches(matches: DetectionMatch[]): DetectionMatch[] {
  // Remove matches fully contained within another match
  return matches.filter(m =>
    !matches.some(
      other =>
        other.id !== m.id &&
        other.startIndex <= m.startIndex &&
        other.endIndex >= m.endIndex &&
        other.riskLevel !== m.riskLevel
    )
  )
}

function riskOrdinal(r: RiskLevel): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[r]
}

const HARD_BLOCK_CATEGORIES: SensitiveCategory[] = [
  'patient_id',
  'date_of_birth',
  'diagnosis',
  'patient_name',
  'iban',
  'payment_card',
  'password_or_token',
]

export function scanText(text: string): ScanResult {
  if (!text || text.trim().length === 0) {
    return {
      matches: [],
      overallRisk: 'low',
      domain: 'general',
      hasHardBlockTriggers: false,
      scanTimestamp: Date.now(),
    }
  }

  const matches: DetectionMatch[] = []

  // Run all deterministic / heuristic patterns
  for (const def of PATTERNS) {
    const re = new RegExp(def.pattern.source, def.pattern.flags)
    let m: RegExpExecArray | null

    while ((m = re.exec(text)) !== null) {
      // Skip Luhn-invalid card numbers
      if (def.category === 'payment_card' && !luhnCheck(m[0])) continue

      matches.push({
        id: makeId(),
        category: def.category,
        riskLevel: def.riskLevel,
        matchedText: m[0],
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        explanation: def.explanation,
        suggestedReplacement: def.replacement,
        confidence: def.confidence,
      })
    }
  }

  // Name heuristic — two-step: find context keyword, then extract Title Case name
  const nameContextRe = new RegExp(NAME_CONTEXT_RE.source, NAME_CONTEXT_RE.flags)
  let nm: RegExpExecArray | null
  while ((nm = nameContextRe.exec(text)) !== null) {
    // nm.index + nm[0].length = start of potential name
    const nameStart = nm.index + nm[0].length
    const remaining = text.slice(nameStart)
    const nameMatch = TITLE_CASE_NAME_RE.exec(remaining)
    if (!nameMatch) continue
    const name = nameMatch[0].trimEnd()
    matches.push({
      id: makeId(),
      category: 'patient_name',
      riskLevel: 'critical',
      matchedText: name,
      startIndex: nameStart,
      endIndex: nameStart + name.length,
      explanation: 'A personal name was detected in a clinical context. Patient names directly identify individuals and must not be shared with external AI services.',
      suggestedReplacement: '[PATIENT_NAME]',
      confidence: 'heuristic',
    })
  }

  const deduped = deduplicateMatches(matches)

  const overallRisk: RiskLevel = deduped.reduce<RiskLevel>((best, m) => {
    return riskOrdinal(m.riskLevel) > riskOrdinal(best) ? m.riskLevel : best
  }, 'low')

  const domain = classifyDomain(text)

  const hasHardBlockTriggers = deduped.some(m =>
    HARD_BLOCK_CATEGORIES.includes(m.category)
  )

  return {
    matches: deduped,
    overallRisk,
    domain,
    hasHardBlockTriggers,
    scanTimestamp: Date.now(),
  }
}
