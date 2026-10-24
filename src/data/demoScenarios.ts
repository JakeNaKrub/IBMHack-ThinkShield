import type { DemoScenario } from '../types'

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    scenarioId: 'DEMO-01',
    title: 'Doctor: Patient Clinical Notes',
    description: 'A doctor attempts to summarize identifiable patient clinical notes for medication adjustment advice. Demonstrates healthcare policy blocking and conservative anonymization.',
    domain: 'healthcare',
    mode: 'both',
    preloadedPrompt: 'Summarize clinical notes for patient Emma Johnson, born 14 March 1982, patient ID MED-10492, who has been diagnosed with Type 2 diabetes and is currently taking metformin 500mg twice daily. Her most recent HbA1c is 8.2%. What medication adjustment should I consider?',
    expectedAction: 'block',
    tags: ['healthcare', 'patient-data', 'medication', 'primary-demo'],
  },
  {
    scenarioId: 'DEMO-02',
    title: 'Banking Employee: Customer Account Data',
    description: 'A banking employee accidentally attempts to share a fictional customer\'s account number and balance with an AI tool.',
    domain: 'banking',
    mode: 'manual',
    preloadedPrompt: 'Write a professional email to customer Jane Smith regarding her account number 12345678 and her current balance of €24,500. She has been with us for 10 years.',
    expectedAction: 'block',
    tags: ['banking', 'financial-data', 'customer-info'],
  },
  {
    scenarioId: 'DEMO-03',
    title: 'Lawyer: Confidential Client Strategy',
    description: 'A lawyer enters confidential client information related to a legal dispute.',
    domain: 'legal',
    mode: 'manual',
    preloadedPrompt: 'Analyze this confidential legal strategy for client John Doe concerning an ongoing acquisition dispute with their main competitor. The settlement offer is currently €2.5M but we believe the claim is worth significantly more.',
    expectedAction: 'escalate',
    tags: ['legal', 'confidential', 'privilege'],
  },
  {
    scenarioId: 'DEMO-04',
    title: 'Student: Educational Question',
    description: 'A student asks a harmless educational question. Demonstrates low-friction flow and Critical Thinking Coach for general use.',
    domain: 'general',
    mode: 'manual',
    preloadedPrompt: 'Explain the benefits and limitations of using artificial intelligence in modern education.',
    expectedAction: 'allow',
    tags: ['general', 'education', 'low-risk'],
  },
  {
    scenarioId: 'DEMO-05',
    title: 'Overconfident AI Recommendation',
    description: 'An AI response contains strong, poorly-supported financial recommendations. Demonstrates automation bias and the Critical Thinking Coach.',
    domain: 'general',
    mode: 'manual',
    preloadedPrompt: 'Should I invest in renewable energy stocks right now? I have €50,000 available.',
    expectedAction: 'allow',
    tags: ['general', 'overconfidence', 'automation-bias', 'thinking-coach'],
  },
]

export function getScenario(scenarioId: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find(s => s.scenarioId === scenarioId)
}
