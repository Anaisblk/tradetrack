# TradeTrack

Application de gestion pour atelier de réparation en téléphonie et informatique :
réparations, devis, pièces détachées, clients et planning, avec un portail client conforme
au RGPD.

Projet de fin d'année — application web complète, de la base de données à l'interface.

## Fonctionnalités

- **Réparations** — suivi par statut, pièces consommées décrémentées du stock, coût estimé,
  historique paginé et triable
- **Devis** — création à partir d'un appareil et de pièces, transformation en réparation
- **Pièces détachées** — catalogue, mouvements de stock tracés, alertes automatiques de
  seuil bas, recherche par code-barres (API)
- **Clients** — fiches, recherche, historique des interventions
- **Planning** — rendez-vous et rappels automatiques
- **Tableau de bord et rapports** — chiffre d'affaires des réparations, appareils les plus
  traités, répartition par statut, durée moyenne d'intervention
- **Comptes clients** — inscription publique soumise à validation par un administrateur
- **Portail client** — export RGPD en PDF, demande de suppression, changement de mot de passe
- **Notifications** — en base, diffusées en temps réel via Server-Sent Events
- **Interface responsive** — utilisable de 320 px au grand écran

## Rôles utilisateurs

Quatre rôles, définis dans [`models/user.py`](backend/app/models/user.py) :

| Rôle | Accès |
|---|---|
| `admin` | tout, dont Paramètres et Demandes RGPD |
| `vendeur` | dashboard, réparations, clients, pièces, devis, planning, rapports |
| `technicien` | dashboard, réparations, pièces, planning |
| `client` | portail client uniquement — aucun accès à l'interface de gestion |

Le menu latéral filtre les entrées selon le rôle, et le backend applique le contrôle à
chaque endpoint via les dépendances de [`core/dependencies.py`](backend/app/core/dependencies.py) :
`require_admin`, `require_vendeur_or_admin`, `require_technicien_or_above`, `get_current_user`.

Un utilisateur de rôle `client` est redirigé vers `/portal` s'il tente d'accéder à
l'interface de gestion.

## Gestion des comptes et validation administrateur

L'inscription publique ne donne pas un accès immédiat. Le compte est créé avec
`approval_status = pending` et `is_active = false` : la connexion est refusée tant qu'un
administrateur n'a pas tranché.

```
Client                                    Administrateur
  │                                              │
  ├─ POST /api/auth/register                     │
  │    → pending, is_active=false                │
  │                          notification « Nouvelle demande de compte »
  │                                              │
  ├─ tentative de connexion                      │
  │    → 403 « en attente de validation »        │
  │                                              │
  │                      Paramètres → Approuver ou Refuser
  │                      POST /api/users/{id}/approve
  │                      POST /api/users/{id}/reject
  ▼                                              ▼
approved + is_active=true              rejected + is_active=false
   → connexion possible                   → 403 « demande refusée »
```

Trois valeurs possibles pour `approval_status` : `pending`, `approved`, `rejected`.
Elle est distincte de `is_active`, qui reste le verrou de connexion — sans quoi un compte
jamais validé et un compte suspendu seraient indiscernables.

Un refus **conserve** le compte : la décision reste réversible depuis Paramètres.

L'administrateur peut également modifier les identifiants d'un compte validé (e-mail et
mot de passe) — utile lorsqu'un client a oublié ses accès. Le client remplace ensuite le
mot de passe temporaire depuis son portail.

## Fonctionnalités administrateur

Page **Paramètres** ([`Settings.jsx`](frontend/src/pages/settings/Settings.jsx)) :

- créer un utilisateur de n'importe quel rôle (validé d'emblée) ;
- approuver ou refuser les demandes de compte, remontées en tête de liste avec un compteur ;
- modifier les identifiants d'un compte ;
- désactiver un compte.

Page **Demandes RGPD** : liste des clients ayant demandé la suppression de leurs données,
les plus anciennes en premier, et approbation déclenchant l'anonymisation.

## Fonctionnalités client

Le portail (`/portal`) comporte deux onglets :

