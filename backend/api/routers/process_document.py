import os
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from api.core.app_role import AppRole
from api.core.config import settings
from api.core.rbac_app import require_app_role
from api.core.security import UserContext
from api.services.compliance_pipeline import (
    process_uploaded_pdf_sync,
    stream_compliance_sse,
)
from api.services.document_ingest import write_temp_file

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    if request.client:
        return request.client.host
    return None


@router.post("/process-document")
async def process_document(
    request: Request,
    file: UploadFile = File(..., description="PDF to parse, chunk, index in Chroma, and analyze"),
    user: UserContext = Depends(
        require_app_role(AppRole.admin, AppRole.doctor),
    ),
) -> dict:
    """
    Full analysis (narrative + structured violations with page/paragraph citations + audit log).
    """
    name = (file.filename or "").strip()
    if not name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted.",
        )

    content = await file.read()
    if len(content) > settings.process_document_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF exceeds configured size limit.",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file.",
        )

    tmp_path = write_temp_file(content, ".pdf")
    try:
        try:
            return process_uploaded_pdf_sync(
                file_path=tmp_path,
                file_name=name,
                user=user,
                client_ip=_client_ip(request),
            )
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Document processing failed: {e!s}",
            ) from e
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@router.post("/process-document/stream")
async def process_document_stream(
    request: Request,
    file: UploadFile = File(..., description="PDF — streams SSE (tokens + structured violations)"),
    user: UserContext = Depends(
        require_app_role(AppRole.admin, AppRole.doctor),
    ),
) -> StreamingResponse:
    """
    Server-Sent Events: `token` (streaming narrative), `violations` (citations), `audit`, `complete`.
    """
    name = (file.filename or "").strip()
    if not name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted.",
        )
    content = await file.read()
    if len(content) > settings.process_document_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF exceeds configured size limit.",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file.",
        )
    tmp_path = write_temp_file(content, ".pdf")
    ip = _client_ip(request)

    async def event_source() -> AsyncIterator[str]:
        try:
            async for line in stream_compliance_sse(
                tmp_path,
                name,
                user,
                ip,
            ):
                yield line
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
