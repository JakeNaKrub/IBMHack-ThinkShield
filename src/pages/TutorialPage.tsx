import { useState } from 'react'
import { BookOpen, Shield, Brain, GitBranch, ChevronRight, CheckCircle, Zap, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    id: 1,
    icon: <Shield className="w-5 h-5 text-white" />,
    color: '#0f62fe',
    title: 'Write or load a prompt',
    description: 'Go to the Workspace and type a query — or load one of the 5 demo scenarios. You can also switch to Agent Oversight mode to see how autonomous AI agents work.',
    tip: 'Try loading "Doctor: Patient Clinical Notes" or "Banking Employee: Account Data" for the most dramatic demonstration.',
    cta: 'Open Workspace',
    path: '/workspace',
  },
  {
    id: 2,
    icon: <Shield className="w-5 h-5 text-white" />,
    color: '#da1e28',
    title: 'Privacy Guardian scans your prompt',
    description: 'Click "Check My Prompt". ThinkShield scans locally in your browser — nothing is sent anywhere. Sensitive data is highlighted and categorized.',
    tip: 'The scanner detects names, IDs, financial data, diagnoses, credentials, and custom keywords you configure. Red highlights = high risk.',
    cta: null,
    path: null,
  },
  {
    id: 3,
    icon: <Eye className="w-5 h-5 text-white" />,
    color: '#f1c21b',
    title: 'AI Mirror asks "Did you mean to share that?"',
    description: 'A conversational prompt appears alongside the warning. The AI Mirror is not a blocker — it\'s a reflective pause that encourages conscious decision-making.',
    tip: 'High-risk content is blocked regardless. For medium-risk, the Mirror asks you to reflect before proceeding.',
    cta: null,
    path: null,
  },
  {
    id: 4,
    icon: <CheckCircle className="w-5 h-5 text-white" />,
    color: '#24a148',
    title: 'Review and approve the anonymized version',
    description: 'ThinkShield suggests a privacy-safe rewrite. You can edit it. The anonymized version is re-scanned — a prior approval does not carry over.',
    tip: 'Watch for re-identification warnings: even after removing a name, combinations of age, diagnosis, and dates can still identify someone.',
    cta: null,
    path: null,
  },
  {
    id: 5,
    icon: <Brain className="w-5 h-5 text-white" />,
    color: '#6929c4',
    title: '"Before you trust this answer…" — Think Critically',
    description: 'After the AI responds, the Critical Thinking Coach activates. You must complete at least one activity before the Accept button enables. Activities include: spotting unsupported claims, writing counterarguments, and creating a verification plan.',
    tip: 'The Accept button stays locked until you write something meaningful (10+ characters). Just clicking "Submit" without a response won\'t work.',
    cta: null,
    path: null,
  },
  {
    id: 6,
    icon: <CheckCircle className="w-5 h-5 text-white" />,
    color: '#161616',
    title: 'Record your decision — you remain responsible',
    description: 'The final step shows a checklist. ThinkShield never claims the AI response is verified or correct. You check the boxes and record your decision: accept, revise, or mark for verification.',
    tip: 'High-stakes domains (healthcare, finance, legal) require 2 completed activities before you can proceed.',
    cta: null,
    path: null,
  },
  {
    id: 7,
    icon: <GitBranch className="w-5 h-5 text-white" />,
    color: '#009d9a',
    title: 'See the Decision Engine',
    description: 'The Decision Engine page shows you the exact path the system took — which rules fired, which branches were taken, and why each decision was made. Every node links to a real rule ID.',
    tip: 'Select a scenario first, then click any node in the tree to see its rule explanation.',
    cta: 'Open Decision Engine',
    path: '/decision-engine',
  },
  {
    id: 8,
    icon: <Zap className="w-5 h-5 text-white" />,
    color: '#6929c4',
    title: 'Build your Trust Score over time',
    description: 'Every responsible action you take (anonymizing prompts, completing checkpoints, writing verification plans) increases your Trust Score. At 85/100, Expert Mode unlocks — reducing friction for experienced users.',
    tip: 'Check the Admin Panel to see your score, behavioral history, and activate Expert Mode.',
    cta: 'Open Admin Panel',
    path: '/admin',
  },
]