**Mes données** — export RGPD et demande de suppression.
Si le client ne possède **aucune** réparation, aucun devis et aucun rendez-vous, un état
vide explicite est affiché et **le bouton de téléchargement n'apparaît pas**. Le blocage
est également appliqué côté serveur : `GET /api/clients/me/export` répond **409** lorsqu'il
n'y a rien à exporter, afin qu'aucun PDF vide ne puisse être produit, même par un appel
direct à l'API. Le bloc de suppression RGPD reste accessible dans tous les cas.

**Mon compte** — changement de mot de passe. Le mot de passe actuel est exigé.

## Gestion des devis

Création avec sélection du client, lignes libres ou issues du catalogue, calcul de TVA
automatique, statuts `brouillon`, `envoye`, `accepte`, `refuse`, `expire`, date de validité,
et transformation en réparation. Liste paginée et triable par numéro, montant, statut ou
validité.

## Gestion des réparations

Appareil (type, marque, modèle, numéro de série), panne déclarée, diagnostic, statuts
`recu`, `en_cours`, `repare`, `annulee`, coût estimé puis final, acompte, dates estimée et
de clôture. Les pièces consommées sont décomptées du stock avec contrôle de disponibilité
et traçabilité du mouvement.

## Gestion des rendez-vous

Titre, description, client, créneau, personne assignée, statuts `planifie`, `confirme`,
`annule`, `termine`. Une tâche de fond s'exécute **toutes les 5 minutes**
([`main.py`](backend/app/main.py)) et envoie les rappels **J-1** et **H-2**.

## Notifications

Stockées en base (table `notifications`) et diffusées en temps réel par Server-Sent Events
sur `GET /api/notifications/stream`. Le jeton est passé en query string, `EventSource` ne
permettant pas d'en-tête personnalisé.

Types émis par l'application :

| Type | Déclencheur | Destinataire |
|---|---|---|
| `stock_alert` | stock d'un produit sous le seuil | tous les administrateurs |
| `compte_a_valider` | inscription d'un nouveau client | tous les administrateurs |
| `compte_valide` | validation du compte | le client concerné |
| `appointment` / `appointment_reminder` | rendez-vous et rappels J-1 / H-2 | utilisateur concerné |

Redis n'est utilisé que pour la diffusion instantanée. **Il est optionnel** : sans lui,
l'application démarre normalement et les notifications restent créées, stockées et
consultables — seul le push en direct est perdu.

## Génération et téléchargement des PDF

L'export RGPD (article 20 — droit à la portabilité) produit un **PDF** généré avec
**ReportLab** dans `export_client_data_pdf()`
([`client_service.py`](backend/app/services/client_service.py)). Il contient le profil du
client, ses réparations, ses devis et ses rendez-vous.

`get_client_data_counts()` est la source unique de vérité : elle alimente à la fois
`GET /api/clients/me/summary`, qui indique à l'interface s'il y a matière à exporter, et le
garde-fou de l'endpoint d'export. Les deux ne peuvent donc pas diverger.

## Responsive

L'application est utilisable de 320 px au grand écran. Breakpoints Tailwind par défaut
(`sm` 640, `md` 768, `lg` 1024, `xl` 1280).

| Plage | Comportement |
|---|---|
| < 1024 px | la barre latérale devient un tiroir coulissant, ouvert par un bouton dans la barre du haut, avec voile cliquable et fermeture automatique à la navigation |
| < 768 px | les listes Réparations, Clients, Pièces détachées et Devis s'affichent en **cartes** ; un sélecteur dédié conserve le tri, les en-têtes de colonnes disparaissant avec le tableau |
| ≥ 768 px | tableaux classiques, dans un conteneur à défilement horizontal |
| ≥ 1024 px | barre latérale statique, repliable en mode icônes |

Les tableaux restants (Planning, Demandes RGPD, Paramètres, détails) sont placés dans un
conteneur `overflow-x-auto` : aucune colonne n'est inaccessible.

Le hook [`useMediaQuery`](frontend/src/hooks/useMediaQuery.js) couvre les cas que Tailwind
ne peut pas traiter, les composants recevant leurs dimensions en JavaScript — les graphiques
Recharts notamment.

## Technologies utilisées

