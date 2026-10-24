import { useState } from 'react'
import { GitBranch, Info, Shield, Brain, FlaskConical } from 'lucide-react'
import { scanText } from '../engine/PrivacyScanner'
import { runDecisionTreeA } from '../engine/DecisionTreeEngine'
import { runDecisionTreeB, generateDemoResponse } from '../engine/DemoAIProvider'
import { DEMO_SCENARIOS } from '../data/demoScenarios'
import type { DecisionNode, DecisionResult, CriticalThinkingDecisionResult } from '../types'

// ─── Color helpers ────────────────────────────────────────────────────────────

const COLOR_MAP = {
  green:  { bg: '#defbe6', border: '#24a148', text: '#044317', dot: '#24a148' },
  amber:  { bg: '#f6f2c0', border: '#f1c21b', text: '#8e4f00', dot: '#f1c21b' },
  red:    { bg: '#fff1f1', border: '#da1e28', text: '#a2191f', dot: '#da1e28' },
  blue:   { bg: '#edf5ff', border: '#0f62fe', text: '#002d9c', dot: '#0f62fe' },
  grey:   { bg: '#f4f4f4', border: '#c6c6c6', text: '#525252', dot: '#8d8d8d' },
} as const

function c(color: DecisionNode['color']) {
  return COLOR_MAP[color] ?? COLOR_MAP.grey
}

// ─── Branching Merkle-style Tree ──────────────────────────────────────────────
// Each node may have a YES branch (continued path) and a NO branch (alternate outcome).
// We derive this from the flat decisionPath emitted by the engine.

interface TreeNode {
  node: DecisionNode
  // yes = path taken onward; no = alternate outcome (not taken)
  yes?: TreeNode
  no?: TreeNode
}

/**
 * Build a visual tree from the flat path array.
 * Each node fans into: YES (next node in path) and a NO (alternate outcome sibling).
 * Only the last node has no children.
 */
function buildTree(path: DecisionNode[], altOutcomes: { question: string; color: DecisionNode['color']; explanation: string }[]): TreeNode | null {
  if (path.length === 0) return null

  function build(i: number): TreeNode {
    const node = path[i]
    if (i >= path.length - 1) return { node }

    const yes = build(i + 1)
    // Attach an alternate branch for branching decision nodes (nodes that have no outcome yet — they are checks)
    const isCheck = node.outcome === null
    let no: TreeNode | undefined
    if (isCheck && altOutcomes[i]) {
      const alt = altOutcomes[i]
      no = {
        node: {
          nodeId: `${node.nodeId}-NO`,
          question: alt.question,
          explanation: alt.explanation,
          branch: 'not-taken',
          outcome: null,
          color: alt.color,
        },
      }
    }
    return { node, yes, no }
  }

  return build(0)
}

// ─── Tree Layout & SVG Renderer ───────────────────────────────────────────────

const NODE_W = 180
const NODE_H = 56
const H_GAP = 24   // horizontal gap between sibling subtrees
const V_GAP = 60   // vertical gap between levels

interface FlattenedNode {
  treeNode: TreeNode
  x: number
  y: number
  parentX?: number
  parentY?: number
  edgeLabel?: string
  edgeTaken?: boolean
}

function flatten(
  tree: TreeNode,
  baseX: number,
  depth: number,
  result: FlattenedNode[],
  parentX?: number,
  parentY?: number,
  edgeLabel?: string,
  edgeTaken?: boolean,
): number {
  // Compute the width needed
  const yesWidth = tree.yes ? getWidth(tree.yes) : 0
  const noWidth = tree.no ? getWidth(tree.no) : 0

  let selfX: number
  if (tree.yes && tree.no) {
    selfX = baseX + noWidth + H_GAP / 2 + (yesWidth + noWidth + H_GAP) / 2 - (yesWidth + noWidth + H_GAP) / 2 + noWidth / 2 + H_GAP / 2
    selfX = baseX + noWidth + H_GAP / 2
    selfX = baseX + (noWidth + H_GAP + yesWidth) / 2
  } else if (tree.yes) {
    const yesLeft = baseX + (getWidth(tree.yes) - Math.max(NODE_W, getWidth(tree.yes))) / 2
    selfX = baseX + Math.max(NODE_W, getWidth(tree.yes)) / 2
    void yesLeft
  } else {
    selfX = baseX + NODE_W / 2
  }

  const yPos = depth * (NODE_H + V_GAP)

  result.push({
    treeNode: tree,
    x: selfX,
    y: yPos,
    parentX,
    parentY,
    edgeLabel,
    edgeTaken,
  })

  if (tree.yes && tree.no) {
    const leftX = baseX
    const rightX = baseX + noWidth + H_GAP
    // no (not-taken) on left
    flatten(tree.no, leftX, depth + 1, result, selfX, yPos, 'NO', false)
    // yes (taken) on right
    flatten(tree.yes, rightX, depth + 1, result, selfX, yPos, 'YES', true)
  } else if (tree.yes) {
    const childBaseX = baseX + (Math.max(NODE_W, getWidth(tree.yes)) - getWidth(tree.yes)) / 2
    flatten(tree.yes, childBaseX, depth + 1, result, selfX, yPos, 'YES', true)
  }

  return selfX
}

