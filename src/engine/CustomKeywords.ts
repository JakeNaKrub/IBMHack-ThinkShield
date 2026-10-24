// ─── User-defined custom keywords for privacy scanning ───────────────────────
// Stored in localStorage, merged into the scanner at runtime.

const STORAGE_KEY = 'thinkshield_custom_keywords'

export interface CustomKeyword {
  id: string
  term: string
  category: string
  riskLevel: 'low' | 'medium' | 'high'
  replacement: string
  addedAt: number
}

function load(): CustomKeyword[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CustomKeyword[]
  } catch { /* ignore */ }
  return []
}

function save(keywords: CustomKeyword[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keywords)) } catch { /* ignore */ }
}

export function getCustomKeywords(): CustomKeyword[] {
  return load()
}

export function addCustomKeyword(
  term: string,
  category: string,
  riskLevel: CustomKeyword['riskLevel'],
): CustomKeyword {
  const keywords = load()
  const kw: CustomKeyword = {
    id: `CK-${Date.now()}`,
    term: term.trim(),
    category,
    riskLevel,
    replacement: `[${category.toUpperCase().replace(/\s+/g, '_')}]`,
    addedAt: Date.now(),
  }
  save([...keywords, kw])
  return kw
}

export function removeCustomKeyword(id: string): void {
  const keywords = load().filter(k => k.id !== id)
  save(keywords)
}

export function clearCustomKeywords(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// Scan text against custom keywords, returns match positions
export function scanCustomKeywords(text: string): Array<{
  keyword: CustomKeyword
  matchedText: string
  startIndex: number
  endIndex: number
}> {
  const keywords = load()
  const results: ReturnType<typeof scanCustomKeywords> = []

  for (const kw of keywords) {
    if (!kw.term) continue
    // Escape special regex chars
    const escaped = kw.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      results.push({
        keyword: kw,
        matchedText: m[0],
        startIndex: m.index,
        endIndex: m.index + m[0].length,
      })
    }
  }

  return results
}
