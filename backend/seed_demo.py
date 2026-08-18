"""Large demo dataset: random but realistic clients, products and repairs.
Cumulative — running it again adds a new batch instead of replacing anything.

    docker compose exec backend python seed_demo.py
"""
import asyncio
import os
import random
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.models import *  # noqa: F401,F403
from app.models.category import Category
from app.models.client import Client
from app.models.product import Product
from app.models.repair import Repair, RepairItem
from app.models.user import User, UserRole


# === Default volumes ===
NB_CLIENTS = 150
NB_PRODUCTS = 150
NB_REPAIRS = 200

# === Name and model lists ===
PRENOMS = [
    "Lucas", "Léa", "Hugo", "Emma", "Jules", "Chloé", "Louis", "Manon", "Gabriel", "Inès",
    "Arthur", "Camille", "Adam", "Sarah", "Raphaël", "Lina", "Nathan", "Anaïs", "Maxime", "Jade",
    "Théo", "Louise", "Tom", "Alice", "Ethan", "Zoé", "Sacha", "Mia", "Liam", "Eva",
    "Léo", "Romane", "Nolan", "Lola", "Antoine", "Clara", "Mathis", "Maëlys", "Tristan", "Juliette",
]

NOMS = [
    "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau",
    "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier",
    "Morel", "Girard", "André", "Lefèvre", "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez",
    "Legrand", "Garnier", "Faure", "Rousseau", "Blanc", "Guerin", "Muller", "Henry", "Roussel", "Nicolas",
]

