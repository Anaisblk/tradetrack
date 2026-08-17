# TradeTrack

Application de gestion pour atelier de réparation en téléphonie et informatique :
réparations, devis, pièces détachées, clients et planning, avec un portail client
conforme au RGPD.

Projet de fin d'année — application web complète, de la base de données à l'interface.

## Fonctionnalités

- **Réparations** — suivi par statut, pièces consommées, coût estimé, historique paginé
- **Devis** — création à partir d'un appareil et de pièces, transformation en réparation
- **Pièces détachées** — stock, mouvements tracés, alertes automatiques de seuil bas
- **Clients** — fiches, recherche, historique des interventions
- **Planning** — rendez-vous et rappels automatiques
- **Tableau de bord & rapports** — chiffre d'affaires des réparations, appareils les plus
  traités, répartition par statut, durée moyenne d'intervention
- **Portail client** — export de ses données personnelles et demande de suppression (RGPD),
  avec circuit de validation côté administrateur
- **Notifications** — temps réel via Server-Sent Events
- **Rôles** — admin, vendeur et technicien, avec navigation filtrée par rôle

## Stack

- **Backend** — FastAPI, SQLAlchemy 2.0 (async), PostgreSQL 16, Redis, Alembic
- **Frontend** — React 18, Vite, TailwindCSS 3, Zustand, TanStack Query, Recharts
- **Authentification** — JWT avec jetons d'accès et de rafraîchissement, rôles

## Démarrage rapide (Docker)

Prérequis : Docker Desktop démarré.

```bash
# 1. Créer le fichier de configuration à partir du modèle
cp .env.example .env
# puis générer un SECRET_KEY et le reporter dans .env :
#   python -c "import secrets; print(secrets.token_urlsafe(64))"

# 2. Lancer tous les services
docker compose up --build

# 3. Dans un autre terminal, appliquer les migrations
docker compose exec backend alembic upgrade head

# 4. Charger les données de démonstration
docker compose exec backend python seed.py
```

L'application est disponible sur :

| | |
|---|---|
| **Frontend** | http://localhost:5173 |
| **API** | http://localhost:8000/api |
| **Documentation API** | http://localhost:8000/docs |

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@tradetrack.fr | admin123 |
| Vendeur | vendeur@tradetrack.fr | vendeur123 |
| Technicien | tech@tradetrack.fr | tech123 |

Pour un jeu de données plus fourni : `docker compose exec backend python seed_demo.py`.

## Démarrage sans Docker

PostgreSQL et Redis doivent tourner localement, et `.env` pointer vers eux.

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python seed.py
uvicorn app.main:app --reload

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

## Tests

```bash
docker compose exec backend python -m pytest -q
```

## Configuration

Toutes les variables sont documentées dans [`.env.example`](.env.example). Les principales :

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion PostgreSQL. Une URL d'hébergeur (`postgresql://…`) est convertie automatiquement au format asyncpg attendu. |
| `SECRET_KEY` | Signature des jetons JWT. **À générer, ne jamais réutiliser entre environnements.** |
| `CORS_ORIGINS` | Origines autorisées à appeler l'API, séparées par des virgules. |
| `REDIS_URL` | Optionnel — sert au push temps réel des notifications. |
| `VITE_API_URL` | URL de l'API vue par le navigateur, inscrite dans le build du frontend. |

## Architecture

```
backend/app/
├── core/       — configuration, sécurité JWT, dépendances FastAPI
├── db/         — engine SQLAlchemy async, session
├── models/     — 11 tables SQLAlchemy
├── schemas/    — Pydantic v2 (requêtes / réponses)
├── services/   — logique métier (réparation, devis, stock, planning…)
└── routers/    — endpoints HTTP (couche fine)

frontend/src/
├── api/        — appels Axios par module
├── components/ — UI réutilisable, sélecteur de client, formulaire de devis
├── pages/      — pages par module
├── store/      — Zustand (authentification, notifications)
└── utils/      — TVA, formatage
```

Documentation complémentaire : [schéma de la base](docs/schema-bdd.md) · [conformité RGPD](docs/RGPD.md).

## Règles métier clés

- **TVA automatique** — Neuf : TVA classique 20 % sur le HT. Occasion : TVA sur marge
  (TVM), 20 % appliqués sur la marge (prix − achat). Calcul côté backend.
- **Stock** — décrémenté automatiquement lors de l'utilisation d'une pièce en réparation,
  avec contrôle de disponibilité préalable et traçabilité du mouvement.
- **Chiffre d'affaires** — calculé sur les réparations clôturées, par jour, mois et année.
- **Alertes stock** — notification automatique sous le seuil configuré.
- **Rappels de rendez-vous** — J-1 et H-2, via une tâche de fond exécutée toutes les 5 minutes.

## Déploiement

Le fichier [`render.yaml`](render.yaml) décrit l'infrastructure complète pour
[Render](https://render.com) : API, site statique et base PostgreSQL.

1. Sur render.com, se connecter avec GitHub et autoriser l'accès au dépôt.
2. **New → Blueprint**, sélectionner le dépôt, puis **Apply**. Les trois services
   sont créés automatiquement.
3. Une fois les URLs attribuées, renseigner les deux variables croisées :
   - sur `tradetrack-api` → `CORS_ORIGINS = https://tradetrack-web.onrender.com`
   - sur `tradetrack-web` → `VITE_API_URL = https://tradetrack-api.onrender.com/api`

   Chaque modification relance un déploiement — indispensable côté frontend, Vite
   inscrivant la valeur au moment du build.
4. Peupler la base depuis le poste local, avec l'*External Database URL* fournie par Render :

   ```bash
   docker compose run --rm -e DATABASE_URL="postgresql+asyncpg://…" backend python seed.py
   ```

Les migrations sont appliquées automatiquement au démarrage de l'API.

### Limites de l'offre gratuite

- La base PostgreSQL gratuite **expire au bout de 30 jours** ; les données sont perdues.
- L'API **s'endort après 15 minutes** sans trafic : la première requête prend environ 50 secondes.
- **Redis n'est pas déployé** : les notifications restent consultables au rafraîchissement,
  seul leur push instantané est désactivé.
- Les rappels de rendez-vous ne s'exécutent pas pendant les périodes de sommeil.
