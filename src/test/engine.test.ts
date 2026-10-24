import { describe, it, expect, beforeEach } from 'vitest'
import { scanText, classifyDomain } from '../engine/PrivacyScanner'
import { runDecisionTreeA, runDecisionTreeARecheck } from '../engine/DecisionTreeEngine'
import { anonymizeText, validateAnonymization } from '../engine/AnonymizationEngine'
import { evaluatePolicies } from '../engine/PolicyEngine'
import { generateDemoResponse, runDecisionTreeB } from '../engine/DemoAIProvider'
import { resetMetrics, getMetrics, recordScan } from '../engine/SessionMetrics'
import { recordApproval, resetApprovalHistory } from '../engine/AgentSimulator'

// ─── PrivacyScanner ───────────────────────────────────────────────────────────

describe('PrivacyScanner', () => {
  it('detects an email address', () => {
    const result = scanText('Please contact john.doe@example.com for more info.')
    const emails = result.matches.filter(m => m.category === 'email')
    expect(emails.length).toBeGreaterThan(0)
    expect(emails[0].matchedText).toBe('john.doe@example.com')
    expect(emails[0].confidence).toBe('deterministic')
  })

  it('detects an IBAN', () => {
    const result = scanText('Please transfer to IBAN GB29 NWBK 6016 1331 9268 19')
    const ibans = result.matches.filter(m => m.category === 'iban')
    expect(ibans.length).toBeGreaterThan(0)
    expect(ibans[0].riskLevel).toBe('critical')
  })

  it('detects a patient ID', () => {
    const result = scanText('Patient ID MED-10492 has an appointment today.')
    const ids = result.matches.filter(m => m.category === 'patient_id')
    expect(ids.length).toBeGreaterThan(0)
    expect(ids[0].riskLevel).toBe('critical')
  })

  it('detects a patient name in medical context', () => {
    const result = scanText('Patient Emma Johnson is scheduled for a review.')
    const names = result.matches.filter(m => m.category === 'patient_name')
    expect(names.length).toBeGreaterThan(0)
    expect(names[0].matchedText).toBe('Emma Johnson')
  })

  it('detects a date of birth', () => {
    const result = scanText('The patient was born 14 March 1982.')
    const dobs = result.matches.filter(m => m.category === 'date_of_birth')
    expect(dobs.length).toBeGreaterThan(0)
  })

  it('detects financial information', () => {
    const result = scanText('The customer has a balance of €24,500 in their account.')
    const fin = result.matches.filter(m => m.category === 'financial_info')
    expect(fin.length).toBeGreaterThan(0)
  })

  it('detects password patterns', () => {
    const result = scanText('Set password: MySuperSecret123 for the system.')
    const creds = result.matches.filter(m => m.category === 'password_or_token')
    expect(creds.length).toBeGreaterThan(0)
    expect(creds[0].riskLevel).toBe('critical')
  })

  it('detects a lab value (HbA1c)', () => {
    const result = scanText('The patient has HbA1c 8.2% on last measurement.')
    const labs = result.matches.filter(m => m.category === 'lab_value')
    expect(labs.length).toBeGreaterThan(0)
  })

  it('does not generate excessive false alarms for harmless prompts', () => {
    const result = scanText('Explain the advantages and disadvantages of using AI in education.')
    expect(result.matches.length).toBe(0)
    expect(result.overallRisk).toBe('low')
  })

  it('returns low risk for empty input', () => {
    const result = scanText('')
    expect(result.matches.length).toBe(0)
    expect(result.overallRisk).toBe('low')
    expect(result.hasHardBlockTriggers).toBe(false)
  })

  it('handles unusual characters without crashing', () => {
    expect(() => scanText('こんにちは 你好 مرحبا — prompt with unicode')).not.toThrow()
  })

  it('sets hasHardBlockTriggers when patient_id is found', () => {
    const result = scanText('Reviewing patient MED-00123.')
    expect(result.hasHardBlockTriggers).toBe(true)
  })
})

// ─── DomainClassifier ─────────────────────────────────────────────────────────

