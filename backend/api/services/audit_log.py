import json
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from api.core.config import settings
from api.core.security import UserContext


@dataclass
class AuditLogEntry:
    id: str
    at: str
    user_id: str
    organization_id: str
    app_role: str
    file_name: str
    violation_count: int
    average_confidence: float | None
    chroma_collection: str | None
    client_ip: str | None
    run_summary: str


def _log_file() -> Path:
    base = Path(settings.audit_log_directory)
    base.mkdir(parents=True, exist_ok=True)
    return base / "ai_analysis.jsonl"


def _write_jsonl(entry: AuditLogEntry) -> None:
    with open(_log_file(), "a", encoding="utf-8") as f:
        f.write(json.dumps(asdict(entry), default=str) + "\n")


def _supabase_insert(row: dict[str, Any]) -> None:
    url = (settings.supabase_url or "").rstrip("/")
    key = settings.supabase_service_role_key
    if not url or not key:
        return
    endpoint = f"{url}/rest/v1/ai_analysis_audit"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        with httpx.Client(timeout=8) as client:
            r = client.post(endpoint, json=row, headers=headers)
            if not r.is_success and r.status_code not in (400, 404):
                r.raise_for_status()
    except httpx.HTTPError:
        return


def persist_analysis_audit(
    user: UserContext,
    file_name: str,
    violation_count: int,
    average_confidence: float | None,
    chroma_collection: str | None,
    run_summary: str,
    client_ip: str | None = None,
) -> str:
    entry_id = str(uuid.uuid4())
    at = datetime.now(UTC).isoformat()
    app_role = user.app_role.value if hasattr(user.app_role, "value") else str(user.app_role)
    entry = AuditLogEntry(
        id=entry_id,
        at=at,
        user_id=user.id,
        organization_id=user.organization_id,
        app_role=app_role,
        file_name=file_name,
        violation_count=violation_count,
        average_confidence=average_confidence,
        chroma_collection=chroma_collection,
        client_ip=client_ip,
        run_summary=run_summary[:2000] if run_summary else "",
    )
    _write_jsonl(entry)
    _supabase_insert(
        {
            "id": entry_id,
            "organization_id": user.organization_id,
            "user_id": user.id,
            "app_role": app_role,
            "file_name": file_name,
            "run_at": at,
            "violation_count": violation_count,
            "avg_confidence": average_confidence,
            "chroma_collection": chroma_collection,
            "client_ip": client_ip,
            "result_summary": (run_summary or "")[:5000],
        }
    )
    return entry_id
