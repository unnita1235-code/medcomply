"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getApiBaseUrl } from "@/lib/env"
import {
  extractSummaryParagraph,
  mapStructuredViolations,
  parseRiskItemsFromAnalysis,
  type ApiViolation,
  type RiskItem,
  type RiskSeverity,
} from "@/lib/compliance/parse-analysis"
import { jsPDF } from "jspdf"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  FileText,
  Loader2,
  Shield,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const severityStyles: Record<
  RiskSeverity,
  { border: string; glow: string; label: string }
> = {
  high: {
    border: "border-rose-500/60 bg-rose-950/40",
    glow: "shadow-[0_0_24px_-4px_rgba(244,63,94,0.45)]",
    label: "High",
  },
  medium: {
    border: "border-amber-500/50 bg-amber-950/30",
    glow: "shadow-[0_0_20px_-6px_rgba(245,158,11,0.35)]",
    label: "Medium",
  },
  low: {
    border: "border-emerald-500/40 bg-emerald-950/25",
    glow: "shadow-[0_0_16px_-6px_rgba(16,185,129,0.25)]",
    label: "Low",
  },
  info: {
    border: "border-zinc-600/50 bg-zinc-900/40",
    glow: "",
    label: "Note",
  },
}

type PipelineStep = { id: string; label: string; done: boolean }

