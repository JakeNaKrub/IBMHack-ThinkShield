import type {
  AIResponse,
  Domain,
  CriticalThinkingDecisionResult,
  CriticalThinkingActivity,
  CriticalThinkingQuestion,
  DecisionNode,
} from '../types'

// ─── Simulated AI Responses ───────────────────────────────────────────────────

const DEMO_RESPONSES: Record<string, Omit<AIResponse, 'responseId' | 'promptUsed' | 'timestamp'>> = {
  diabetes_medication: {
    content: `Based on the clinical information provided, here are general considerations for metformin dose adjustment in Type 2 diabetes management:

**Current situation:** A patient on metformin 500mg twice daily with an HbA1c of 8.2% is above the typical target range of below 7.0% (ADA guidelines) or below 6.5% (some guidelines for specific populations).

**General considerations for dose adjustment:**
1. **Dose increase:** Metformin can typically be increased to 1000mg twice daily if tolerated. This is a common next step when glycaemic control is inadequate.
2. **Renal function check:** Before any dose increase, creatinine and eGFR should be assessed. Metformin is contraindicated or requires dose reduction with eGFR < 30 mL/min/1.73m².
3. **GI tolerance:** Metformin is commonly associated with GI side effects. Extended-release formulations may improve tolerability.
4. **Combination therapy:** If HbA1c remains above target after dose optimisation, addition of a second agent (e.g., SGLT-2 inhibitor, GLP-1 agonist) may be considered per current guidelines.

**Important:** These are general educational considerations. Any clinical decision must be made by the treating physician with full knowledge of the individual patient's history, comorbidities, and current medications.`,
    isSimulated: true,
    simulationNote: '⚠️ This is a simulated educational response. It is not clinical advice. Real clinical decisions require a qualified physician with full patient context.',
    verifiableClaims: [
      'HbA1c target below 7.0% (ADA guidelines)',
      'Metformin contraindicated with eGFR < 30 mL/min/1.73m²',
      'Metformin can be increased to 1000mg twice daily',
      'GI side effects are common with metformin',
    ],
    domain: 'healthcare',
  },

  clinical_general: {
    content: `Here is a general educational summary of Type 2 diabetes management considerations:

**Overview:** Type 2 diabetes is a metabolic condition characterised by insulin resistance and relative insulin deficiency. Management aims to achieve glycaemic control while minimising complications.

**Key management pillars:**
1. **Lifestyle modifications:** Physical activity, dietary changes, and weight management remain foundational.
2. **Pharmacological therapy:** Metformin is typically first-line. Additional agents are considered based on individual factors including cardiovascular risk, renal function, and patient preference.
3. **Monitoring:** Regular HbA1c monitoring (typically every 3-6 months), renal function tests, and cardiovascular risk assessment.
4. **Target individualisation:** Glycaemic targets should be individualised — stricter targets for younger, healthier patients; more lenient for elderly or those with significant comorbidities.

**Note:** This is a general educational summary. Clinical management must always be guided by current evidence-based guidelines and individualised to the patient by a qualified healthcare professional.`,
    isSimulated: true,
    simulationNote: '⚠️ This is a simulated educational response. It is not clinical advice.',
    verifiableClaims: [
      'Metformin is typically first-line for Type 2 diabetes',
      'HbA1c monitoring every 3-6 months is standard',
      'Lifestyle modifications are foundational treatment',
    ],
    domain: 'healthcare',
  },

  education_ai: {
    content: `Artificial intelligence offers significant potential in education, but also raises important concerns.

**Potential benefits:**
- Personalised learning pathways adapted to individual student needs and pace
- Immediate feedback on exercises and assessments
- Automated administrative tasks freeing teachers for higher-value interactions
- Accessibility improvements for students with diverse learning needs
- Early identification of students who may need additional support

**Potential limitations and risks:**
- Algorithmic bias may disadvantage certain student groups
- Overreliance on AI may reduce development of critical thinking and problem-solving skills
- Privacy concerns around student data collection
- Risk of deepening the digital divide in under-resourced settings
- AI-generated content may contain errors or oversimplifications

**Key principle:** AI should augment, not replace, human educators. The quality of education depends fundamentally on human relationships, mentorship, and the development of independent thinking skills.`,
    isSimulated: true,
    simulationNote: '⚠️ This is a simulated educational response.',
    verifiableClaims: [
      'AI personalises learning pathways',
      'Algorithmic bias may disadvantage certain student groups',
      'AI frees teachers for higher-value interactions',
    ],
    domain: 'general',
  },

  overconfident_investment: {
    content: `Based on current market trends, **I strongly recommend** investing in renewable energy ETFs. The sector has shown consistent 15-20% annual returns over the past 3 years, and regulatory tailwinds from the EU Green Deal virtually guarantee continued growth.

Specifically, consider allocating 60% of your portfolio to solar energy stocks, as solar has definitively overtaken fossil fuels as the primary global energy source. The transition is irreversible, and any investment in traditional energy is now considered high-risk by most financial analysts.

**My recommendation:** Allocate at least €50,000 to renewable energy within the next 30 days to maximise your position before the expected Q1 surge.`,
    isSimulated: true,
    simulationNote: '⚠️ This is a deliberately overconfident simulated response designed to demonstrate critical thinking challenges. It is NOT financial advice.',
    verifiableClaims: [
      '15-20% annual returns in renewable energy ETFs',
      'Solar has definitively overtaken fossil fuels globally',
      'EU Green Deal "virtually guarantees" continued growth',
      'Most financial analysts consider traditional energy high-risk',
    ],
    domain: 'general',
  },
}

