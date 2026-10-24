import { useNavigate } from 'react-router-dom'
import { Shield, Brain, GitBranch, ChevronRight, AlertTriangle, CheckCircle, FlaskConical, BookOpen, Zap } from 'lucide-react'
import { DEMO_SCENARIOS } from '../data/demoScenarios'
import { getTrustScore, getTrustLevel } from '../engine/TrustScore'

export default function HomePage() {
  const navigate = useNavigate()
  const trustScore = getTrustScore()
  const trustLevel = getTrustLevel()

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-20">

      {/* Hero */}
      <section className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#d0e2ff] text-[#002d9c] text-xs font-semibold">
          <FlaskConical className="w-3.5 h-3.5" />
          Responsible AI × IBM Hackathon
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-[#161616] leading-tight tracking-tight">
            ThinkShield AI
          </h1>
          {/* Primary slogan */}
          <p className="text-2xl font-semibold text-[#0f62fe]">
            You are not you when you use AI.
          </p>
          {/* Secondary slogan */}
          <p className="text-lg text-[#525252] max-w-2xl">
            Protect what you share. Question what AI says.
          </p>
          <p className="text-base text-[#525252] max-w-3xl leading-relaxed">
            A responsible AI companion that safeguards sensitive information before it reaches any AI system,
            and strengthens human judgment after AI responds — keeping people in control of their decisions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/workspace')}
            className="btn-primary text-base px-6 py-3"
          >
            Try the Responsible AI Demo
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/tutorial')}
            className="btn-secondary text-base px-6 py-3"
          >
            <BookOpen className="w-4 h-4" />
            How It Works
          </button>
        </div>

        {/* Trust score indicator on homepage */}
        {trustScore !== 50 && (
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-[#6f6f6f]">Your Trust Score:</span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-[#e0e0e0] h-1.5">
                <div className="bg-[#0f62fe] h-1.5 transition-all" style={{ width: `${trustScore}%` }} />
              </div>
              <span className={`text-xs font-semibold ${
                trustLevel === 'expert' ? 'text-[#6929c4]' :
                trustLevel === 'established' ? 'text-[#24a148]' :
                trustLevel === 'building' ? 'text-[#0f62fe]' : 'text-[#8d8d8d]'
              }`}>{trustScore}/100 — {trustLevel}</span>
            </div>
          </div>
        )}
      </section>

      {/* IBM-style divider section */}
      <div className="border-t-4 border-[#0f62fe] pt-8">
        <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-widest mb-6">The Problem</p>
        <div className="grid md:grid-cols-2 gap-px bg-[#e0e0e0]">
          <div className="bg-white p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#da1e28] font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              Accidental Data Exposure
            </div>
            <p className="text-[#525252] text-sm leading-relaxed">
              People share customer names, account numbers, medical records, and confidential strategies
              with AI tools without recognizing the risk. In regulated industries, this has led to
              serious consequences.
            </p>
          </div>
          <div className="bg-white p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#8e4f00] font-semibold text-sm">
              <Brain className="w-4 h-4" />
              Passive AI Acceptance
            </div>
            <p className="text-[#525252] text-sm leading-relaxed">
              Confident-sounding AI answers get accepted without verification. This "falling asleep
              behind the wheel" effect leads to automation bias, skill degradation, and decisions
              made without genuine human judgment.
            </p>
          </div>
        </div>
      </div>

      {/* Three Dimensions */}
      <section className="space-y-6">
        <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-widest">Three Dimensions</p>
        <div className="grid md:grid-cols-3 gap-px bg-[#e0e0e0]">
          {[
            {
              num: '01',
              title: 'Keep Humans Mentally Engaged',
              desc: 'Prevent cognitive offloading. Design interactions that require active reasoning — not just approval clicks.',
              color: '#0f62fe',
            },
            {
              num: '02',
              title: 'Prevent Skill Degradation',
              desc: 'AI should support learning and expertise transfer — not silently replace the skills that make professionals effective.',
              color: '#6929c4',
            },
            {
              num: '03',
              title: 'Build Trustworthy AI',
              desc: 'Make AI transparent. Show what was processed, what was assumed, and what was missed. Enable humans to verify.',
              color: '#24a148',
            },
          ].map(d => (
            <div key={d.num} className="bg-white p-6 space-y-3">
              <div className="text-4xl font-black" style={{ color: d.color, opacity: 0.15 }}>{d.num}</div>
              <div className="w-8 h-0.5" style={{ background: d.color }} />
              <h3 className="font-semibold text-[#161616] text-sm">{d.title}</h3>
              <p className="text-[#525252] text-sm leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two modules */}
      <section className="space-y-6">
        <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-widest">Two Integrated Modules</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0f62fe] flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#161616] text-sm">Privacy Guardian</h3>
                <p className="text-xs text-[#6f6f6f]">Runs before any prompt is submitted</p>
              </div>
            </div>
            <ul className="space-y-2">
              {[
                'Detects sensitive data locally in the browser',
                'Applies domain-specific policies (banking, healthcare, legal)',
                'Blocks high-risk content — consent cannot override hard blocks',
                'Suggests anonymization with re-identification warnings',
                'AI Mirror asks: "Did you mean to share that?"',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#525252]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#24a148] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#6929c4] flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#161616] text-sm">Critical Thinking Coach</h3>
                <p className="text-xs text-[#6f6f6f]">Runs after AI responds</p>
              </div>
            </div>
            <ul className="space-y-2">
              {[
                'Asks domain-specific reasoning questions',
                'Accept button locked until meaningful engagement',
                'Skill Degradation Alert for rapid uncritical approvals',
                'AI Mirror asks: "What would you verify first?"',
                'Human Decision step — you remain responsible',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#525252]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6929c4] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Demo scenarios */}
      <section className="space-y-6">
        <p className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-widest">Demo Scenarios</p>
        <p className="text-xs text-[#6f6f6f]">All data is entirely synthetic. No real personal or financial information is used anywhere.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#e0e0e0]">
          {DEMO_SCENARIOS.map(scenario => (
            <button
              key={scenario.scenarioId}
              onClick={() => navigate(`/workspace?scenario=${scenario.scenarioId}`)}
              className="bg-white p-5 text-left space-y-3 hover:bg-[#edf5ff] transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 ${
                  scenario.domain === 'healthcare' ? 'bg-[#d0e2ff] text-[#002d9c]' :
                  scenario.domain === 'banking' ? 'bg-[#defbe6] text-[#044317]' :
                  scenario.domain === 'legal' ? 'bg-[#e8daff] text-[#491d8b]' :
                  'bg-[#e0e0e0] text-[#393939]'
                }`}>
                  {scenario.domain}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 ${
                  scenario.expectedAction === 'block' ? 'bg-[#fff1f1] text-[#a2191f]' :
                  scenario.expectedAction === 'escalate' ? 'bg-[#f6f2c0] text-[#8e4f00]' :
                  'bg-[#defbe6] text-[#044317]'
                }`}>
                  {scenario.expectedAction}
                </span>
              </div>
              <h3 className="font-semibold text-[#161616] text-sm group-hover:text-[#0f62fe] transition-colors">
                {scenario.title}
              </h3>
              <p className="text-xs text-[#6f6f6f] leading-relaxed">{scenario.description}</p>
              <div className="flex items-center gap-1 text-xs text-[#0f62fe] font-medium">
                Try scenario <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Decision Engine teaser — IBM dark panel */}
      <section className="bg-[#161616] p-8 space-y-4">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-[#4589ff]" />
          <h2 className="text-lg font-semibold text-white">Transparent Decision Engine</h2>
        </div>
        <p className="text-[#c6c6c6] text-sm max-w-2xl leading-relaxed">
          Every privacy decision is made by a real rule-based decision tree — not a black-box model.
          The Decision Engine shows you exactly which branches were taken, which rules matched,
          and why the system made the decision it did.
        </p>
        <button
          onClick={() => navigate('/decision-engine')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0f62fe] text-white font-semibold text-sm hover:bg-[#0043ce] transition-colors"
        >
          <GitBranch className="w-4 h-4" />
          View Decision Engine
        </button>
      </section>

      {/* Expert mode teaser */}
      <section className="card p-6 flex items-start gap-4">
        <div className="w-8 h-8 bg-[#6929c4] flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-[#161616] text-sm">Expert Mode Available</h3>
          <p className="text-xs text-[#6f6f6f]">
            Build a Trust Score through responsible behavior. At 85/100, Expert Mode unlocks — reducing
            friction for experienced users while keeping essential safeguards active.
            Admins can also authorize Expert Mode directly.
          </p>
          <button onClick={() => navigate('/admin')} className="btn-ghost text-xs px-0 gap-1.5 mt-1">
            View Admin Panel <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </section>

    </div>
  )
}
