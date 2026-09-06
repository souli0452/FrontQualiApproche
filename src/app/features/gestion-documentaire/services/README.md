# ⚙️ Services Gestion Documentaire (`src/app/features/gestion-documentaire/services`)

Ce dossier regroupe l'ensemble des services HTTP et logiques métier de gestion des documents qualité de QualiSira.

---

## 📑 Services inclus

### 1. `document.service.ts` (`DocumentService` / `QmsDocumentService`)
- **Rôle** : Service central du fonds documentaire.
- **Endpoints Spring Boot** :
  - `POST /documents/nouveau` : Dépôt d'un nouveau document avec fichier joint et métadonnées.
  - `GET /documents/{id}` : Récupération d'un document complet.
  - `GET /documents` : Recherche multicritères paginée.
  - `GET /documents/{id}/fichier` : Téléchargement du binaire (PDF/Office).
  - `GET /documents/{id}/versions` : Historique des versions archivées.
  - `GET /documents/{id}/audit` : Journal d'audit et traçabilité des consultations.
  - `GET /documents/shared/me` : Documents partagés avec l'utilisateur connecté.
  - `GET /documents/stats` : Synthèse statistique (répartition, retards).

### 2. `demande.service.ts` (`DemandeService` / `DemandeDocumentService`)
- **Rôle** : Gestion du cycle de vie des demandes formelles de modification ou suppression de documents publiés.
- **Endpoints Spring Boot** :
  - `POST /demandes-document` : Création d'une demande avec justification.
  - `GET /demandes-document` : Mes demandes émises.
  - `GET /demandes-document/a-traiter` : Demandes soumises à la validation de l'utilisateur.
  - `POST /demandes-document/{id}/remplacant` : Dépôt du document remplaçant une fois la modification acceptée.

### 3. `referentiel.service.ts`
- **Classes** :
  - `PrioriteDocumentService` (`/priorites-document`)
  - `NiveauConfidentialiteService` (`/niveaux-confidentialite`)
  - `DomaineApplicationService` (`/domaines-application`)
- **Rôle** : Opérations CRUD et listes complètes `/all` pour alimenter les sélecteurs de classement.

### 4. `documentaire-a-traiter.service.ts` (`DocumentaireATraiterService`)
- **Rôle** : Synchronisation réactive (`BehaviorSubject`) entre la vue d'ensemble et la cloche de notifications pour les documents et demandes requérant une action.

---

## 🚀 Utilisation

```typescript
import { 
    DocumentService, 
    DemandeService, 
    PrioriteDocumentService, 
    DocumentaireATraiterService 
} from '@features/gestion-documentaire/services';
```