**Backend** — FastAPI 0.111, SQLAlchemy 2.0 (asynchrone), PostgreSQL 16, Alembic, Pydantic v2,
asyncpg, python-jose (JWT), passlib + bcrypt, redis, ReportLab (PDF), pytest, ruff

**Frontend** — React 18, Vite 5, TailwindCSS 3, Zustand (état global), TanStack Query 5
(données serveur), React Router 6, Axios, Recharts (graphiques), react-hot-toast, date-fns

> `package.json` déclare aussi `react-hook-form` et `react-qr-code`, qui ne sont importés
> par aucun fichier — vestiges de fonctionnalités retirées, désinstallables sans effet.

**Authentification** — JWT avec jeton d'accès (60 min) et jeton de rafraîchissement (7 jours).
Mots de passe hachés en bcrypt, jamais stockés en clair. Contrôle d'accès par rôle sur
chaque endpoint. Requêtes paramétrées via l'ORM, validation systématique par Pydantic.

## Architecture du projet

```
backend/
├── alembic/versions/  — migrations de schéma
├── app/
│   ├── core/          — configuration, sécurité JWT, dépendances FastAPI
│   ├── db/            — engine SQLAlchemy async, session
│   ├── models/        — 11 tables SQLAlchemy
│   ├── schemas/       — Pydantic v2 (requêtes / réponses)
│   ├── services/      — logique métier (réparation, devis, stock, client, planning…)
│   └── routers/       — endpoints HTTP (couche fine)
├── tests/             — pytest
├── seed.py            — jeu de données minimal
└── seed_demo.py       — jeu de données volumineux

frontend/src/
├── api/               — appels Axios par module
├── components/        — UI réutilisable, layout, sélecteur de client, formulaire de devis
├── hooks/             — useMediaQuery
├── pages/             — pages par module, dont client-portal/
├── store/             — Zustand (authentification, notifications)
└── utils/             — TVA, formatage, catalogue d'appareils
```

Documentation complémentaire : [schéma de la base](docs/schema-bdd.md) ·
[conformité RGPD](docs/RGPD.md).

## Installation et lancement (Docker)

Prérequis : Docker Desktop démarré.

```bash
# 1. Créer le fichier de configuration à partir du modèle
cp .env.example .env
# puis générer un SECRET_KEY et le reporter dans .env :
#   python -c "import secrets; print(secrets.token_urlsafe(64))"

# 2. Lancer tous les services (db, redis, backend, frontend)
docker compose up --build

# 3. Dans un autre terminal, appliquer les migrations
docker compose exec backend alembic upgrade head

# 4. Charger les données initiales
docker compose exec backend python seed.py
```

| | |
|---|---|
| **Frontend** | http://localhost:5173 |
| **API** | http://localhost:8000/api |
| **Documentation API** (Swagger) | http://localhost:8000/docs |

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@tradetrack.fr | admin123 |
| Vendeur | vendeur@tradetrack.fr | vendeur123 |
| Technicien | tech@tradetrack.fr | tech123 |

`seed.py` crée ces trois comptes, 5 catégories, 10 produits et 5 clients.
Pour un jeu de données plus fourni — 150 clients, 150 produits et 200 réparations
réparties sur 90 jours, qui alimentent le tableau de bord et les rapports :

```bash
docker compose exec backend python seed_demo.py
```

Ce script est cumulatif : le relancer ajoute un nouveau lot sans rien supprimer.

## Lancement sans Docker

PostgreSQL doit tourner localement et `.env` pointer vers lui. Redis est optionnel.

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

Scripts npm disponibles (`frontend/package.json`) : `dev`, `build`, `preview`.

## Variables d'environnement