DEVICE_TYPES = [
    ("Smartphone", ["Apple", "Samsung", "Google", "Xiaomi", "OnePlus", "Honor"]),
    ("PC Portable", ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI"]),
    ("Tablette", ["Apple", "Samsung", "Lenovo"]),
    ("Console", ["Sony", "Microsoft", "Nintendo"]),
]

DEVICE_MODELS = [
    "iPhone 13", "iPhone 14 Pro", "iPhone 15", "Galaxy S23", "Galaxy A54", "Pixel 7a",
    "Redmi Note 13", "MacBook Air M2", "XPS 13", "ThinkPad X1", "IdeaPad 5", "ZenBook 14",
    "iPad Air", "Galaxy Tab S9", "PlayStation 5", "Switch OLED",
]

PROBLEMS = [
    "Écran cassé suite à une chute",
    "Batterie qui se décharge très vite",
    "Ne s'allume plus",
    "Connecteur de charge défectueux",
    "Oxydation après contact avec un liquide",
    "Surchauffe et ralentissements",
    "Haut-parleur muet",
    "Clavier partiellement inopérant",
    "Ventilateur bruyant",
]

VILLES = ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Bordeaux", "Lille", "Rennes"]
RUES = ["Rue de la Paix", "Avenue Victor Hugo", "Rue du Commerce", "Boulevard Saint-Michel", "Rue Lafayette",
        "Avenue des Champs-Élysées", "Rue de Rivoli", "Boulevard Haussmann", "Rue Saint-Honoré", "Avenue Foch"]

# Models grouped by category
PRODUCTS_BY_CATEGORY = {
    "Téléphone": [
        ("iPhone 15 Pro Max", 1200, 1599), ("iPhone 15 Pro", 1000, 1299), ("iPhone 15", 800, 999),
        ("iPhone 14 Pro", 900, 1199), ("iPhone 14", 700, 899), ("iPhone 13", 600, 799),
        ("Samsung Galaxy S24 Ultra", 1100, 1499), ("Samsung Galaxy S24+", 900, 1199), ("Samsung Galaxy S24", 700, 949),
        ("Samsung Galaxy S23", 600, 849), ("Samsung Galaxy A54", 350, 499), ("Samsung Galaxy A34", 280, 399),
        ("Google Pixel 8 Pro", 850, 1099), ("Google Pixel 8", 600, 799), ("Google Pixel 7a", 400, 549),
        ("Xiaomi 14 Ultra", 950, 1299), ("Xiaomi 13T Pro", 600, 799), ("Xiaomi Redmi Note 13", 220, 329),
        ("OnePlus 12", 800, 1049), ("OnePlus Nord 3", 350, 499), ("Honor Magic 6 Pro", 850, 1099),
    ],
    "PC Portable": [
        ("MacBook Pro 16 M3", 2400, 2999), ("MacBook Pro 14 M3", 1700, 2199), ("MacBook Air 13 M2", 1100, 1399),
        ("MacBook Air 15 M2", 1300, 1599), ("Dell XPS 15", 1500, 1899), ("Dell XPS 13", 1100, 1449),
        ("HP Spectre x360", 1300, 1699), ("HP Pavilion 15", 600, 849), ("HP EliteBook 840", 1100, 1499),
        ("Lenovo ThinkPad X1 Carbon", 1500, 1899), ("Lenovo IdeaPad 5", 600, 829), ("Lenovo Legion 5 Pro", 1300, 1699),
        ("Asus ZenBook 14", 950, 1249), ("Asus ROG Strix G15", 1100, 1499), ("Asus VivoBook 15", 550, 779),
        ("Acer Swift 5", 900, 1199), ("Acer Predator Helios 16", 1500, 1999), ("MSI Stealth 14", 1400, 1799),
        ("Microsoft Surface Laptop 5", 1100, 1399), ("Razer Blade 15", 1900, 2499),
    ],
    "Batterie": [
        ("Batterie iPhone 15 Pro", 25, 79), ("Batterie iPhone 14", 22, 69), ("Batterie iPhone 13", 20, 65),
        ("Batterie iPhone 12", 18, 59), ("Batterie iPhone 11", 15, 49), ("Batterie Samsung S24", 25, 75),
        ("Batterie Samsung S23", 22, 69), ("Batterie Samsung A54", 18, 55), ("Batterie Samsung A34", 16, 49),
        ("Batterie Pixel 8", 22, 69), ("Batterie Xiaomi 14", 20, 65), ("Batterie OnePlus 12", 25, 75),
        ("Batterie MacBook Pro 14", 80, 199), ("Batterie MacBook Air M2", 70, 179), ("Batterie Dell XPS", 60, 149),
    ],
    "Écran": [
        ("Écran iPhone 15 Pro Max", 120, 299), ("Écran iPhone 15", 90, 229), ("Écran iPhone 14 Pro", 110, 269),
        ("Écran iPhone 13", 80, 199), ("Écran iPhone 12", 70, 179), ("Écran iPhone 11", 55, 139),
        ("Écran Samsung S24", 130, 309), ("Écran Samsung S23", 110, 269), ("Écran Samsung A54", 60, 149),
        ("Écran Pixel 8 Pro", 120, 289), ("Écran Xiaomi 14", 100, 249), ("Écran OnePlus 12", 110, 259),
        ("Écran MacBook Pro 14", 350, 749), ("Écran MacBook Air M2", 280, 599),
    ],
    "Accessoires": [
        ("Coque iPhone 15", 5, 24), ("Coque iPhone 14", 4, 19), ("Coque Samsung S24", 5, 22),
        ("Coque Pixel 8", 4, 19), ("Câble USB-C 1m", 2, 12), ("Câble Lightning 1m", 3, 14),
        ("Chargeur 20W USB-C", 8, 24), ("Chargeur 65W GaN", 18, 49), ("Adaptateur secteur 5W", 3, 12),
        ("Verre trempé iPhone", 2, 14), ("Verre trempé Samsung", 2, 14), ("Support voiture magnétique", 8, 24),
        ("Écouteurs filaires USB-C", 6, 19), ("Hub USB-C 7-en-1", 18, 49), ("Tapis de souris", 4, 14),
        ("Sacoche PC 15 pouces", 12, 34), ("Souris sans fil", 8, 24), ("Clavier Bluetooth", 22, 59),
    ],
}


def random_phone():
    return f"06{random.randint(10000000, 99999999):08d}"


def random_email(first, last):
    domain = random.choice(["gmail.com", "outlook.fr", "free.fr", "yahoo.fr", "orange.fr", "hotmail.fr"])
    return f"{first.lower()}.{last.lower()}{random.randint(1, 999)}@{domain}"


def random_address():
    return f"{random.randint(1, 250)} {random.choice(RUES)}, {random.randint(75001, 75020):05d} {random.choice(VILLES)}"


def random_barcode(existing_barcodes):
    while True:
        bc = f"{random.randint(1000000000000, 9999999999999)}"
        if bc not in existing_barcodes:
            existing_barcodes.add(bc)
            return bc


engine = create_async_engine(settings.DATABASE_URL)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)


async def get_or_create_admin(db):
    result = await db.execute(select(User).where(User.role == UserRole.admin).limit(1))
    admin = result.scalar_one_or_none()
    if admin:
        return admin
    admin = User(
        email="admin@tradetrack.fr",
        hashed_password=hash_password("admin123"),
        role=UserRole.admin,
        first_name="Admin",
        last_name="TradeTrack",
    )
    db.add(admin)
    await db.flush()
    return admin


async def get_or_create_categories(db):
    """Makes sure the 5 base categories exist."""
    needed = [
        ("Téléphone", "article"),
        ("PC Portable", "article"),
        ("Batterie", "piece"),
        ("Écran", "piece"),
        ("Accessoires", "article"),
    ]
    result = await db.execute(select(Category))
    existing = {c.name: c for c in result.scalars().all()}
    cats = {}
    for name, type_ in needed:
        if name in existing:
            cats[name] = existing[name]
        else:
            c = Category(name=name, type=type_)
            db.add(c)
            cats[name] = c
    await db.flush()
    return cats


async def existing_barcodes(db):
    result = await db.execute(select(Product.barcode).where(Product.barcode.is_not(None)))
    return {row[0] for row in result.all()}


