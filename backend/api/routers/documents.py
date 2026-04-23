from fastapi import APIRouter, Depends

from api.core.rbac import require_role
from api.core.security import Role, UserContext

router = APIRouter()


@router.get("/documents")
def list_documents(
    user: UserContext = Depends(
        require_role(
            Role.org_admin,
            Role.compliance_officer,
            Role.analyst,
            Role.viewer,
        )
    ),
) -> dict:
    """Returns documents the caller can read under RBAC; replace with Supabase queries."""
    return {
        "items": [
            {
                "id": "d0000000-0000-0000-0000-000000000001",
                "title": "HIPAA policies — intake",
                "status": "approved",
                "organization_id": user.organization_id,
            }
        ],
    }
