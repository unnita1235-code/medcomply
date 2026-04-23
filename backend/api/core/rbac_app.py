from fastapi import Depends, HTTPException, status

from api.core import security
from api.core.app_role import AppRole
from api.core.security import UserContext, has_app_role


def require_app_role(*allowed: AppRole):
    need = set(allowed)

    def dep(user: UserContext = Depends(security.get_current_user)) -> UserContext:
        if not has_app_role(user, need):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient application role for this resource.",
            )
        return user

    return dep
