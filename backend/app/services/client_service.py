from datetime import date, datetime
from io import BytesIO

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate


CLIENT_SORT_FIELDS = {
    "name": Client.last_name,
    "created_at": Client.created_at,
}


async def get_client(db: AsyncSession, client_id: int) -> Client | None:
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    return result.scalar_one_or_none()


async def get_client_by_user_id(db: AsyncSession, user_id: int) -> Client | None:
    result = await db.execute(select(Client).where(Client.user_id == user_id))
    return result.scalar_one_or_none()


async def list_clients(
    db: AsyncSession, skip: int = 0, limit: int = 100, search: str | None = None
) -> list[Client]:
    q = select(Client)
    if search:
        pattern = f"%{search}%"
        q = q.where(
            or_(
                Client.first_name.ilike(pattern),
                Client.last_name.ilike(pattern),
                Client.phone.ilike(pattern),
                Client.email.ilike(pattern),
            )
        )
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def list_clients_paginated(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
) -> tuple[list[Client], int]:
    filters = []
    if search:
        pattern = f"%{search}%"
        filters.append(
            or_(
                Client.first_name.ilike(pattern),
                Client.last_name.ilike(pattern),
                Client.phone.ilike(pattern),
                Client.email.ilike(pattern),
            )
        )

    # Total
    count_q = select(func.count(Client.id))
    for f in filters:
        count_q = count_q.where(f)
    total = (await db.execute(count_q)).scalar_one()

    # Items
    q = select(Client)
    for f in filters:
        q = q.where(f)

    sort_col = CLIENT_SORT_FIELDS.get(order_by) if order_by else None
    if sort_col is not None:
        q = q.order_by(sort_col.desc() if order_dir == "desc" else sort_col.asc())
    else:
        q = q.order_by(Client.id.desc())

    items = (await db.execute(q.offset(skip).limit(limit))).scalars().all()
    return list(items), total


