import { Shield, Brain, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-[#161616]">About ThinkShield AI</h1>
        <p className="text-[#6f6f6f] mt-2 text-sm">Responsible AI × IBM Hackathon Prototype</p>
      </div>

      {/* What it is */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#161616]">What Is ThinkShield AI?</h2>
        <p className="text-[#525252] text-sm leading-relaxed">
          ThinkShield AI is a responsible AI companion that operates at both ends of any AI interaction.
          It protects what users share before AI processes it, and strengthens human judgment after AI responds.
          It is domain-agnostic — the same system applies to banking, healthcare, legal, and general use cases.
        </p>
        <p className="text-[#525252] text-sm leading-relaxed">
          The core insight: most AI safety tools focus on controlling AI behavior. ThinkShield also focuses
          on helping humans behave responsibly <em>around</em> AI — protecting their data, preserving their
          skills, and keeping them genuinely in control of their decisions.
        </p>
      </section>

      {/* Mission */}
      <section className="bg-[#161616] p-6 space-y-3">
        <p className="text-[#4589ff] text-xs font-semibold uppercase tracking-widest">Mission</p>
        <blockquote className="text-xl font-semibold text-white leading-relaxed">
          "You are not you when you use AI."
        </blockquote>
        <p className="text-[#c6c6c6] text-sm">
          AI should amplify human intelligence — not quietly replace independent thinking,
          professional judgment, or personal responsibility.
        </p>
      </section>

      {/* Three dimensions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#161616]">Three Dimensions Addressed</h2>
        <div className="space-y-3">
          {[
            {
              icon: <Brain className="w-5 h-5 text-[#0f62fe]" />,
              title: 'Keep Humans Mentally Engaged',
              desc: 'The Critical Thinking Coach requires domain-specific written responses before the Accept button enables. The AI Mirror prompts reflection at key moments. Rapid approvals without engagement trigger a Skill Degradation Alert.',
            },
            {
              icon: <Clock className="w-5 h-5 text-[#f1c21b]" />,
              title: 'Prevent Skill Degradation',
              desc: 'The Skill Degradation Monitor tracks approval timing and frequency. Expert Mode unlocks only after building a Trust Score through demonstrated responsible behavior — not just through seniority or self-declaration.',
            },
            {
              icon: <Shield className="w-5 h-5 text-[#24a148]" />,
              title: 'Build Trustworthy AI',
              desc: 'The Agent Transparency Card shows exactly what an autonomous agent processed, what it used as sources, and what it missed. Privacy decisions are traceable to specific rule IDs. The Decision Engine shows the exact path taken.',
            },
          ].map(d => (
            <div key={d.title} className="card p-4 flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{d.icon}</div>
              <div>
                <p className="font-semibold text-[#161616] text-sm">{d.title}</p>
                <p className="text-[#525252] text-sm mt-0.5 leading-relaxed">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#161616]">Architecture</h2>
        <div className="card p-5 space-y-2 bg-[#f4f4f4]">
          {[
            'PrivacyScanner       — Regex + heuristic detection (local, browser-only)',
            'PolicyEngine         — Declarative domain policies (Healthcare, Banking, Legal, General)',
            'DecisionTreeEngine   — Rule-based decision trees A (input) + B (output)',
            'AnonymizationEngine  — Placeholder replacement + re-identification warnings',
            'AnonymizationValidator — Mandatory re-scan after anonymization',
            'DemoAIProvider       — Simulated responses + Critical Thinking question banks',
            'AgentSimulator       — Autonomous agent simulation + Transparency Card',
            'SkillDegradationMonitor — Approval timing + alert thresholds',
            'TrustScore           — Persistent behavioral analytics (localStorage)',
            'CustomKeywords       — User-defined terms to flag (localStorage)',
            'SessionMetrics       — In-memory session counts, no raw text stored',
            'AIMirror             — Conversational reflection prompts alongside warnings',
          ].map(line => (
            <div key={line} className="font-mono text-xs text-[#525252]">{line}</div>
          ))}
        </div>
        <p className="text-sm text-[#525252]">
          The decision trees are not decorative. The same structured node objects that the engine executes
          are passed directly to the visualizer — so what you see on the Decision Engine page reflects exactly
          what the rules computed.
        </p>
      </section>

      {/* Limitations */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#161616]">Honest Limitations</h2>
        <div className="card p-5 space-y-3 border-l-4 border-[#f1c21b] bg-[#f6f2c0]">
          {[
            'Detection is heuristic — not 100% accurate. The scanner may miss things or occasionally over-flag.',
            'Anonymization does not guarantee GDPR, HIPAA, or any other regulatory compliance.',
            'AI responses are entirely simulated. They are not generated by a real AI system.',
            'The Skill Degradation Monitor measures approval timing — not cognitive state or actual attention.',
            'Trust Score measures observable behavior — not competence, intelligence, or actual trustworthiness.',
            'No real EHR, banking, or legal system integration. All examples use entirely synthetic fictional data.',
            'No backend, no persistent server storage, no authentication beyond the demo PIN.',
            'This application is not certified, not legally compliant, and not enterprise-security validated.',
          ].map((l, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-[#8e4f00]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {l}
            </div>
          ))}
        </div>
      </section>

      {/* Privacy notice */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#161616]">Privacy Notice</h2>
        <div className="card p-5 space-y-2 text-sm text-[#525252]">
          <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#24a148] shrink-0 mt-0.5" /> All privacy scanning runs locally in your browser. No text is sent to any server.</div>
          <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#24a148] shrink-0 mt-0.5" /> Session metrics store only counts and rule IDs — never raw prompts or detected values.</div>
          <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#24a148] shrink-0 mt-0.5" /> Trust Score stores only event types, deltas, and timestamps — never prompt content.</div>
          <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#24a148] shrink-0 mt-0.5" /> No cookies, no trackers, no analytics services.</div>
          <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-[#f1c21b] shrink-0 mt-0.5" /> Do not enter real personal, financial, or patient data into this prototype. Use only synthetic fictional examples.</div>
        </div>
      </section>

      <div className="pt-4 border-t border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-[#6f6f6f]">ThinkShield AI — Hackathon prototype. Not for production use.</span>
        <button onClick={() => navigate('/workspace')} className="btn-primary text-xs py-2">
          Try the Demo
        </button>
      </div>
    </div>
  )
}