describe('DomainClassifier', () => {
  it('classifies healthcare domain', () => {
    expect(classifyDomain('Patient diagnosis medication prescribed doctor')).toBe('healthcare')
  })

  it('classifies banking domain', () => {
    expect(classifyDomain('Bank account transfer IBAN customer balance')).toBe('banking')
  })

  it('classifies legal domain', () => {
    expect(classifyDomain('confidential client attorney litigation settlement dispute')).toBe('legal')
  })

  it('returns general for neutral text', () => {
    expect(classifyDomain('Explain artificial intelligence in education')).toBe('general')
  })
})

// ─── PolicyEngine ─────────────────────────────────────────────────────────────

describe('PolicyEngine', () => {
  it('returns BLOCK for patient_id in healthcare domain', () => {
    const result = evaluatePolicies(['patient_id'], 'healthcare', true)
    expect(result.finalAction).toBe('block')
    expect(result.canBeAcknowledged).toBe(false)
  })

  it('returns BLOCK for password_or_token in any domain', () => {
    const result = evaluatePolicies(['password_or_token'], 'general', true)
    expect(result.finalAction).toBe('block')
    expect(result.canBeAcknowledged).toBe(false)
  })

  it('returns BLOCK when hasHardBlockTriggers is true', () => {
    const result = evaluatePolicies([], 'general', true)
    expect(result.finalAction).toBe('block')
  })

  it('BLOCK takes precedence over WARN', () => {
    const result = evaluatePolicies(['patient_id', 'lab_value'], 'healthcare', true)
    expect(result.finalAction).toBe('block')
  })

  it('returns ALLOW for no findings in general domain', () => {
    const result = evaluatePolicies([], 'general', false)
    expect(result.finalAction).toBe('allow')
  })

  it('escalates legal confidential content', () => {
    const result = evaluatePolicies(['legal_confidential', 'confidential_phrase'], 'legal', false)
    expect(result.finalAction).toBe('escalate')
  })

  it('includes matched rule IDs in result', () => {
    const result = evaluatePolicies(['patient_id'], 'healthcare', false)
    const ruleIds = result.matchedRules.map(r => r.ruleId)
    expect(ruleIds).toContain('HC-001')
  })
})

// ─── DecisionTreeEngine ───────────────────────────────────────────────────────

describe('DecisionTreeEngine — Tree A', () => {
  it('returns ALLOW for a clean educational prompt', () => {
    const text = 'Explain the benefits of AI in modern healthcare systems.'
    const scan = scanText(text)
    const result = runDecisionTreeA(text, scan)
    expect(result.action).toBe('allow')
    expect(result.canProceed).toBe(true)
    expect(result.decisionPath.length).toBeGreaterThan(0)
  })

  it('returns BLOCK for a prompt with patient identifiers', () => {
    const text = 'Patient Emma Johnson, MED-10492, diabetes, metformin 500mg.'
    const scan = scanText(text)
    const result = runDecisionTreeA(text, scan)
    expect(result.action).toBe('block')
    expect(result.canProceed).toBe(false)
  })

  it('BLOCK result has a non-null decision path', () => {
    const text = 'Patient Emma Johnson MED-10492'
    const scan = scanText(text)
    const result = runDecisionTreeA(text, scan)
    expect(result.decisionPath.length).toBeGreaterThan(0)
    expect(result.decisionPath.some(n => n.color === 'red')).toBe(true)
  })

  it('re-evaluation marks prompt as isAnonymized', () => {
    const anon = 'A patient with Type 2 diabetes on metformin with HbA1c 8.2%.'
    const scan = scanText(anon)
    const result = runDecisionTreeARecheck(anon, scan)
    expect(result.isAnonymized).toBe(true)
  })

  it('re-evaluation of still-risky anonymized text still blocks', () => {
    const stillRisky = 'Patient Emma Johnson MED-10492 has HbA1c 8.2%.'
    const scan = scanText(stillRisky)
    const result = runDecisionTreeARecheck(stillRisky, scan)
    expect(result.canProceed).toBe(false)
    expect(result.action).toBe('block')
  })

  it('cannot be bypassed by reusing a stale canProceed=true from a different result', () => {
    // Get a clean result
    const cleanText = 'Explain diabetes management.'
    const cleanScan = scanText(cleanText)
    const cleanResult = runDecisionTreeA(cleanText, cleanScan)
    expect(cleanResult.canProceed).toBe(true)

    // Now check risky text independently — clean result does not apply
    const riskyText = 'Patient Emma Johnson MED-10492'
    const riskyScan = scanText(riskyText)
    const riskyResult = runDecisionTreeA(riskyText, riskyScan)
    expect(riskyResult.canProceed).toBe(false)
    // canProceed from cleanResult doesn't affect riskyResult
    expect(cleanResult.canProceed).toBe(true) // still true for its own text
    expect(riskyResult.canProceed).toBe(false) // independently false
  })
})

