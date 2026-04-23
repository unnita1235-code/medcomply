from fastapi import APIRouter, Depends

from api.core.rbac import require_role
from api.core.security import Role, UserContext

router = APIRouter()


@router.get("/organizations/current")
def current_organization(
    user: UserContext = Depends(
        require_role(Role.org_admin, Role.compliance_officer, Role.analyst, Role.viewer)
    ),
) -> dict:
    return {
        "id": user.organization_id,
        "name": "Demo organization",
    }