// ─── Response selector ────────────────────────────────────────────────────────

let responseCounter = 0

export function generateDemoResponse(approvedPrompt: string, domain: Domain): AIResponse {
  const lower = approvedPrompt.toLowerCase()
  let key = 'clinical_general'

  if (domain === 'healthcare') {
    if (lower.includes('hba1c') || lower.includes('metformin') || lower.includes('medication adjustment')) {
      key = 'diabetes_medication'
    } else {
      key = 'clinical_general'
    }
  } else if (lower.includes('education') || lower.includes('artificial intelligence in')) {
    key = 'education_ai'
  } else if (lower.includes('invest') || lower.includes('portfolio') || lower.includes('financial')) {
    key = 'overconfident_investment'
  }

  const base = DEMO_RESPONSES[key] ?? DEMO_RESPONSES.clinical_general

  return {
    ...base,
    responseId: `RESP-${String(++responseCounter).padStart(4, '0')}`,
    promptUsed: approvedPrompt,
    timestamp: Date.now(),
  }
}

// ─── Critical Thinking Decision Tree B ────────────────────────────────────────

const MEDICAL_QUESTIONS: CriticalThinkingQuestion[] = [
  {
    questionId: 'MED-Q1',
    text: 'What contraindications to this medication should be checked before acting on this recommendation?',
    activityType: 'spot_claim',
    isHighStakes: true,
    hints: ['Consider renal function (eGFR), gastrointestinal conditions, drug interactions.'],
    requiresFreeText: true,
  },
  {
    questionId: 'MED-Q2',
    text: 'What patient-specific information did the AI NOT consider in its recommendation?',
    activityType: 'challenge_answer',
    isHighStakes: true,
    hints: ['Think about: comorbidities, current medications, patient age, lifestyle factors, patient preferences.'],
    requiresFreeText: true,
  },
  {
    questionId: 'MED-Q3',
    text: 'How would you independently verify this recommendation before applying it to a patient?',
    activityType: 'verification_plan',
    isHighStakes: true,
    options: [
      'Consult current ADA or EASD clinical guidelines',
      'Review the patient\'s full medication list and renal function',
      'Discuss with a specialist or clinical pharmacist',
      'Check the hospital formulary and local prescribing guidelines',
      'Apply the recommendation immediately — the AI is reliable',
    ],
    requiresFreeText: false,
  },
  {
    questionId: 'MED-Q4',
    text: 'Write one reason this recommendation might NOT be appropriate for a specific patient.',
    activityType: 'challenge_answer',
    isHighStakes: true,
    hints: ['Examples: renal impairment, pregnancy, specific drug interactions, patient intolerance.'],
    requiresFreeText: true,
  },
  {
    questionId: 'MED-Q5',
    text: 'Which claim in this response would you verify against an official clinical guideline?',
    activityType: 'spot_claim',
    isHighStakes: true,
    requiresFreeText: true,
  },
]

const GENERAL_QUESTIONS: CriticalThinkingQuestion[] = [
  {
    questionId: 'GEN-Q1',
    text: 'What is one assumption this answer makes that might not hold in all contexts?',
    activityType: 'spot_claim',
    isHighStakes: false,
    requiresFreeText: true,
  },
  {
    questionId: 'GEN-Q2',
    text: 'Which statement in this response would you verify before using it professionally?',
    activityType: 'spot_claim',
    isHighStakes: false,
    requiresFreeText: true,
  },
  {
    questionId: 'GEN-Q3',
    text: 'How would you independently verify the key claims in this response?',
    activityType: 'verification_plan',
    isHighStakes: false,
    options: [
      'Check official primary sources or published research',
      'Compare with at least two independent reliable sources',
      'Ask a qualified domain expert',
      'Test the recommendation against known examples',
      'Accept the response as-is — AI is generally reliable',
    ],
    requiresFreeText: false,
  },
  {
    questionId: 'GEN-Q4',
    text: 'Write a brief counterargument or limitation to the main recommendation.',
    activityType: 'challenge_answer',
    isHighStakes: false,
    requiresFreeText: true,
  },
]