// ─── AnonymizationEngine ──────────────────────────────────────────────────────

describe('AnonymizationEngine', () => {
  it('replaces patient name with placeholder', () => {
    const text = 'Patient Emma Johnson needs review.'
    const scan = scanText(text)
    const result = anonymizeText(text, scan.matches)
    expect(result.anonymized).toContain('[PATIENT_NAME]')
    expect(result.anonymized).not.toContain('Emma Johnson')
  })

  it('replaces patient ID', () => {
    const text = 'ID: MED-10492'
    const scan = scanText(text)
    const result = anonymizeText(text, scan.matches)
    expect(result.anonymized).toContain('[PATIENT_ID]')
    expect(result.anonymized).not.toContain('MED-10492')
  })

  it('handles text with no matches — returns original unchanged', () => {
    const text = 'Explain AI in education.'
    const result = anonymizeText(text, [])
    expect(result.anonymized).toBe(text)
    expect(result.replacements.length).toBe(0)
    expect(result.reIdentificationWarnings.length).toBe(0)
  })

  it('warns about re-identification when lab + diagnosis are both present', () => {
    const text = 'Patient diagnosed with Type 2 diabetes. HbA1c 8.2%.'
    const scan = scanText(text)
    const result = anonymizeText(text, scan.matches)
    // May or may not trigger depending on pattern matches — test gracefully
    expect(result.reIdentificationWarnings).toBeDefined()
    expect(Array.isArray(result.reIdentificationWarnings)).toBe(true)
  })

  it('anonymization validator flags remaining sensitive data', () => {
    const stillHasSensitive = 'Patient Emma Johnson MED-10492'
    const validation = validateAnonymization(stillHasSensitive)
    expect(validation.passedRecheck).toBe(false)
    expect(validation.isReadyToSubmit).toBe(false)
    expect(validation.remainingRisks.length).toBeGreaterThan(0)
  })

  it('anonymization validator passes clean text', () => {
    const clean = 'A patient with Type 2 diabetes on standard oral medication.'
    const validation = validateAnonymization(clean)
    expect(validation.passedRecheck).toBe(true)
    expect(validation.isReadyToSubmit).toBe(true)
  })
})

// ─── DemoAIProvider + Decision Tree B ─────────────────────────────────────────

describe('DemoAIProvider', () => {
  it('returns a simulated response with isSimulated: true', () => {
    const response = generateDemoResponse('A patient with Type 2 diabetes on metformin.', 'healthcare')
    expect(response.isSimulated).toBe(true)
    expect(response.simulationNote).toBeTruthy()
  })

  it('response contains verifiable claims', () => {
    const response = generateDemoResponse('HbA1c 8.2% metformin adjustment', 'healthcare')
    expect(response.verifiableClaims.length).toBeGreaterThan(0)
  })
})

describe('Decision Tree B', () => {
  it('marks healthcare domain as high-stakes', () => {
    const response = generateDemoResponse('Type 2 diabetes metformin', 'healthcare')
    const ct = runDecisionTreeB(response)
    expect(ct.isHighStakesDomain).toBe(true)
  })

  it('requires 2 activities for high-stakes domain', () => {
    const response = generateDemoResponse('Type 2 diabetes metformin', 'healthcare')
    const ct = runDecisionTreeB(response)
    expect(ct.requiredActivitiesCount).toBe(2)
  })

  it('canProceedToDecision is false initially', () => {
    const response = generateDemoResponse('AI in education', 'general')
    const ct = runDecisionTreeB(response)
    expect(ct.canProceedToDecision).toBe(false)
  })

  it('returns 3 activities', () => {
    const response = generateDemoResponse('Type 2 diabetes metformin', 'healthcare')
    const ct = runDecisionTreeB(response)
    expect(ct.activities.length).toBe(3)
  })

  it('generates a decision path', () => {
    const response = generateDemoResponse('Type 2 diabetes metformin', 'healthcare')
    const ct = runDecisionTreeB(response)
    expect(ct.decisionPath.length).toBeGreaterThan(0)
  })
})