export default function TutorialPage() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#0f62fe]" />
          <h1 className="text-2xl font-bold text-[#161616]">How to Use ThinkShield AI</h1>
        </div>
        <p className="text-[#525252] text-sm">
          A step-by-step guide to the full responsible AI workflow.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {STEPS.map((step, _idx) => {
          const isActive = activeStep === step.id
          return (
            <div key={step.id}>
              <button
                onClick={() => setActiveStep(isActive ? null : step.id)}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                className="w-full flex items-start gap-4 p-5 bg-white border-b border-[#e0e0e0] hover:bg-[#f4f4f4] transition-colors text-left group"
              >
                {/* Step number + icon */}
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: step.color }}
                  >
                    {step.id}
                  </div>
                </div>

                <div className="flex-1 space-y-0.5">
                  <p className="font-semibold text-[#161616] text-sm group-hover:text-[#0f62fe] transition-colors">
                    {step.title}
                  </p>
                  <p className="text-xs text-[#6f6f6f]">{step.description.substring(0, 80)}…</p>
                </div>

                <ChevronRight className={`w-4 h-4 text-[#8d8d8d] shrink-0 mt-1 transition-transform ${isActive ? 'rotate-90' : ''}`} />
              </button>

              {/* Expanded detail */}
              {isActive && (
                <div className="bg-[#edf5ff] border-b border-[#0f62fe] px-5 py-4 space-y-3">
                  <p className="text-sm text-[#161616] leading-relaxed">{step.description}</p>
                  <div className="flex items-start gap-2 p-3 bg-[#f6f2c0] border-l-4 border-[#f1c21b]">
                    <span className="text-xs font-bold text-[#8e4f00] shrink-0">TIP</span>
                    <p className="text-xs text-[#8e4f00]">{step.tip}</p>
                  </div>
                  {step.cta && step.path && (
                    <button
                      onClick={() => navigate(step.path!)}
                      className="btn-primary text-xs"
                    >
                      {step.cta} <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ section */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-widest">Frequently Asked Questions</p>
        {[
          {
            q: 'Is any of my data sent to a server?',
            a: 'No. All privacy scanning runs locally in your browser. No text is transmitted to any external service. The demo AI responses are prebuilt — nothing leaves your device.',
          },
          {
            q: 'What does the Accept button being "locked" mean?',
            a: 'After the AI responds, the Accept button is disabled until you complete at least one Critical Thinking activity. For high-stakes domains (healthcare, finance, legal), two activities are required. This prevents passive acceptance of AI output.',
          },
          {
            q: 'Can I bypass the privacy blocks?',
            a: 'Hard blocks cannot be bypassed — not by clicking "I agree", not by switching screens, not by editing the UI. You must remove or adequately sanitize the blocked content, then re-run the check.',
          },
          {
            q: 'What is the Trust Score?',
            a: 'A persistent score (0–100) that tracks how responsibly you behave over time. It increases when you anonymize prompts, complete checkpoints, and create verification plans. It decreases when you approve things too quickly or repeatedly try to submit flagged content.',
          },
          {
            q: 'What is Expert Mode?',
            a: 'Expert Mode reduces friction for experienced users — shorter checkpoints, compact warnings instead of full blocking flows. It unlocks at Trust Score ≥ 85, or can be activated by an admin regardless of score. Hard-block rules always remain enforced.',
          },
          {
            q: 'What is the AI Mirror?',
            a: 'The AI Mirror is a conversational prompt that appears alongside privacy warnings. Instead of just showing a red alert, it asks "Did you mean to share that information?" — making the interaction feel reflective rather than punitive. After the AI responds, it asks "What would you verify first?"',
          },
          {
            q: 'Are the AI responses real?',
            a: 'No. All AI responses in this prototype are prebuilt simulations, clearly labeled as such. No real AI API is used. This means the app works fully offline without any API keys.',
          },
        ].map(({ q, a }) => (
          <div key={q} className="card">
            <details className="group">
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-[#f4f4f4] transition-colors">
                <span className="font-semibold text-[#161616] text-sm">{q}</span>
                <ChevronRight className="w-4 h-4 text-[#8d8d8d] group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-4 pb-4 pt-0 text-sm text-[#525252] leading-relaxed border-t border-[#e0e0e0]">
                {a}
              </div>
            </details>
          </div>
        ))}
      </div>

      <div className="bg-[#161616] p-6 space-y-3">
        <p className="text-white font-semibold text-sm">Ready to try it?</p>
        <p className="text-[#c6c6c6] text-xs">Load the banking or healthcare demo scenario for the most complete demonstration of all features.</p>
        <button onClick={() => navigate('/workspace')} className="btn-primary">
          Open Workspace <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
