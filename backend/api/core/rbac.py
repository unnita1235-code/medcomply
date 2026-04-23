from fastapi import Depends, HTTPException, status

from api.core import security
from api.core.security import Role, UserContext, has_any_role


def require_role(*allowed: Role):
    def dep(user: UserContext = Depends(security.get_current_user)) -> UserContext:
        if not has_any_role(user, set(allowed)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this resource.",
            )
        return user

    return dep
