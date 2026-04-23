# MedComply FastAPI — production-oriented image
FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api ./api

# Writable volumes for Chroma and JSONL audit trail (set via env in compose or orchestrator)
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /data/chroma /data/audit \
    && chown -R appuser:appuser /data /app

USER appuser

ENV CHROMA_PERSIST_DIRECTORY=/data/chroma \
    AUDIT_LOG_DIRECTORY=/data/audit

EXPOSE 8000

# Production: set API_ALLOW_DEV_USER=0 and use verified auth (e.g. gateway / JWT) — see .env.example
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
