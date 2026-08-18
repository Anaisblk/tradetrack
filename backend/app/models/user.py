from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class UserRole(str, Enum):
    admin = "admin"
    vendeur = "vendeur"
    technicien = "technicien"
    client = "client"


class ApprovalStatus(str, Enum):
    """Décision de l'administrateur sur une demande de création de compte.

    Distinct de `is_active`, qui reste le verrou de connexion : sans cette colonne, un
    compte jamais validé et un compte suspendu seraient tous deux `is_active=False`,
    donc indiscernables dans l'interface d'administration.
    """

    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.client)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # `server_default` : les comptes déjà en base restent valides après la migration.
    # Le défaut `approved` couvre aussi les comptes créés par un administrateur, qui
    # sont utilisables immédiatement ; seule l'inscription publique pose `pending`.
    approval_status: Mapped[str] = mapped_column(
        String(20), nullable=False,
        default=ApprovalStatus.approved, server_default=ApprovalStatus.approved.value,
    )
    deletion_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    client = relationship("Client", foreign_keys="Client.user_id", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")
    created_clients = relationship("Client", foreign_keys="Client.created_by_id", back_populates="created_by")
    repairs = relationship("Repair", foreign_keys="Repair.technicien_id", back_populates="technicien")
    quotes = relationship("Quote", foreign_keys="Quote.created_by_id", back_populates="created_by")
    appointments_created = relationship("Appointment", foreign_keys="Appointment.created_by_id", back_populates="created_by")
    appointments_assigned = relationship("Appointment", foreign_keys="Appointment.assigned_to_id", back_populates="assigned_to")