function getWidth(tree: TreeNode): number {
  if (!tree.yes && !tree.no) return NODE_W
  if (tree.yes && tree.no) return getWidth(tree.yes) + H_GAP + getWidth(tree.no)
  if (tree.yes) return Math.max(NODE_W, getWidth(tree.yes))
  return NODE_W
}

function MerkleTree({
  path,
  label,
  altOutcomes,
  onSelect,
  selected,
}: {
  path: DecisionNode[]
  label: string
  altOutcomes: { question: string; color: DecisionNode['color']; explanation: string }[]
  onSelect: (n: DecisionNode | null) => void
  selected: DecisionNode | null
}) {
  if (path.length === 0) return null

  const tree = buildTree(path, altOutcomes)
  if (!tree) return null

  const totalWidth = getWidth(tree)
  const depth = getDepth(tree)
  const svgW = Math.max(totalWidth + 40, 400)
  const svgH = depth * (NODE_H + V_GAP) + NODE_H + 20

  const nodes: FlattenedNode[] = []
  flatten(tree, 20, 0, nodes)

  return (
    <div className="overflow-x-auto">
      <div className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-widest mb-3 flex items-center gap-1.5">
        {label === 'PRIVACY DECISION' ? <Shield className="w-3 h-3 text-[#0f62fe]" /> : <Brain className="w-3 h-3 text-[#6929c4]" />}
        {label}
      </div>
      <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: svgW }}>
        {/* Edges */}
        {nodes.map((fn, i) => {
          if (fn.parentX === undefined || fn.parentY === undefined) return null
          const x1 = fn.parentX + 20
          const y1 = fn.parentY + NODE_H + 20
          const x2 = fn.x + 20
          const y2 = fn.y + 20
          const midY = (y1 + y2) / 2
          const taken = fn.edgeTaken !== false
          return (
            <g key={`edge-${i}`}>
              <path
                d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                fill="none"
                stroke={taken ? '#0f62fe' : '#c6c6c6'}
                strokeWidth={taken ? 2 : 1.5}
                strokeDasharray={taken ? undefined : '4 3'}
                opacity={taken ? 1 : 0.6}
              />
              {fn.edgeLabel && (
                <text
                  x={(x1 + x2) / 2 + 20}
                  y={midY - 4}
                  fontSize="9"
                  fontWeight="600"
                  fill={taken ? '#0f62fe' : '#8d8d8d'}
                  textAnchor="middle"
                >
                  {fn.edgeLabel}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map((fn, i) => {
          const col = c(fn.treeNode.node.color)
          const notTaken = fn.treeNode.node.branch === 'not-taken'
          const isSelected = selected?.nodeId === fn.treeNode.node.nodeId
          const nodeX = fn.x
          const nodeY = fn.y

          return (
            <g
              key={`node-${i}`}
              style={{ cursor: 'pointer', opacity: notTaken ? 0.55 : 1 }}
              onClick={() => onSelect(isSelected ? null : fn.treeNode.node)}
            >
              <rect
                x={nodeX}
                y={nodeY}
                width={NODE_W}
                height={NODE_H}
                rx={2}
                fill={col.bg}
                stroke={isSelected ? '#0f62fe' : col.border}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {isSelected && (
                <rect
                  x={nodeX - 3}
                  y={nodeY - 3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={4}
                  fill="none"
                  stroke="#d0e2ff"
                  strokeWidth={2}
                />
              )}
              {/* Color dot */}
              <rect x={nodeX + 8} y={nodeY + 8} width={8} height={8} rx={1} fill={col.dot} />
              {/* Question text — wrap manually */}
              <foreignObject x={nodeX + 22} y={nodeY + 4} width={NODE_W - 30} height={NODE_H - 8}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: col.text,
                    lineHeight: '13px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}
                >
                  {fn.treeNode.node.question}
                </div>
              </foreignObject>
              {/* Rule badge */}
              {fn.treeNode.node.ruleId && (
                <text x={nodeX + 8} y={nodeY + NODE_H - 6} fontSize="8" fill={col.text} opacity={0.7}>
                  {fn.treeNode.node.ruleId}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function getDepth(tree: TreeNode): number {
  const yes = tree.yes ? getDepth(tree.yes) : 0
  const no = tree.no ? getDepth(tree.no) : 0
  return 1 + Math.max(yes, no)
}

// ─── Alternate outcome definitions ────────────────────────────────────────────
// These are the "not-taken" branches shown greyed out alongside each check node.

const ALT_OUTCOMES_A: { question: string; color: DecisionNode['color']; explanation: string }[] = [
  // N1: if no sensitive data
  { question: 'No sensitive data → ALLOW immediately', color: 'green', explanation: 'If no sensitive data is found the prompt is allowed without further checks.' },
  // N2: if only low-risk categories
  { question: 'Low-risk only → WARN path', color: 'amber', explanation: 'If only low-risk categories are present, a warning is issued without a block.' },
  // N3: if no matching policy rule
  { question: 'No matching rule → default action', color: 'grey', explanation: 'When no specific policy rule matches, the domain default action applies.' },
  // N3-POLICY: if policy says allow
  { question: 'Policy → ALLOW', color: 'green', explanation: 'If the matched policy permits the action, no further restriction is applied.' },
]

const ALT_OUTCOMES_B: { question: string; color: DecisionNode['color']; explanation: string }[] = [
  // Domain check
  { question: 'Standard domain → fewer activities', color: 'grey', explanation: 'In non-high-stakes domains, fewer critical thinking activities are required.' },
  // Verifiable claims
  { question: 'No verifiable claims → skip claim check', color: 'green', explanation: 'If no verifiable claims are identified, the claim-spotting activity is skipped.' },
  // Challenge
  { question: 'No challenge needed → proceed', color: 'green', explanation: 'If the AI response is low-confidence, a challenge activity is not required.' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DecisionEnginePage() {
  const [selectedScenario, setSelectedScenario] = useState('')
  const [decisionA, setDecisionA] = useState<DecisionResult | null>(null)
  const [decisionB, setDecisionB] = useState<CriticalThinkingDecisionResult | null>(null)
  const [running, setRunning] = useState(false)
  const [selectedNode, setSelectedNode] = useState<DecisionNode | null>(null)

  const runScenario = (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find(s => s.scenarioId === scenarioId)
    if (!scenario) return
    setRunning(true)
    setSelectedScenario(scenarioId)
    setSelectedNode(null)

    setTimeout(() => {
      const scan = scanText(scenario.preloadedPrompt)
      const resultA = runDecisionTreeA(scenario.preloadedPrompt, scan)
      setDecisionA(resultA)
      const aiResp = generateDemoResponse(scenario.preloadedPrompt, scan.domain)
      const resultB = runDecisionTreeB(aiResp)
      setDecisionB(resultB)
      setRunning(false)
    }, 400)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#161616]">Decision Engine</h1>
        <p className="text-[#6f6f6f] mt-1 text-sm">
          Branching decision tree — parent node at top, YES/NO branches fan left and right.
          Greyed-out branches show the path <em>not</em> taken.
        </p>
      </div>

      {/* Scenario selector */}
      <div className="card p-5 space-y-3">
        <p className="text-sm font-semibold text-[#161616]">Select a demo scenario:</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {DEMO_SCENARIOS.map(s => (
            <button
              key={s.scenarioId}
              onClick={() => runScenario(s.scenarioId)}
              className={`text-left p-3 border text-sm transition-all ${
                selectedScenario === s.scenarioId
                  ? 'border-[#0f62fe] bg-[#edf5ff] text-[#002d9c]'
                  : 'border-[#c6c6c6] hover:border-[#0f62fe] text-[#161616] bg-white'
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${
                s.domain === 'healthcare' ? 'text-[#0f62fe]' :
                s.domain === 'banking' ? 'text-[#24a148]' :
                s.domain === 'legal' ? 'text-[#6929c4]' : 'text-[#6f6f6f]'
              }`}>{s.domain}</div>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {running && (
        <div className="card p-6 text-center text-[#6f6f6f] text-sm animate-pulse">
          <GitBranch className="w-6 h-6 mx-auto mb-2 text-[#0f62fe]" />
          Running decision trees…
        </div>
      )}

      {!running && decisionA && decisionB && (
        <div className="space-y-6">

          {/* Summary bar */}
          <div className={`p-4 border-l-4 ${
            decisionA.action === 'block' || decisionA.action === 'escalate' ? 'border-[#da1e28] bg-[#fff1f1]' :
            decisionA.action === 'anonymize' || decisionA.action === 'warn' ? 'border-[#f1c21b] bg-[#f6f2c0]' :
            'border-[#24a148] bg-[#defbe6]'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-[#161616] text-sm">
                Privacy Decision: <span className="uppercase font-bold">{decisionA.action}</span>
              </p>
              <span className={`text-xs font-bold px-2 py-1 ${
                decisionA.riskLevel === 'critical' || decisionA.riskLevel === 'high' ? 'bg-[#da1e28] text-white' :
                decisionA.riskLevel === 'medium' ? 'bg-[#f1c21b] text-[#161616]' : 'bg-[#24a148] text-white'
              }`}>{decisionA.riskLevel} risk</span>
            </div>
            <p className="text-xs text-[#525252] mt-1">{decisionA.explanation.split('\n')[0]}</p>
          </div>

          {/* Tree A */}
          <div className="card p-5 space-y-4">
            <MerkleTree
              path={decisionA.decisionPath}
              label="PRIVACY DECISION"
              altOutcomes={ALT_OUTCOMES_A}
              onSelect={setSelectedNode}
              selected={selectedNode}
            />
          </div>

          {/* Tree B */}
          <div className="card p-5 space-y-4">
            <MerkleTree
              path={decisionB.decisionPath}
              label="CRITICAL THINKING"
              altOutcomes={ALT_OUTCOMES_B}
              onSelect={setSelectedNode}
              selected={selectedNode}
            />
          </div>

          {/* Detail panel */}
          {selectedNode && (
            <div
              className="p-4 space-y-2"
              style={{
                background: COLOR_MAP[selectedNode.color]?.bg ?? '#f4f4f4',
                borderLeft: `4px solid ${COLOR_MAP[selectedNode.color]?.border ?? '#c6c6c6'}`,
              }}
            >
              <p className="text-sm font-semibold text-[#161616] flex items-center gap-2">
                <Info className="w-4 h-4" />
                {selectedNode.question}
              </p>
              <p className="text-sm text-[#525252]">{selectedNode.explanation}</p>
              {selectedNode.ruleId && (
                <p className="text-xs text-[#6f6f6f] font-mono">Rule: {selectedNode.ruleId}</p>
              )}
              {selectedNode.outcome && (
                <p className="text-xs font-bold uppercase tracking-wide text-[#161616]">
                  Outcome: {selectedNode.outcome}
                </p>
              )}
              {selectedNode.branch === 'not-taken' && (
                <p className="text-xs text-[#8d8d8d] italic">This branch was NOT taken for the selected scenario.</p>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="card p-4 space-y-3">
            <div className="flex flex-wrap gap-4 text-xs text-[#6f6f6f]">
              {([['green', 'Permitted'], ['amber', 'Review / Warn'], ['red', 'Blocked'], ['blue', 'Info / Recheck'], ['grey', 'Not taken']] as const).map(([col, label]) => (
                <div key={col} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5" style={{ background: COLOR_MAP[col].dot }} />
                  {label}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-[#6f6f6f]">
              <div className="flex items-center gap-2">
                <svg width={30} height={8}><line x1={0} y1={4} x2={30} y2={4} stroke="#0f62fe" strokeWidth={2} /></svg>
                YES — path taken
              </div>
              <div className="flex items-center gap-2">
                <svg width={30} height={8}><line x1={0} y1={4} x2={30} y2={4} stroke="#c6c6c6" strokeWidth={1.5} strokeDasharray="4 3" /></svg>
                NO — alternate branch
              </div>
            </div>
            <p className="text-xs text-[#8d8d8d]">Click any node to see rule explanation and details.</p>
            <p className="text-xs text-[#da1e28] flex items-center gap-1.5">
              <FlaskConical className="w-3 h-3" /> Demo mode — using synthetic data only.
            </p>
          </div>
        </div>
      )}

      {!running && !decisionA && (
        <div className="card p-12 text-center space-y-3">
          <GitBranch className="w-10 h-10 text-[#c6c6c6] mx-auto" />
          <p className="text-[#6f6f6f] text-sm">Select a scenario above to visualize the full decision tree.</p>
          <p className="text-xs text-[#8d8d8d]">Each node represents a real decision rule executed by the engine. Greyed branches show paths not taken.</p>
        </div>
      )}
    </div>
  )
}
