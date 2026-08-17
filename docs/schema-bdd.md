# Schéma de la base de données

11 tables PostgreSQL, gérées par SQLAlchemy 2.0 et versionnées avec Alembic. Les modèles
font foi : [`backend/app/models/`](../backend/app/models/).

## Organisation

| Domaine | Tables |
|---|---|
| Identité et accès | `users`, `clients` |
| Catalogue et stock | `categories`, `products`, `stock_movements` |
| Devis | `quotes`, `quote_items` |
| Réparations | `repairs`, `repair_items` |
| Planning et alertes | `appointments`, `notifications` |

## Diagramme entité-association

```mermaid
erDiagram
    USERS ||--o| CLIENTS : "compte"
    USERS ||--o{ REPAIRS : "technicien"
    USERS ||--o{ QUOTES : "crée"
    USERS ||--o{ APPOINTMENTS : "crée/assigné"
    USERS ||--o{ NOTIFICATIONS : "destinataire"
    USERS ||--o{ PRODUCTS : "ajoute"
    USERS ||--o{ STOCK_MOVEMENTS : "effectue"

    CLIENTS ||--o{ REPAIRS : "fait réparer"
    CLIENTS ||--o{ QUOTES : "reçoit"
    CLIENTS ||--o{ APPOINTMENTS : "réserve"

    CATEGORIES ||--o{ PRODUCTS : "regroupe"
    PRODUCTS ||--o{ QUOTE_ITEMS : "devisé via"
    PRODUCTS ||--o{ REPAIR_ITEMS : "utilisé en répa"
    PRODUCTS ||--o{ STOCK_MOVEMENTS : "tracé"

    QUOTES ||--o{ QUOTE_ITEMS : "contient"
    REPAIRS ||--o{ REPAIR_ITEMS : "consomme"


    USERS {
        int id PK
        string email UK
        string hashed_password
        string role
        string first_name
        string last_name
        string phone
        bool is_active
    }
    CLIENTS {
        int id PK
        int user_id FK "unique, nullable"
        int created_by_id FK
        string first_name
        string last_name
        string email
        string phone
        text address
    }
    CATEGORIES {
        int id PK
        string name
        string type
    }
    PRODUCTS {
        int id PK
        int category_id FK
        int created_by_id FK
        string name
        string barcode UK
        decimal purchase_price
        decimal selling_price
        int stock_quantity
        string condition
        decimal tva_rate
    }
    STOCK_MOVEMENTS {
        int id PK
        int product_id FK
        int created_by_id FK
        string movement_type
        int quantity
        text reason
    }
    QUOTES {
        int id PK
        int client_id FK
        int created_by_id FK
        decimal total_ttc
        string status
        date valid_until
    }
    QUOTE_ITEMS {
        int id PK
        int quote_id FK
        int product_id FK "nullable"
        string description
        int quantity
        decimal unit_price_ht
        decimal subtotal_ttc
    }
    REPAIRS {
        int id PK
        int client_id FK
        int technicien_id FK
        string device_type
        string device_brand
        string device_model
        string status
        decimal repair_cost_ttc
    }
    REPAIR_ITEMS {
        int id PK
        int repair_id FK
        int product_id FK
        int quantity
        decimal subtotal_ttc
    }
    APPOINTMENTS {
        int id PK
        int client_id FK
        int created_by_id FK
        int assigned_to_id FK
        string title
        timestamp start_datetime
        timestamp end_datetime
        string status
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        string type
        string title
        text message
        bool is_read
    }
```

## Choix de modélisation

**Séparation `users` / `clients`.** Un client de la boutique n'a pas forcément de compte :
`clients.user_id` est nullable et unique. Une fiche peut donc être créée au comptoir, puis
rattachée plus tard à un compte si la personne souhaite accéder au portail. Le personnel
(admin, vendeur, technicien) n'existe que dans `users`.

**Lignes de document dissociées du catalogue.** `quote_items` et `repair_items` figent
le prix et le taux de TVA au moment de l'opération. Modifier le prix
d'un produit ne réécrit donc jamais l'historique — indispensable pour des pièces comptables.
`quote_items.product_id` est nullable : un devis peut porter une prestation libre, décrite
en texte, sans référence au catalogue.

**Prix et TVA en `decimal`.** Jamais de flottant sur des montants : les erreurs d'arrondi
binaires sont inacceptables sur des écritures comptables.

**`condition` sur les produits.** Distingue le neuf de l'occasion, ce qui détermine le
régime de TVA appliqué aux pièces facturées — TVA classique ou TVA sur marge. Voir les règles métier dans le
[README](../README.md).

**Stock tracé plutôt que calculé.** `products.stock_quantity` porte l'état courant tandis
que `stock_movements` conserve chaque entrée et sortie avec son motif. La redondance est
assumée : elle évite de recalculer un cumul à chaque affichage tout en préservant l'audit.

## Générer une image du diagramme

Le bloc Mermaid ci-dessus est rendu automatiquement par GitHub. Pour l'exporter en PNG ou
SVG, le coller sur [mermaid.live](https://mermaid.live).

## Faire évoluer le schéma

Toute modification passe par une migration Alembic, jamais par une écriture directe :

```bash
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```