function RiskCard({
  item,
  index,
  onOpenCitation,
}: {
  item: RiskItem
  index: number
  onOpenCitation?: (page: number) => void
}) {
  const s = severityStyles[item.severity]
  const isHigh = item.severity === "high"
  const cit = item.citation
  return (
    <motion.div
      role="article"
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isHigh ? [1, 1.015, 1] : 1,
      }}
      transition={{
        opacity: { duration: 0.35, delay: index * 0.04 },
        y: { type: "spring", stiffness: 420, damping: 28, delay: index * 0.04 },
        scale: isHigh
          ? { duration: 0.6, repeat: 1, repeatType: "reverse" as const }
          : { duration: 0.3 },
      }}
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed backdrop-blur-sm ${s.border} ${isHigh ? s.glow : ""}`}
    >
      <div className="mb-1.5 flex w-full flex-wrap items-center gap-2">
        {isHigh ? (
          <motion.span
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-rose-400"
          >
            <AlertTriangle className="size-4 shrink-0" />
          </motion.span>
        ) : (
          <Shield className="size-4 shrink-0 text-zinc-500" />
        )}
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isHigh ? "text-rose-300" : "text-zinc-400"
          }`}
        >
          {s.label} risk
        </span>
        {item.confidence != null && (
          <span className="ml-auto text-xs tabular-nums text-zinc-500">
            {Math.round(item.confidence * 100)}% conf.
          </span>
        )}
      </div>
      <p className="text-zinc-200">{item.text}</p>
      {cit && onOpenCitation && (
        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onOpenCitation(cit.pageNumber)}
            className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-md border border-cyan-800/60 bg-cyan-950/40 px-2 py-1 text-left text-xs font-medium text-cyan-200/90 transition hover:border-cyan-600/80 hover:bg-cyan-900/30"
          >
            <ExternalLink className="size-3.5 shrink-0 opacity-80" />
            Open page {cit.pageNumber}, block {cit.paragraphIndex}
          </button>
          {cit.excerpt && (
            <p className="line-clamp-3 pl-0.5 text-xs leading-snug text-zinc-500">
              “{cit.excerpt}”
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function ComplianceWorkspace() {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [analysis, setAnalysis] = useState("")
  const [risks, setRisks] = useState<RiskItem[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pipeline, setPipeline] = useState<PipelineStep[]>([])
  const [pageWidth, setPageWidth] = useState(520)
  const [auditId, setAuditId] = useState<string | null>(null)
  const [avgConfidence, setAvgConfidence] = useState<number | null>(null)
  const [streamThought, setStreamThought] = useState<string | null>(null)
  const streamRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const u = () =>
      setPageWidth(Math.min(560, Math.max(320, Math.floor(window.innerWidth * 0.42))))
    u()
    window.addEventListener("resize", u)
    return () => window.removeEventListener("resize", u)
  }, [])

  useEffect(() => {
    if (!file) {
      setFileUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const startRiskStream = useCallback((items: RiskItem[]) => {
    setVisibleCount(0)
    if (streamRef.current) clearInterval(streamRef.current)
    if (items.length === 0) {
      setVisibleCount(0)
      return
    }
    let n = 0
    streamRef.current = setInterval(() => {
      n += 1
      setVisibleCount(n)
      if (n >= items.length && streamRef.current) {
        clearInterval(streamRef.current)
        streamRef.current = null
      }
    }, 380)
  }, [])

  useEffect(() => {
    return () => {
      if (streamRef.current) clearInterval(streamRef.current)
    }
  }, [])

  const goToPage = useCallback(
    (n: number) => {
      setPage(() => {
        if (numPages > 0) return Math.min(Math.max(1, n), numPages)
        return Math.max(1, n)
      })
    },
    [numPages],
  )

  const analyze = async () => {
    if (!file) return
    setError(null)
    setLoading(true)
    setAnalysis("")
    setRisks([])
    setVisibleCount(0)
    setAuditId(null)
    setAvgConfidence(null)
    setStreamThought(null)
    setPipeline([
      { id: "1", label: "Secure upload & PDF load", done: false },
      { id: "2", label: "Chunking & embeddings (Chroma)", done: false },
      { id: "3", label: "HIPAA model + violation citations", done: false },
    ])

    const form = new FormData()
    form.append("file", file)

    try {
      const res = await fetch(
        `${getApiBaseUrl().replace(/\/$/, "")}/v1/process-document/stream`,
        {
          method: "POST",
          body: form,
        },
      )
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || res.statusText)
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error("Streaming response not supported in this browser.")

      const dec = new TextDecoder()
      let buf = ""
      let narrative = ""
      let sawViolationsEvent = false

      const pump = async (): Promise<void> => {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const events = buf.split("\n\n")
          buf = events.pop() ?? ""
          for (const ev of events) {
            for (const line of ev.split("\n")) {
              if (!line.startsWith("data: ")) continue
              let payload: Record<string, unknown>
              try {
                payload = JSON.parse(line.slice(6)) as Record<string, unknown>
              } catch {
                continue
              }
              const t = payload.type
              if (t === "start") {
                setPipeline((prev) => {
                  const n = [...prev]
                  if (n[0]) n[0] = { ...n[0], done: true }
                  return n
                })
              } else if (t === "stage" && payload.name === "ingest") {
                setPipeline((prev) => {
                  const n = [...prev]
                  if (n[0]) n[0] = { ...n[0], done: true }
                  if (n[1]) n[1] = { ...n[1], done: true }
                  return n
                })
              } else if (t === "thought" && typeof payload.text === "string") {
                setStreamThought(payload.text)
              } else if (t === "token" && typeof payload.text === "string") {
                narrative += payload.text
                setAnalysis(narrative)
              } else if (t === "violations") {
                sawViolationsEvent = true
                const items = (payload.items as ApiViolation[] | undefined) ?? []
                const parsed = mapStructuredViolations(items)
                setRisks(parsed)
                startRiskStream(parsed)
                setPipeline((prev) => prev.map((p) => ({ ...p, done: true })))
              } else if (t === "audit") {
                if (typeof payload.audit_id === "string" || payload.audit_id == null) {
                  setAuditId(
                    payload.audit_id == null
                      ? null
                      : String(payload.audit_id),
                  )
                }
                if (typeof payload.average_confidence === "number") {
                  setAvgConfidence(payload.average_confidence)
                } else {
                  setAvgConfidence(null)
                }
              } else if (t === "complete" && typeof payload.narrative === "string") {
                setAnalysis(payload.narrative)
              } else if (t === "error") {
                const m =
                  typeof payload.message === "string"
                    ? payload.message
                    : "Analysis error"
                setError(m)
              }
            }
          }
        }
      }
      await pump()
      if (narrative && !sawViolationsEvent) {
        const parsed = parseRiskItemsFromAnalysis(narrative)
        if (parsed.length) {
          setRisks(parsed)
          startRiskStream(parsed)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed")
      setPipeline((prev) => prev.map((p) => ({ ...p, done: false })))
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (risks.length === 0 && !analysis) return
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const margin = 18
    let y = 20
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("MedComply — Compliance Analysis Report", margin, y)
    y += 10
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y)
    y += 12
    doc.setTextColor(0, 0, 0)
    if (file) {
      doc.text(`Source file: ${file.name}`, margin, y)
      y += 8
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Flagged items", margin, y)
    y += 8
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const toShow = risks.length ? risks : parseRiskItemsFromAnalysis(analysis)
    for (const r of toShow) {
      const line = `[${r.severity.toUpperCase()}] ${r.text}`
      const lines = doc.splitTextToSize(line, 175)
      for (const ln of lines) {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(ln, margin, y)
        y += 5
      }
      if (r.citation) {
        doc.setFont("helvetica", "italic")
        doc.setTextColor(80, 80, 100)
        const c = `Source: p.${r.citation.pageNumber}, ¶${r.citation.paragraphIndex}`
        for (const ln of doc.splitTextToSize(c, 175)) {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          doc.text(ln, margin, y)
          y += 4
        }
        if (r.citation.excerpt) {
          for (const ln of doc.splitTextToSize(
            `"${r.citation.excerpt.slice(0, 400)}"`,
            175,
          )) {
            if (y > 270) {
              doc.addPage()
              y = 20
            }
            doc.text(ln, margin, y)
            y += 4
          }
        }
        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
      }
      y += 2
    }
    y += 4
    if (analysis) {
      doc.setFont("helvetica", "bold")
      doc.text("Summary", margin, y)
      y += 7
      doc.setFont("helvetica", "normal")
      const summary = extractSummaryParagraph(analysis)
      for (const ln of doc.splitTextToSize(summary, 175)) {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(ln, margin, y)
        y += 5
      }
    }
    doc.save(`compliance-report-${Date.now()}.pdf`)
  }

  const visibleRisks = useMemo(
    () => risks.slice(0, visibleCount),
    [risks, visibleCount],
  )

  return (
    <div className="dark min-h-[calc(100vh-5rem)] rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
              Compliance Analysis
            </h2>
            <p className="text-xs text-zinc-500">
              PDF review with live risk feed (HIPAA model streams via SSE; citations jump to
              page)
            </p>
            {(auditId || avgConfidence != null) && !loading && (
              <p className="mt-0.5 text-xs text-zinc-600">
                {auditId && (
                  <span className="font-mono text-zinc-500">Run {auditId.slice(0, 8)}…</span>
                )}
                {auditId && avgConfidence != null && " · "}
                {avgConfidence != null && (
                  <span>
                    Avg. confidence:{" "}
                    <span className="tabular-nums text-zinc-500">
                      {Math.round(avgConfidence * 100)}%
                    </span>
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800">
                <FileText className="size-4" />
                {file ? file.name : "Choose PDF"}
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setFile(f ?? null)
                  setPage(1)
                  setAnalysis("")
                  setRisks([])
                  setVisibleCount(0)
                  setError(null)
                  setAuditId(null)
                  setAvgConfidence(null)
                }}
              />
            </label>
            <Button
              type="button"
              onClick={() => void analyze()}
              disabled={!file || loading}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Run analysis
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              disabled={!analysis && risks.length === 0}
              onClick={exportReport}
            >
              Export report
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-[560px] gap-0 lg:grid-cols-2">
        {/* PDF */}
        <div className="flex flex-col border-b border-zinc-800 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Document
            </span>
            {numPages > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-zinc-400"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <span className="text-xs text-zinc-500">
                  {page} / {numPages}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-zinc-400"
                  disabled={page >= numPages}
                  onClick={() => setPage((p) => Math.min(numPages, p + 1))}
                >
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="h-[min(72vh,720px)]">
            <div className="flex min-h-[400px] items-start justify-center bg-zinc-900/50 p-4">
              {!fileUrl ? (
                <p className="py-20 text-sm text-zinc-600">
                  Select a PDF to preview pages here.
                </p>
              ) : (
                <Document
                  file={fileUrl}
                  loading={
                    <div className="flex items-center gap-2 py-20 text-zinc-500">
                      <Loader2 className="size-5 animate-spin" />
                      Loading PDF…
                    </div>
                  }
                  onLoadSuccess={({ numPages: n }) => {
                    setNumPages(n)
                    setPage(1)
                  }}
                  onLoadError={(err) =>
                    setError(err.message || "Failed to load PDF in viewer")
                  }
                  className="flex flex-col items-center"
                >
                  <Page
                    pageNumber={page}
                    width={pageWidth}
                    className="shadow-2xl shadow-black/50"
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </Document>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Risk feed */}
        <div className="flex flex-col bg-zinc-950/80">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Live risk feed
            </span>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400/90">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Processing
              </span>
            )}
          </div>

          <ScrollArea className="h-[min(72vh,720px)]">
            <div className="space-y-4 p-4">
              <AnimatePresence mode="popLayout">
                {pipeline.map((step) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-sm"
                  >
                    {step.done ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-emerald-400"
                      >
                        ✓
                      </motion.span>
                    ) : (
                      <Loader2 className="size-4 animate-spin text-zinc-500" />
                    )}
                    <span
                      className={
                        step.done ? "text-zinc-300" : "text-zinc-500"
                      }
                    >
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
                >
                  {error}
                </motion.div>
              )}

              {streamThought && loading && (
                <p className="text-xs italic text-zinc-500">{streamThought}</p>
              )}

              {loading && analysis && (
                <div className="rounded-lg border border-zinc-800/90 bg-zinc-900/50 p-3">
                  <p className="mb-1 text-xs font-medium uppercase text-zinc-500">
                    Live model output
                  </p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                    {analysis}
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-500/80" />
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {visibleRisks.map((item, i) => (
                    <RiskCard
                      key={item.id}
                      item={item}
                      index={i}
                      onOpenCitation={goToPage}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {!loading &&
                analysis &&
                visibleCount >= risks.length &&
                risks.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs leading-relaxed text-zinc-400"
                  >
                    <div className="mb-1 flex items-center gap-1 text-zinc-500">
                      <ChevronDown className="size-3" />
                      Executive summary
                    </div>
                    <p className="text-zinc-300">
                      {extractSummaryParagraph(analysis).slice(0, 1200)}
                    </p>
                  </motion.div>
                ) : null}

              {!loading && analysis && risks.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300"
                >
                  <p className="mb-1 text-xs font-medium text-zinc-500">
                    Model output (unparsed)
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                    {analysis.slice(0, 8000)}
                  </p>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