const OVERCONFIDENT_QUESTIONS: CriticalThinkingQuestion[] = [
  {
    questionId: 'OC-Q1',
    text: 'The response states "15-20% annual returns" and growth is "virtually guaranteed." What kind of evidence would be needed to support these claims?',
    activityType: 'spot_claim',
    isHighStakes: true,
    hints: ['Consider: past performance vs future results, statistical ranges, source of the figures.'],
    requiresFreeText: true,
  },
  {
    questionId: 'OC-Q2',
    text: 'What is missing from this financial recommendation that a qualified advisor would always include?',
    activityType: 'challenge_answer',
    isHighStakes: true,
    hints: ['Think about: individual risk tolerance, investment horizon, diversification, regulatory disclaimers.'],
    requiresFreeText: true,
  },
  {
    questionId: 'OC-Q3',
    text: 'How would you verify this investment recommendation before acting on it?',
    activityType: 'verification_plan',
    isHighStakes: true,
    options: [
      'Consult a qualified financial advisor',
      'Check historical fund data from a regulated source',
      'Review multiple independent analyst reports',
      'Follow the recommendation immediately — it sounds confident',
      'Review EU MiFID II investor protections',
    ],
    requiresFreeText: false,
  },
]

function selectQuestions(aiResponse: AIResponse): CriticalThinkingQuestion[] {
  if (aiResponse.responseId && DEMO_RESPONSES.overconfident_investment &&
    aiResponse.content.includes('strongly recommend') && aiResponse.content.includes('annual returns')) {
    return OVERCONFIDENT_QUESTIONS
  }
  if (aiResponse.domain === 'healthcare') return MEDICAL_QUESTIONS
  return GENERAL_QUESTIONS
}

function buildCTDecisionPath(
  isHighStakes: boolean,
  hasVerifiableClaims: boolean,
): DecisionNode[] {
  const path: DecisionNode[] = []

  path.push({
    nodeId: 'CT-N1',
    question: 'Is this a high-stakes domain?',
    outcome: null,
    explanation: isHighStakes
      ? 'Yes — healthcare, financial, or legal domain detected. Additional verification steps are required.'
      : 'No — general domain. Standard critical thinking evaluation applies.',
    branch: 'taken',
    color: isHighStakes ? 'amber' : 'green',
  })

  path.push({
    nodeId: 'CT-N2',
    question: 'Does the response contain verifiable claims?',
    outcome: null,
    explanation: hasVerifiableClaims
      ? `Yes — ${hasVerifiableClaims} verifiable claims identified. User must engage with at least one.`
      : 'No specific verifiable claims flagged. General reflection activities apply.',
    branch: 'taken',
    color: hasVerifiableClaims ? 'amber' : 'green',
  })

  path.push({
    nodeId: 'CT-N3',
    question: 'What critical thinking activities are required?',
    outcome: null,
    explanation: isHighStakes
      ? 'High-stakes domain: minimum 2 activities required before human decision is enabled.'
      : 'Standard domain: minimum 1 activity required.',
    branch: 'taken',
    color: 'blue',
  })

  return path
}

export function runDecisionTreeB(aiResponse: AIResponse): CriticalThinkingDecisionResult {
  const isHighStakes = aiResponse.domain === 'healthcare' ||
    aiResponse.content.toLowerCase().includes('invest') ||
    aiResponse.content.toLowerCase().includes('recommend')

  const hasVerifiableClaims = aiResponse.verifiableClaims.length > 0

  const questions = selectQuestions(aiResponse)
  const requiredCount = isHighStakes ? 2 : 1

  const activities: CriticalThinkingActivity[] = [
    {
      activityId: 'ACT-1',
      type: 'spot_claim',
      title: 'Spot the Unsupported Claim',
      description: 'Identify a claim in the AI response that requires verification or additional evidence.',
      questions: questions.filter(q => q.activityType === 'spot_claim').slice(0, 1),
      completed: false,
      userResponses: {},
    },
    {
      activityId: 'ACT-2',
      type: 'challenge_answer',
      title: 'Challenge the Answer',
      description: 'Write a counterargument, limitation, or patient-specific consideration the AI did not account for.',
      questions: questions.filter(q => q.activityType === 'challenge_answer').slice(0, 1),
      completed: false,
      userResponses: {},
    },
    {
      activityId: 'ACT-3',
      type: 'verification_plan',
      title: 'Create a Verification Plan',
      description: 'Select or describe how you would verify this AI response before acting on it.',
      questions: questions.filter(q => q.activityType === 'verification_plan').slice(0, 1),
      completed: false,
      userResponses: {},
    },
  ]

  return {
    isHighStakesDomain: isHighStakes,
    hasVerifiableClaims,
    claimsToChallenge: aiResponse.verifiableClaims,
    activities,
    decisionPath: buildCTDecisionPath(isHighStakes, hasVerifiableClaims),
    requiredActivitiesCount: requiredCount,
    completedActivitiesCount: 0,
    canProceedToDecision: false,
  }
}
