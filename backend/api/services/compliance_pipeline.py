import asyncio
import json
import uuid
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Any, AsyncIterator

from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from api.core.config import settings
from api.models.compliance import StructuredViolations
from api.prompts.hipaa_compliance import compliance_analysis_prompt
from api.prompts.structured_violations import STRUCTURED_VIOLATIONS_PROMPT
from api.services.audit_log import persist_analysis_audit
from api.core.security import UserContext
from api.services import document_ingest as d_ing


@dataclass
class PreparedRun:
    chunks: list[Document]
    vectordb: Chroma | None
    collection_name: str
    narrative_context: str
    annotated_context: str
    file_name: str


def _enrich_citation_metadata(chunks: list[Document]) -> None:
    by_page: dict[int, int] = defaultdict(int)
    ordered = sorted(
        chunks,
        key=lambda d: (d.metadata.get("page", 0) or 0, d.page_content[:32]),
    )
    for c in ordered:
        p = c.metadata.get("page", 0)
        if not isinstance(p, int):
            p = 0
        by_page[p] += 1
        c.metadata["page_display"] = p + 1
        c.metadata["paragraph_in_page"] = by_page[p]


def _format_annotated_context(chunks: list[Document], max_chars: int) -> str:
    parts: list[str] = []
    for c in sorted(
        chunks,
        key=lambda d: (d.metadata.get("page", 0) or 0, d.page_content[:24]),
    ):
        pd = c.metadata.get("page_display", 1)
        pr = c.metadata.get("paragraph_in_page", 1)
        parts.append(f"[PAGE {pd} ¶ {pr}]\n{c.page_content.strip()}")
    text = "\n\n".join(parts)
    if len(text) > max_chars:
        return text[:max_chars] + "\n[TRUNCATED FOR CONTEXT LIMIT]"
    return text


def _require_openai() -> None:
    if not (settings.openai_api_key and settings.openai_api_key.strip()):
        msg = "OPENAI_API_KEY is not set. Embeddings, Chroma, and the compliance LLM need it."
        raise RuntimeError(msg)


def prepare_run(
    file_path: str,
    file_name: str,
    user: UserContext,
) -> PreparedRun:
    _require_openai()
    loader = PyPDFLoader(file_path)
    pages = loader.load()
    for d in pages:
        d.metadata.setdefault("source", file_name)
        d.metadata["organization_id"] = user.organization_id
        d.metadata["ingested_by"] = user.id
    chunks = d_ing._split_documents(pages)  # noqa: SLF001
    if not chunks:
        return PreparedRun(
            chunks=[],
            vectordb=None,
            collection_name="",
            narrative_context="",
            annotated_context="",
            file_name=file_name,
        )
    _enrich_citation_metadata(chunks)
    collection = f"mc_{uuid.uuid4().hex}"
    embedding = OpenAIEmbeddings(
        model=settings.openai_embedding_model,
        openai_api_key=settings.openai_api_key,
    )
    vectordb = d_ing._build_chroma(chunks, collection, embedding)  # noqa: SLF001
    narrative = d_ing._retrieval_context(vectordb, user.organization_id)  # noqa: SLF001
    if not narrative.strip():
        org_chunks = [
            c
            for c in chunks[:24]
            if c.metadata.get("organization_id") == user.organization_id
        ]
        narrative = "\n\n".join(c.page_content for c in (org_chunks or [])[:12])
    if not narrative.strip():
        narrative = "No retrievable text segments."
    annotated = _format_annotated_context(
        chunks,
        min(settings.compliance_max_context_chars, 24_000),
    )
    return PreparedRun(
        chunks=chunks,
        vectordb=vectordb,
        collection_name=collection,
        narrative_context=narrative,
        annotated_context=annotated,
        file_name=file_name,
    )


def _llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.openai_compliance_model,
        temperature=0.1,
        openai_api_key=settings.openai_api_key,
    )


def extract_structured_violations(annotated_context: str) -> StructuredViolations:
    llm = _llm().with_structured_output(StructuredViolations)
    chain = STRUCTURED_VIOLATIONS_PROMPT | llm
    return chain.invoke({"annotated_context": annotated_context})


async def astream_narrative_text(context: str) -> AsyncIterator[str]:
    """Token stream for the free-text compliance narrative (SSE `token` events)."""
    llm = _llm()
    messages = compliance_analysis_prompt.format_messages(context=context)
    async for chunk in llm.astream(messages):
        c = getattr(chunk, "content", None) or ""
        if isinstance(c, str) and c:
            yield c


