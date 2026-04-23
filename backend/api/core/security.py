import os
from dataclasses import dataclass, field
from enum import Enum

from fastapi import Header, HTTPException, status

from api.core.app_role import AppRole


class Role(str, Enum):
    org_admin = "org_admin"
    compliance_officer = "compliance_officer"
    analyst = "analyst"
    viewer = "viewer"


@dataclass
class UserContext:
    id: str
    organization_id: str
    roles: set[Role] = field(default_factory=set)
    app_role: AppRole = AppRole.staff


def has_any_role(user: UserContext, need: set[Role]) -> bool:
    if not need:
        return True
    return bool(user.roles & need)


def has_app_role(user: UserContext, need: set[AppRole]) -> bool:
    if not need:
        return True
    return user.app_role in need


def _parse_app_role(value: str | None) -> AppRole:
    if not value:
        return AppRole.staff
    key = value.strip().lower()
    try:
        return AppRole(key)
    except ValueError:
        return AppRole.staff


def _parse_roles(value: str) -> set[Role]:
    raw = {p.strip() for p in value.split(",") if p.strip()}
    out: set[Role] = set()
    for r in raw:
        try:
            out.add(Role(r))
        except ValueError:
            continue
    return out or {Role.viewer}


def get_current_user(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_user_roles: str | None = Header(default=None, alias="X-User-Roles"),
    x_user_app_role: str | None = Header(default=None, alias="X-User-App-Role"),
) -> UserContext:
    """
    Production: replace with verified JWT (Clerk / Supabase) and map to org membership.

    Local: optional headers, or an anonymous dev user when API_ALLOW_DEV_USER=1 (default).
    """
    if x_user_id and x_org_id:
        roles = (
            _parse_roles(x_user_roles)
            if x_user_roles
            else {Role.viewer}
        )
        return UserContext(
            id=x_user_id,
            organization_id=x_org_id,
            roles=roles,
            app_role=_parse_app_role(x_user_app_role),
        )
    if os.getenv("API_ALLOW_DEV_USER", "1") == "1":
        return UserContext(
            id="00000000-0000-0000-0000-0000000000aa",
            organization_id="00000000-0000-0000-0000-000000000001",
            roles={Role.org_admin, Role.compliance_officer},
            app_role=AppRole.doctor,
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing auth context. Provide gateway-signed headers or JWT validation.",
    )
