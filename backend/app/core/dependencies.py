from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services.user_service import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = await get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise credentials_exception
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user


async def require_vendeur_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.admin, UserRole.vendeur):
        raise HTTPException(status_code=403, detail="Accès refusé")
    return current_user


async def require_technicien_or_above(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.admin, UserRole.vendeur, UserRole.technicien):
        raise HTTPException(status_code=403, detail="Accès refusé")
    return current_user


async def require_client(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.client:
        raise HTTPException(status_code=403, detail="Accès réservé aux clients")
    return current_user