async def create_client(db: AsyncSession, data: ClientCreate, created_by_id: int | None = None) -> Client:
    client = Client(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        address=data.address,
        created_by_id=created_by_id,
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


async def update_client(db: AsyncSession, client: Client, data: ClientUpdate) -> Client:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    await db.flush()
    await db.refresh(client)
    return client


async def link_user_to_client(db: AsyncSession, client_id: int, user_id: int) -> Client | None:
    client = await get_client(db, client_id)
    if client:
        client.user_id = user_id
        await db.flush()
        await db.refresh(client)
    return client


async def export_client_data(db: AsyncSession, client_id: int) -> dict:
    """RGPD — droit à la portabilité (art. 20).
    Retourne toutes les données personnelles que nous détenons sur ce client
    sous forme d'un dictionnaire sérialisable en JSON.
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id)
        .options(selectinload(Client.repairs))
        .options(selectinload(Client.quotes))
        .options(selectinload(Client.appointments))
    )
    client = result.scalar_one_or_none()
    if not client:
        return {}

    return {
        "export_format": "TradeTrack RGPD export v1",
        "client": {
            "id": client.id,
            "first_name": client.first_name,
            "last_name": client.last_name,
            "email": client.email,
            "phone": client.phone,
            "address": client.address,
            "created_at": client.created_at.isoformat() if client.created_at else None,
        },
        "repairs": [
            {
                "id": r.id,
                "date": r.created_at.isoformat() if r.created_at else None,
                "device_type": r.device_type,
                "device_brand": r.device_brand,
                "device_model": r.device_model,
                "status": r.status,
                "problem_description": r.problem_description,
                "repair_cost_ttc": float(r.repair_cost_ttc),
            }
            for r in client.repairs
        ],
        "quotes": [
            {
                "id": q.id,
                "date": q.created_at.isoformat() if q.created_at else None,
                "total_ttc": float(q.total_ttc),
                "status": q.status,
                "notes": q.notes,
            }
            for q in client.quotes
        ],
        "appointments": [
            {
                "id": a.id,
                "title": a.title,
                "start_datetime": a.start_datetime.isoformat() if a.start_datetime else None,
                "end_datetime": a.end_datetime.isoformat() if a.end_datetime else None,
                "status": a.status,
            }
            for a in client.appointments
        ],
    }


def _fmt_dt(value, with_time: bool = False) -> str:
    """Formate une date ISO en jj/mm/aaaa (ou avec l'heure). '—' si absente."""
    if not value:
        return "—"
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return value
    return dt.strftime("%d/%m/%Y %H:%M" if with_time else "%d/%m/%Y")


def _repair_flowables(r: dict, styles) -> list:
    """Bloc PDF pour une réparation."""
    device = r["device_type"]
    if r.get("device_brand"):
        device += f" {r['device_brand']}"
    if r.get("device_model"):
        device += f" {r['device_model']}"
    return [
        Paragraph(f"<b>Réparation #{r['id']}</b> — {device}", styles["ItemTitle"]),
        Paragraph(
            f"Date : {_fmt_dt(r['date'])} | Statut : {r['status']} | "
            f"Coût TTC : {float(r['repair_cost_ttc']):.2f} €",
            styles["ItemLine"],
        ),
        Paragraph(f"Problème : {r.get('problem_description') or '—'}", styles["ItemLine"]),
    ]


def _quote_flowables(q: dict, styles) -> list:
    """Bloc PDF pour un devis."""
    return [
        Paragraph(
            f"<b>Devis #{q['id']}</b> — Total : {float(q['total_ttc']):.2f} € | "
            f"Statut : {q['status']} | Créé le : {_fmt_dt(q['date'])}",
            styles["ItemLine"],
        ),
    ]


def _appointment_flowables(a: dict, styles) -> list:
    """Bloc PDF pour un rendez-vous."""
    return [
        Paragraph(
            f"<b>{a.get('title') or 'Rendez-vous'}</b> — "
            f"{_fmt_dt(a['start_datetime'], with_time=True)} → {_fmt_dt(a['end_datetime'], with_time=True)} | "
            f"Statut : {a['status']}",
            styles["ItemLine"],
        ),
    ]


def _draw_footer(canvas, doc) -> None:
    """Pied de page fixe (mention RGPD art. 20) sur chaque page."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(
        18 * mm, 12 * mm,
        "Ce document contient l'intégralité des données personnelles détenues par TradeTrack "
        "à votre sujet, conformément à l'article 20 du RGPD.",
    )
    canvas.restoreState()


def _hr():
    """Séparateur horizontal léger entre deux blocs."""
    return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#dddddd"), spaceBefore=4, spaceAfter=4)


def _render_section(elements: list, title: str, items: list, builder, styles, empty_label: str) -> None:
    """Ajoute une section (titre + blocs séparés, ou mention 'vide')."""
    elements.append(Paragraph(title, styles["Heading2"]))
    if not items:
        elements.append(Paragraph(empty_label, styles["ItemLine"]))
    else:
        for i, item in enumerate(items):
            elements.extend(builder(item, styles))
            if i < len(items) - 1:
                elements.append(_hr())
    elements.append(Spacer(1, 8 * mm))


async def export_client_data_pdf(db: AsyncSession, client_id: int) -> bytes:
    """RGPD — droit à la portabilité (art. 20), version PDF lisible.
    Construit un PDF A4 à partir des données structurées de export_client_data.
    """
    data = await export_client_data(db, client_id)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ItemTitle", parent=styles["Normal"], fontSize=11, spaceAfter=2))
    styles.add(ParagraphStyle(
        name="ItemLine", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#444444"), leading=12,
    ))

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=18 * mm, rightMargin=18 * mm,
    )
    elements: list = []

    # En-tête
    elements.append(Paragraph("Vos données personnelles", styles["Title"]))
    elements.append(Paragraph(
        f"Export effectué le {date.today().strftime('%d/%m/%Y')} — TradeTrack", styles["Normal"],
    ))
    elements.append(Spacer(1, 8 * mm))

    # Section 1 — informations (tableau Champ / Valeur)
    c = data.get("client", {})
    elements.append(Paragraph("Vos informations", styles["Heading2"]))
    info_rows = [
        ["Nom", c.get("last_name") or "—"],
        ["Prénom", c.get("first_name") or "—"],
        ["Email", c.get("email") or "—"],
        ["Téléphone", c.get("phone") or "—"],
        ["Adresse", c.get("address") or "—"],
        ["Client depuis", _fmt_dt(c.get("created_at"))],
    ]
    table = Table(info_rows, colWidths=[40 * mm, 134 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8 * mm))

    # Sections 2 à 4 — réparations / devis / rendez-vous
    _render_section(elements, "Vos réparations", data.get("repairs", []), _repair_flowables, styles, "Aucune réparation.")
    _render_section(elements, "Vos devis", data.get("quotes", []), _quote_flowables, styles, "Aucun devis.")
    _render_section(elements, "Vos rendez-vous", data.get("appointments", []), _appointment_flowables, styles, "Aucun rendez-vous.")

    doc.build(elements, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    return buffer.getvalue()


async def anonymize_client(db: AsyncSession, client: Client, user: User | None = None) -> None:
    """RGPD — droit à l'effacement (art. 17).
    Anonymise les données personnelles du client tout en conservant les écritures
    comptables (ventes, devis, réparations) qui ont une obligation de conservation
    légale de 10 ans en France.
    """
    client.first_name = "Anonyme"
    client.last_name = f"#{client.id}"
    client.email = None
    client.phone = None
    client.address = None

    if user is not None:
        # On désactive le compte et on rend l'email unique mais non-identifiant
        user.is_active = False
        user.email = f"anonymized_{user.id}@tradetrack.fr"
        user.first_name = "Anonyme"
        user.last_name = f"#{user.id}"
        user.phone = None
        # Vide la demande de suppression → la ligne disparaît de la liste admin.
        user.deletion_requested_at = None

    await db.flush()