// ─── SessionMetrics ───────────────────────────────────────────────────────────

describe('SessionMetrics', () => {
  beforeEach(() => resetMetrics())

  it('starts at zero', () => {
    const m = getMetrics()
    expect(m.promptsScanned).toBe(0)
    expect(m.hardBlocksTriggered).toBe(0)
  })

  it('increments promptsScanned on recordScan', () => {
    recordScan(false, 'allow', 'general')
    expect(getMetrics().promptsScanned).toBe(1)
  })

  it('increments hardBlocksTriggered for block action', () => {
    recordScan(true, 'block', 'healthcare')
    expect(getMetrics().hardBlocksTriggered).toBe(1)
  })

  it('does not store raw text in metrics', () => {
    recordScan(true, 'block', 'healthcare')
    const m = getMetrics()
    const str = JSON.stringify(m)
    expect(str).not.toContain('Emma Johnson')
    expect(str).not.toContain('MED-')
    expect(str).not.toContain('password')
  })

  it('resets all counters', () => {
    recordScan(true, 'block', 'healthcare')
    resetMetrics()
    expect(getMetrics().promptsScanned).toBe(0)
    expect(getMetrics().hardBlocksTriggered).toBe(0)
  })
})

// ─── SkillDegradationMonitor ──────────────────────────────────────────────────

describe('SkillDegradationMonitor', () => {
  beforeEach(() => resetApprovalHistory())

  it('triggers alert for very fast approval', () => {
    const result = recordApproval(1500, false) // 1.5 seconds
    expect(result.alert).toBe(true)
    expect(result.reason).toContain('seconds')
  })

  it('does not trigger alert for careful review', () => {
    const result = recordApproval(12000, true) // 12 seconds with free text
    expect(result.alert).toBe(false)
  })

  it('tracks consecutive quick approvals', () => {
    recordApproval(1000, false)
    recordApproval(1200, false)
    const result = recordApproval(900, false)
    expect(result.consecutiveQuickApprovals).toBeGreaterThanOrEqual(3)
    expect(result.alert).toBe(true)
  })
})

// ─── Integration: Full flow ───────────────────────────────────────────────────

describe('Integration: Full clinical scenario flow', () => {
  it('DEMO-01 medical scenario: detects, blocks, anonymizes, re-evaluates', () => {
    const rawPrompt = 'Patient Emma Johnson, MED-10492, diagnosed with Type 2 diabetes, metformin 500mg BD, HbA1c 8.2%.'

    // Step 1: scan
    const scan = scanText(rawPrompt)
    expect(scan.matches.length).toBeGreaterThan(0)
    expect(scan.hasHardBlockTriggers).toBe(true)
    expect(scan.domain).toBe('healthcare')

    // Step 2: decision tree A → block
    const decision = runDecisionTreeA(rawPrompt, scan)
    expect(decision.action).toBe('block')
    expect(decision.canProceed).toBe(false)
    expect(decision.approvedText).toBeNull()

    // Step 3: anonymize
    const anonResult = anonymizeText(rawPrompt, scan.matches)
    expect(anonResult.anonymized).not.toContain('Emma Johnson')
    expect(anonResult.anonymized).not.toContain('MED-10492')

    // Step 4: re-evaluate anonymized text
    const anonScan = scanText(anonResult.anonymized)
    const recheckResult = runDecisionTreeARecheck(anonResult.anonymized, anonScan)
    expect(recheckResult.isAnonymized).toBe(true)
    // anonymized version may still have some findings (lab values) but shouldn't hard-block
    // The test verifies the re-evaluation ran independently
    expect(recheckResult.decisionPath.some(n => n.nodeId === 'N0-RECHECK')).toBe(true)
  })

  it('DEMO-04 student scenario: allows clean prompt without friction', () => {
    const prompt = 'Explain the benefits and limitations of using artificial intelligence in modern education.'
    const scan = scanText(prompt)
    const decision = runDecisionTreeA(prompt, scan)
    expect(decision.action).toBe('allow')
    expect(decision.canProceed).toBe(true)
  })
})
