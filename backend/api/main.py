from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import settings
from api.routers import documents, health, organizations, process_document

app = FastAPI(
    title="MedComply API",
    description="Medical compliance vertical API — FastAPI with mandatory RBAC.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/v1", tags=["health"])
app.include_router(organizations.router, prefix="/v1", tags=["organizations"])
app.include_router(documents.router, prefix="/v1", tags=["documents"])
app.include_router(process_document.router, prefix="/v1", tags=["compliance"])


@app.get("/")
def root() -> dict:
    return {
        "name": "medcomply-api",
        "docs": "/docs",
    }
