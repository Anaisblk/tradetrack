"""Script de données initiales pour TradeTrack.
Usage: cd backend && python seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.models import *  # noqa: F401,F403

engine = create_async_engine(settings.DATABASE_URL)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)


async def seed():
    async with AsyncSession() as db:
        async with db.begin():
            # Staff accounts
            from app.models.user import User, UserRole
            admin = User(
                email="admin@tradetrack.fr",
                hashed_password=hash_password("admin123"),
                role=UserRole.admin,
                first_name="Admin",
                last_name="TradeTrack",
                phone="0600000000",
                is_active=True,
            )
            db.add(admin)

            vendeur = User(
                email="vendeur@tradetrack.fr",
                hashed_password=hash_password("vendeur123"),
                role=UserRole.vendeur,
                first_name="Marie",
                last_name="Dupont",
                phone="0611111111",
                is_active=True,
            )
            db.add(vendeur)

            tech = User(
                email="tech@tradetrack.fr",
                hashed_password=hash_password("tech123"),
                role=UserRole.technicien,
                first_name="Pierre",
                last_name="Martin",
                phone="0622222222",
                is_active=True,
            )
            db.add(tech)
            await db.flush()

            # Categories
            from app.models.category import Category
            cats = [
                Category(name="Téléphone", type="article"),
                Category(name="PC Portable", type="article"),
                Category(name="Batterie", type="piece"),
                Category(name="Écran", type="piece"),
                Category(name="Accessoires", type="article"),
            ]
            for c in cats: db.add(c)
            await db.flush()

            # Products
            from app.models.product import Product
            products = [
                Product(name="iPhone 14 Pro", category_id=cats[0].id, barcode="PHONE001", purchase_price=800, selling_price=1099, stock_quantity=5, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="Samsung Galaxy S24", category_id=cats[0].id, barcode="PHONE002", purchase_price=700, selling_price=999, stock_quantity=3, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="iPhone 13 reconditionné", category_id=cats[0].id, barcode="PHONE003", purchase_price=400, selling_price=599, stock_quantity=8, condition="occasion", tva_rate=20.0, created_by_id=admin.id),
                Product(name="MacBook Air M2", category_id=cats[1].id, barcode="PC001", purchase_price=1100, selling_price=1499, stock_quantity=4, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="Dell XPS 15", category_id=cats[1].id, barcode="PC002", purchase_price=1300, selling_price=1799, stock_quantity=2, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="Batterie iPhone 14", category_id=cats[2].id, barcode="BAT001", purchase_price=20, selling_price=49, stock_quantity=20, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="Batterie Samsung S24", category_id=cats[2].id, barcode="BAT002", purchase_price=18, selling_price=45, stock_quantity=15, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="Écran iPhone 14", category_id=cats[3].id, barcode="SCREEN001", purchase_price=80, selling_price=149, stock_quantity=10, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="Coque iPhone 14", category_id=cats[4].id, barcode="ACC001", purchase_price=5, selling_price=19, stock_quantity=30, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
                Product(name="Câble USB-C", category_id=cats[4].id, barcode="ACC002", purchase_price=3, selling_price=12, stock_quantity=1, condition="neuf", tva_rate=20.0, created_by_id=admin.id),
            ]
            for p in products: db.add(p)
            await db.flush()

            # Clients
            from app.models.client import Client

            clients_data = [
                ("Jean", "Dupuis", "0633333333", "jean.dupuis@email.fr"),
                ("Sophie", "Bernard", "0644444444", "sophie.b@email.fr"),
                ("Marc", "Legrand", "0655555555", "marc.l@email.fr"),
                ("Claire", "Simon", "0666666666", "claire.s@email.fr"),
                ("Thomas", "Michel", "0677777777", "thomas.m@email.fr"),
            ]
            clients = []
            for fn, ln, phone, email in clients_data:
                c = Client(first_name=fn, last_name=ln, phone=phone, email=email, created_by_id=vendeur.id)
                db.add(c)
                clients.append(c)
            await db.flush()


    print("✅ Données de seed créées avec succès !")
    print("\nComptes créés :")
    print("  Admin : admin@tradetrack.fr / admin123")
    print("  Vendeur : vendeur@tradetrack.fr / vendeur123")
    print("  Technicien : tech@tradetrack.fr / tech123")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