async def seed_clients(db, n):
    clients = []
    for _ in range(n):
        first = random.choice(PRENOMS)
        last = random.choice(NOMS)
        c = Client(
            first_name=first,
            last_name=last,
            email=random_email(first, last) if random.random() > 0.2 else None,
            phone=random_phone() if random.random() > 0.1 else None,
            address=random_address() if random.random() > 0.5 else None,
        )
        db.add(c)
        clients.append(c)
    await db.flush()
    return clients


async def seed_products(db, n, admin_id, categories):
    barcodes = await existing_barcodes(db)
    products = []
    # Spread more or less evenly across categories
    cat_names = list(PRODUCTS_BY_CATEGORY.keys())
    for _ in range(n):
        cat_name = random.choice(cat_names)
        name, min_price, max_price = random.choice(PRODUCTS_BY_CATEGORY[cat_name])
        # Small name variation to avoid duplicates
        suffix = "" if random.random() > 0.3 else f" ({random.choice(['Noir', 'Blanc', 'Bleu', 'Gris', 'Rose'])})"
        condition = "occasion" if random.random() < 0.15 else "neuf"
        # Prices incl. VAT
        selling = round(random.uniform(min_price, max_price), 2)
        purchase = round(selling * random.uniform(0.55, 0.75), 2)
        p = Product(
            name=name + suffix,
            category_id=categories[cat_name].id,
            barcode=random_barcode(barcodes),
            purchase_price=purchase,
            selling_price=selling,
            stock_quantity=random.randint(0, 50),
            condition=condition,
            tva_rate=20.0,
            created_by_id=admin_id,
        )
        db.add(p)
        products.append(p)
    await db.flush()
    return products


async def seed_repairs(db, n, technicien_id, products, clients):
    """Generates n repairs with 0 to 3 parts each. Amounts are pre-computed and the
    business service is skipped, to avoid stock movements and notifications."""
    repairs = []
    total_items = 0
    statuses = ["repare"] * 7 + ["en_cours"] * 2 + ["recu"] * 1

    for _ in range(n):
        status = random.choice(statuses)
        device_type, brands = random.choice(DEVICE_TYPES)
        brand = random.choice(brands)

        main_cost = round(random.uniform(29.0, 320.0), 2)
        parts_ttc = 0.0
        nb_parts = random.randint(0, 3)

        repair = Repair(
            client_id=random.choice(clients).id if random.random() > 0.15 else None,
            technicien_id=technicien_id,
            device_type=device_type,
            device_brand=brand,
            device_model=random.choice(DEVICE_MODELS),
            problem_description=random.choice(PROBLEMS),
            status=status,
            estimated_cost=main_cost,
            repair_cost_ht=0.0,
            tva_amount=0.0,
            repair_cost_ttc=0.0,
        )
        # Closed repairs get a date in the last 90 days: this feeds the dashboard revenue
        if status == "repare":
            repair.completed_date = date.today() - timedelta(days=random.randint(0, 90))
        db.add(repair)
        await db.flush()

        for _ in range(nb_parts):
            product = random.choice(products)
            qty = random.randint(1, 2)
            unit_ttc = float(product.selling_price)
            subtotal_ttc = round(qty * unit_ttc, 2)
            db.add(RepairItem(
                repair_id=repair.id,
                product_id=product.id,
                quantity=qty,
                unit_price_ht=round(unit_ttc / 1.20, 2),
                subtotal_ttc=subtotal_ttc,
            ))
            parts_ttc += subtotal_ttc
            total_items += 1

        total_ttc = round(main_cost + parts_ttc, 2)
        repair.repair_cost_ttc = total_ttc
        repair.tva_amount = round(total_ttc * 20.0 / 120.0, 2)
        repair.repair_cost_ht = round(total_ttc - repair.tva_amount, 2)
        repairs.append(repair)

    await db.flush()
    return repairs, total_items


async def main():
    print("→ Connexion à la base de données…")
    async with AsyncSession() as db:
        async with db.begin():
            admin = await get_or_create_admin(db)
            print(f"  Admin : {admin.email}")

            categories = await get_or_create_categories(db)
            print(f"  Catégories ({len(categories)}) : {', '.join(categories.keys())}")

            print(f"→ Création de {NB_CLIENTS} clients…")
            clients = await seed_clients(db, NB_CLIENTS)
            print(f"  ✓ {len(clients)} clients créés")

            print(f"→ Création de {NB_PRODUCTS} produits…")
            products = await seed_products(db, NB_PRODUCTS, admin.id, categories)
            print(f"  ✓ {len(products)} produits créés")

            # Use every product and client, existing ones included
            all_products = (await db.execute(select(Product))).scalars().all()
            all_clients = (await db.execute(select(Client))).scalars().all()

            print(f"→ Création de {NB_REPAIRS} réparations…")
            repairs, nb_items = await seed_repairs(db, NB_REPAIRS, admin.id, list(all_products), list(all_clients))
            print(f"  ✓ {len(repairs)} réparations créées ({nb_items} pièces consommées)")

    print("\n✓ Seed terminé avec succès.")


if __name__ == "__main__":
    asyncio.run(main())