Toutes documentées dans [`.env.example`](.env.example). Le fichier `.env` réel n'est jamais
versionné.

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion PostgreSQL. Une URL d'hébergeur (`postgresql://…`) est convertie automatiquement au format `postgresql+asyncpg://` attendu, et `sslmode` traduit en `ssl`. |
| `POSTGRES_PASSWORD` | Mot de passe du conteneur PostgreSQL en développement. |
| `SECRET_KEY` | Signature des jetons JWT. **À générer, ne jamais réutiliser entre environnements.** |
| `ALGORITHM` | Algorithme de signature JWT (`HS256`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de validité du jeton d'accès (60). |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Durée de validité du jeton de rafraîchissement (7). |
| `REDIS_URL` | Optionnel — diffusion temps réel des notifications. |
| `CORS_ORIGINS` | Origines autorisées à appeler l'API, séparées par des virgules, sans slash final. |
| `STOCK_ALERT_THRESHOLD` | Seuil de déclenchement des alertes de stock bas (3). |
| `VITE_API_URL` | URL de l'API vue par le navigateur, inscrite dans le build du frontend. |

## Base de données

**11 tables** PostgreSQL, gérées par SQLAlchemy 2.0 et versionnées avec Alembic :

`users`, `clients`, `categories`, `products`, `stock_movements`, `quotes`, `quote_items`,
`repairs`, `repair_items`, `appointments`, `notifications`.

Détail des relations et choix de modélisation : [docs/schema-bdd.md](docs/schema-bdd.md).

Toute évolution passe par une migration, jamais par une écriture directe :

```bash
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```

## Règles métier clés

- **TVA automatique** — Neuf : TVA extraite du TTC (`ttc × 20/120`). Occasion : TVA sur marge
  (TVM), appliquée sur `prix_ttc − achat_ttc`. Tous les prix saisis sont en TTC.
- **Stock** — décrémenté lors de l'utilisation d'une pièce en réparation, avec contrôle de
  disponibilité préalable et traçabilité du mouvement.
- **Chiffre d'affaires** — calculé sur les réparations clôturées, par jour, mois et année.
- **Alertes stock** — notification aux administrateurs sous le seuil configuré.
- **Rappels de rendez-vous** — J-1 et H-2, via une tâche de fond exécutée toutes les 5 minutes.
- **Effacement RGPD** — anonymisation plutôt que suppression, les écritures comptables devant
  être conservées 10 ans. Voir [docs/RGPD.md](docs/RGPD.md).

## Tests et vérifications

```bash
docker compose exec backend python -m pytest -q     # suite backend — 3 tests
cd frontend && npm run build                        # build de production
docker compose exec backend ruff check app          # analyse statique
```

La suite backend couvre l'authentification : inscription, connexion, e-mail en doublon.

`ruff` est installé et configurable, mais signale aujourd'hui **8 avertissements de style**
non corrigés (imports inutilisés, comparaisons `== True` / `== False` dans les filtres
SQLAlchemy). Ils n'empêchent ni le démarrage ni les tests.

## Déploiement

[`render.yaml`](render.yaml) décrit l'infrastructure complète pour
[Render](https://render.com) : base PostgreSQL, API Python et site statique.

1. Sur render.com, se connecter avec GitHub et autoriser l'accès au dépôt.
2. **New → Blueprint**, sélectionner le dépôt, puis **Apply**.
3. Une fois les URL attribuées, renseigner les deux variables croisées :
   - sur `tradetrack-api` → `CORS_ORIGINS = https://tradetrack-web.onrender.com`
   - sur `tradetrack-web` → `VITE_API_URL = https://tradetrack-api.onrender.com/api`

   Chaque modification relance un déploiement — indispensable côté frontend, Vite inscrivant
   la valeur au moment du build.
4. Peupler la base depuis le poste local, avec l'*External Database URL* fournie par Render :

   ```bash
   docker compose run --rm --no-deps -e DATABASE_URL="postgresql+asyncpg://…" backend python seed.py
   ```

Les migrations sont appliquées automatiquement au démarrage de l'API
(`alembic upgrade head` figure dans le `startCommand`). `PYTHON_VERSION` est fixé à 3.12 :
les versions plus récentes n'ont pas de roues précompilées pour `pydantic-core`, `asyncpg`
et `greenlet`, et le build échouerait.

### Limites de l'offre gratuite

- La base PostgreSQL gratuite **expire au bout de 30 jours** ; les données sont perdues.
- L'API **s'endort après 15 minutes** sans trafic : la première requête prend environ 50 secondes.
- **Redis n'est pas déployé** : les notifications restent consultables au rafraîchissement,
  seul leur push instantané est désactivé.
- Les rappels de rendez-vous ne s'exécutent pas pendant les périodes de sommeil.
