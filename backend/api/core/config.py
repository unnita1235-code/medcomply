from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
        "http://localhost:3004",
        "http://127.0.0.1:3004",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
    ]

    @field_validator("api_cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: Any) -> list[str]:
        if v is None:
            return [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3002",
                "http://127.0.0.1:3002",
                "http://localhost:3003",
                "http://127.0.0.1:3003",
                "http://localhost:3004",
                "http://127.0.0.1:3004",
                "http://localhost:3005",
                "http://127.0.0.1:3005",
            ]
        if isinstance(v, str):
            parts = [x.strip() for x in v.split(",") if x.strip()]
            return parts or [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3002",
                "http://127.0.0.1:3002",
                "http://localhost:3003",
                "http://127.0.0.1:3003",
                "http://localhost:3004",
                "http://127.0.0.1:3004",
                "http://localhost:3005",
                "http://127.0.0.1:3005",
            ]
        if isinstance(v, list):
            return [str(x) for x in v]
        return [str(v)]
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # LangChain + OpenAI (embeddings + compliance LLM)
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    openai_compliance_model: str = "gpt-4o-mini"

    # Chroma
    chroma_persist_directory: str = str(
        Path(__file__).resolve().parent.parent / ".chroma_data",
    )

    # Ingest
    chunk_size: int = 1_200
    chunk_overlap: int = 200
    retrieval_k: int = 12
    compliance_max_context_chars: int = 14_000
    process_document_max_bytes: int = 20 * 1024 * 1024  # 20 MB
    audit_log_directory: str = str(
        Path(__file__).resolve().parent.parent.parent / "audit",
    )


settings = Settings()
