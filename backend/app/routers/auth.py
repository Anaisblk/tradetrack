from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.db.session import get_db
from app.models.user import ApprovalStatus, UserRole
from app.schemas.user import Token, TokenRefresh, UserCreate, UserResponse
from app.services import client_service, notification_service, user_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await user_service.authenticate_user(db, form.username, form.password)
    if not user:
        # Un compte en attente ou refusé échoue aussi ici (is_active=False). Sans message
        # dédié, le client croirait s'être trompé de mot de passe et réessaierait sans fin.
        pending = await user_service.get_user_by_email(db, form.username)
        if pending and pending.approval_status == ApprovalStatus.pending:
            raise HTTPException(
                status_code=403,
                detail="Votre compte est en attente de validation par un administrateur.",
            )
        if pending and pending.approval_status == ApprovalStatus.rejected:
            raise HTTPException(status_code=403, detail="Votre demande de compte a été refusée.")
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token_data = {"sub": str(user.id), "role": user.role}
    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user,
    )


@router.post("/register", response_model=UserResponse)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await user_service.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    data.role = UserRole.client

    user = await user_service.create_user(db, data)
    # Le compte attend la validation d'un administrateur : `is_active=False` suffit à
    # bloquer la connexion (authenticate_user et get_current_user le vérifient déjà).
    user.approval_status = ApprovalStatus.pending
    user.is_active = False
    await db.flush()

    existing_client = await client_service.get_client_by_user_id(db, user.id)
    if not existing_client:
        from app.schemas.client import ClientCreate
        client_data = ClientCreate(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
        )
        client = await client_service.create_client(db, client_data)
        client.user_id = user.id
        await db.flush()

    await notification_service.create_for_admins(
        db,
        type="compte_a_valider",
        title="Nouvelle demande de compte",
        message=f"{user.first_name} {user.last_name} ({user.email}) attend une validation.",
        related_object_id=user.id,
        related_object_type="user",
    )

    await db.commit()
    return user


@router.post("/refresh", response_model=Token)
async def refresh_token(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token invalide")
    user_id = payload.get("sub")
    user = await user_service.get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    token_data = {"sub": str(user.id), "role": user.role}
    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user,
    )
