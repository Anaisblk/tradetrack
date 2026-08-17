# Conformité RGPD

TradeTrack manipule des données personnelles de clients (identité, coordonnées, historique
d'interventions). Ce document décrit les traitements réalisés, les droits implémentés et
les arbitrages retenus.

## Données collectées et finalités

| Donnée | Finalité | Base légale |
|---|---|---|
| Nom, prénom | Identification du dossier client | Exécution du contrat |
| E-mail, téléphone | Contact pour le suivi d'intervention et les rappels de rendez-vous | Exécution du contrat |
| Adresse postale | Facturation | Obligation légale |
| Historique des réparations, devis, rendez-vous | Suivi de la relation commerciale | Exécution du contrat |

Aucune donnée sensible au sens de l'article 9 du RGPD n'est collectée.

## Droits implémentés

### Consentement explicite — article 6

L'inscription exige une acceptation active de la politique de confidentialité : le
formulaire refuse la soumission tant que la case n'est pas cochée. La politique est
consultable avant validation, dans une fenêtre décrivant les données collectées, leurs
finalités, leur durée de conservation et les droits de la personne.

Implémentation : [`frontend/src/pages/auth/Register.jsx`](../frontend/src/pages/auth/Register.jsx)

### Droit à la portabilité — article 20

Un client connecté télécharge l'intégralité des données le concernant depuis
**Mon espace client → Mes données**. Le document généré est un **PDF** structuré contenant :

- son profil : identité, coordonnées, date de création du dossier ;
- ses réparations : appareil, panne déclarée, statut, coût ;
- ses devis : montant, statut, validité ;
- ses rendez-vous.

| Couche | Élément |
|---|---|
| API | `GET /api/clients/me/export` — [`routers/clients.py`](../backend/app/routers/clients.py) |
| Service | `export_client_data_pdf()` — [`services/client_service.py`](../backend/app/services/client_service.py) |
| Interface | [`pages/client-portal/MyData.jsx`](../frontend/src/pages/client-portal/MyData.jsx) |

### Droit à l'effacement — article 17

Le client soumet une **demande** de suppression, qu'un administrateur traite ensuite. Ce
n'est volontairement pas une suppression immédiate : l'effacement étant irréversible et
touchant des écritures comptables, il exige une validation humaine.

```
Client                          Administrateur
  │                                   │
  ├─ POST /api/clients/me/            │
  │       request-deletion            │
  │   → deletion_requested_at         │
  │     horodaté                      │
  │                                   │
  │                    GET /api/admin/deletion-requests
  │                      → file d'attente, plus anciennes d'abord
  │                                   │
  │                    POST /api/admin/deletion-requests/{id}/approve
  │                      → anonymize_client()
  ▼                                   ▼
Compte désactivé            Écritures comptables conservées
```

Le délai de traitement annoncé au client est de **14 jours**. Une demande déjà en cours
ne peut pas être soumise deux fois.

## L'arbitrage central : effacement contre conservation légale

Deux obligations s'opposent :

- le **RGPD** impose l'effacement des données personnelles sur demande ;
- le **Code de commerce** impose la conservation des pièces comptables pendant **10 ans**.

Supprimer purement et simplement un client détruirait des écritures que la loi oblige à
conserver. La réponse retenue est l'**anonymisation** : les écritures survivent, mais
plus rien ne permet de les rattacher à une personne identifiable.

| Champ | Après anonymisation |
|---|---|
| Nom, prénom | `Anonyme #<id>` |
| E-mail, téléphone, adresse | vidés |
| Compte utilisateur | désactivé, e-mail remplacé par `anonymized_<id>@tradetrack.fr` |
| Réparations, devis | **conservés**, rattachés au client anonymisé |

L'e-mail de substitution reste unique afin de ne pas violer la contrainte d'unicité en
base, tout en cessant d'être identifiant.

Implémentation : `anonymize_client()` dans [`services/client_service.py`](../backend/app/services/client_service.py)

## Mesures de sécurité

| Mesure | Mise en œuvre |
|---|---|
| Mots de passe | Hachage bcrypt — jamais stockés en clair |
| Authentification | JWT à durée limitée, avec jeton de rafraîchissement |
| Cloisonnement | Contrôle d'accès par rôle ; un client n'atteint que ses propres données |
| Injections SQL | Requêtes paramétrées via l'ORM SQLAlchemy |
| Validation des entrées | Schémas Pydantic v2 sur toutes les requêtes |

## Limites connues

Ces points relèvent d'une mise en production réelle et ne sont pas implémentés :

| Priorité | Point | Motif |
|---|---|---|
| Moyenne | Journal d'accès aux données | Tracer quel employé a consulté quel dossier |
| Moyenne | Politique de rétention automatique | Anonymiser sans intervention les clients inactifs depuis plus de 3 ans |
| Faible | JWT en cookie `HttpOnly` | Le jeton réside aujourd'hui dans le `localStorage`, exposé au XSS |
| Faible | Chiffrement au repos | Chiffrer téléphone et adresse au niveau de la base |
| Organisationnelle | Registre des traitements | Document tenu hors application |
