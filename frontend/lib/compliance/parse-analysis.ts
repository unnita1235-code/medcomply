
export type RiskSeverity = "high" | "medium" | "low" | "info"

export type ViolationCitation = {
  pageNumber: number
  paragraphIndex: number
  excerpt: string
}

export type RiskItem = {
  id: string
  severity: RiskSeverity
  text: string
  confidence?: number
  citation?: ViolationCitation
}

const API_SEV_TO_RISK: Record<string, RiskSeverity> = {
  high: "high",
  medium: "medium",
  low: "low",
  info: "info",
  note: "info",
  critical: "high",
  moderate: "medium",
  minor: "low",
}

function normalizeApiSeverity(s: string): RiskSeverity {
  const k = s.trim().toLowerCase()
  if (k in API_SEV_TO_RISK) return API_SEV_TO_RISK[k] as RiskSeverity
  if (/\bhigh|critical|severe\b/i.test(s)) return "high"
  if (/\bmedium|moderate\b/i.test(s)) return "medium"
  if (/\blow|minor\b/i.test(s)) return "low"
  return "info"
}

export type ApiViolation = {
  severity: string
  description: string
  confidence: number
  citation: {
    page_number: number
    paragraph_index: number
    excerpt: string
  }
}

/** Maps structured violations from `/v1/process-document/stream` or sync JSON. */
export function mapStructuredViolations(items: ApiViolation[]): RiskItem[] {
  return items.map((v, i) => ({
    id: `vio-${i}`,
    severity: normalizeApiSeverity(v.severity),
    text: v.description.trim() || "Violation",
    confidence: v.confidence,
    citation: v.citation
      ? {
          pageNumber: v.citation.page_number,
          paragraphIndex: v.citation.paragraph_index,
          excerpt: v.citation.excerpt,
        }
      : undefined,
  }))
}

/**
 * Parses compliance LLM output that uses [High] / [Medium] / [Low] labels.
 */
export function parseRiskItemsFromAnalysis(analysis: string): RiskItem[] {
  const items: RiskItem[] = []
  const re = /\[(High|Medium|Low)\]\s*([^\n]+)/gi
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(analysis)) !== null) {
    const sev = m[1].toLowerCase() as RiskSeverity
    const text = m[2].trim().replace(/^[-*•]\s*/, "")
    if (text) {
      items.push({ id: `risk-${i++}`, severity: sev, text })
    }
  }
  if (items.length > 0) return items

  // Fallback: bullet lines with optional severity words
  for (const line of analysis.split("\n")) {
    const t = line.trim()
    if (!t || t.length < 8) continue
    const low = t.toLowerCase()
    let severity: RiskSeverity = "info"
    if (/\bhigh\b|critical\b/.test(low)) severity = "high"
    else if (/\bmedium\b|moderate\b/.test(low)) severity = "medium"
    else if (/\blow\b|minor\b/.test(low)) severity = "low"
    if (t.startsWith("-") || t.startsWith("•") || /^\d+\./.test(t)) {
      items.push({
        id: `risk-${i++}`,
        severity,
        text: t.replace(/^[-*•\d.)\s]+/, "").trim(),
      })
    }
  }
  return items.slice(0, 40)
}

export function extractSummaryParagraph(analysis: string): string {
  const idx = analysis.toLowerCase().lastIndexOf("conclude")
  if (idx === -1) {
    const paras = analysis.split(/\n\n+/).filter((p) => p.trim().length > 80)
    return paras[paras.length - 1]?.trim() ?? analysis.slice(-800)
  }
  return analysis.slice(idx).trim().slice(0, 2000)
}
