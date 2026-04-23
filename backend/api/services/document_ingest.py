import tempfile
import uuid
from pathlib import Path

from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from api.core.config import settings


def _require_openai() -> None:
    if not (settings.openai_api_key and settings.openai_api_key.strip()):
        msg = "OPENAI_API_KEY is not set. Embeddings, Chroma, and the compliance LLM need it."
        raise RuntimeError(msg)


def _split_documents(docs: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
        is_separator_regex=False,
    )
    return splitter.split_documents(docs)


def _build_chroma(
    split_docs: list[Document],
    collection_name: str,
    embedding: OpenAIEmbeddings,
) -> Chroma:
    Path(settings.chroma_persist_directory).mkdir(parents=True, exist_ok=True)
    return Chroma.from_documents(
        documents=split_docs,
        embedding=embedding,
        collection_name=collection_name,
        persist_directory=settings.chroma_persist_directory,
    )


def _similarity_for_org(
    vectordb: Chroma,
    query: str,
    k: int,
    organization_id: str,
) -> list[Document]:
    try:
        return vectordb.similarity_search(
            query,
            k=k,
            filter={"organization_id": organization_id},
        )
    except Exception:
        # Fallback: over-fetch then enforce org in-process (portable across Chroma versions)
        out: list[Document] = []
        for doc in vectordb.similarity_search(query, k=k * 3):
            if doc.metadata.get("organization_id") == organization_id:
                out.append(doc)
            if len(out) >= k:
                break
        return out


def _retrieval_context(vectordb: Chroma, organization_id: str) -> str:
    """Use targeted retrieval; only chunks for this org_id (metadata) enter context."""
    queries = [
        "PHI personal health information privacy disclosure authorization",
        "HIPAA security safeguards encryption access control audit controls",
        "Business associate BAA minimum necessary breach notification",
    ]
    k_each = max(1, settings.retrieval_k // len(queries))
    seen: set[str] = set()
    parts: list[str] = []
    for q in queries:
        for doc in _similarity_for_org(vectordb, q, k_each, organization_id):
            key = doc.page_content[:200]
            if key not in seen:
                seen.add(key)
                parts.append(doc.page_content)
    if not parts:
        return ""
    combined = "\n\n---\n\n".join(parts)
    max_chars = settings.compliance_max_context_chars
    if len(combined) > max_chars:
        return combined[:max_chars] + "\n[TRUNCATED FOR CONTEXT LIMIT]"
    return combined


def write_temp_file(content: bytes, suffix: str) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        return tmp.name