def sse_dumps(obj: dict[str, Any]) -> str:
    return f"data: {json.dumps(obj, default=str)}\n\n"


@dataclass
class StreamAccum:
    narrative: str = ""


async def stream_compliance_sse(
    file_path: str,
    file_name: str,
    user: UserContext,
    client_ip: str | None,
) -> AsyncIterator[str]:
    run_id = str(uuid.uuid4())
    yield sse_dumps({"type": "start", "run_id": run_id})

    def _run_prepare() -> PreparedRun:
        return prepare_run(file_path, file_name, user)

    try:
        prepared = await asyncio.to_thread(_run_prepare)
    except Exception as e:
        yield sse_dumps({"type": "error", "message": str(e)})
        return

    if not prepared.chunks:
        yield sse_dumps(
            {
                "type": "error",
                "message": "No text could be extracted from the PDF.",
            },
        )
        return

    yield sse_dumps(
        {
            "type": "stage",
            "name": "ingest",
            "chunk_count": len(prepared.chunks),
            "collection": prepared.collection_name,
        },
    )
    await asyncio.sleep(0)
    yield sse_dumps(
        {
            "type": "thought",
            "text": "Model is reviewing retrieved passages against HIPAA rules…",
        },
    )
    acc = StreamAccum()
    async for token in astream_narrative_text(prepared.narrative_context):
        acc.narrative += token
        yield sse_dumps({"type": "token", "text": token})

    yield sse_dumps({"type": "stage", "name": "structured_citations"})

    def _struct() -> StructuredViolations:
        return extract_structured_violations(prepared.annotated_context)

    try:
        structured = await asyncio.to_thread(_struct)
    except Exception as e:
        yield sse_dumps(
            {
                "type": "error",
                "message": f"Citation extraction failed: {e!s}",
            },
        )
        structured = StructuredViolations(violations=[])

    violations_out = [v.model_dump() for v in structured.violations]
    confs = [v.confidence for v in structured.violations if v is not None]
    avg_c = float(sum(confs) / len(confs)) if confs else None

    yield sse_dumps(
        {
            "type": "violations",
            "items": violations_out,
        },
    )
    try:
        audit_id = await asyncio.to_thread(
            persist_analysis_audit,
            user,
            file_name,
            len(structured.violations),
            avg_c,
            prepared.collection_name,
            acc.narrative[:4000] if acc.narrative else "",
            client_ip,
        )
    except Exception:
        audit_id = None

    yield sse_dumps(
        {
            "type": "audit",
            "audit_id": audit_id,
            "average_confidence": avg_c,
            "violation_count": len(structured.violations),
        },
    )
    yield sse_dumps(
        {
            "type": "complete",
            "narrative": acc.narrative,
            "run_id": run_id,
        },
    )


def process_uploaded_pdf_sync(
    file_path: str,
    file_name: str,
    user: UserContext,
    client_ip: str | None = None,
) -> dict[str, Any]:
    """
    Non-streaming path: single narrative + structured violations + audit (matches /process-document).
    """
    prepared = prepare_run(file_path, file_name, user)
    if not prepared.chunks:
        return {
            "analysis": "No text could be extracted from the PDF.",
            "chunk_count": 0,
            "chroma_collection": "",
            "retriever_context_chars": 0,
            "violations": [],
            "average_confidence": None,
            "audit_id": None,
        }

    llm = _llm()
    chain = compliance_analysis_prompt | llm
    out = chain.invoke({"context": prepared.narrative_context})
    text = out.content if hasattr(out, "content") else str(out)
    structured = extract_structured_violations(prepared.annotated_context)
    confs = [v.confidence for v in structured.violations]
    avg_c = float(sum(confs) / len(confs)) if confs else None
    audit_id = persist_analysis_audit(
        user,
        file_name,
        len(structured.violations),
        avg_c,
        prepared.collection_name,
        text[:4000] if text else "",
        client_ip,
    )
    return {
        "analysis": text,
        "chunk_count": len(prepared.chunks),
        "chroma_collection": prepared.collection_name,
        "retriever_context_chars": len(prepared.narrative_context),
        "violations": [v.model_dump() for v in structured.violations],
        "average_confidence": avg_c,
        "audit_id": audit_id,
    }
