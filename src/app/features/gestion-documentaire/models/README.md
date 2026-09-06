# 📦 Modèles Gestion Documentaire (`src/app/features/gestion-documentaire/models`)

Ce dossier regroupe les interfaces TypeScript pour le module **Gestion Documentaire** de QualiSira.

---

## 📑 Répartition des fichiers

### 1. `document.model.ts`
- **Interfaces** : `DocumentQms`, `QmsDocumentVersion`, `QmsAuditLog`, `DocumentUserAccess`, `SharedDocumentDto`, `WorkflowStepTemplate`.
- **Rôle** : Entités liées au cycle de vie du document (métadonnées, versions, audit, partages).

### 2. `demande.model.ts`
- **Interfaces** : `DemandeDocumentDto`, `TypeDemande`, `EtatDemande`.
- **Rôle** : Workflow des demandes formelles de modification ou suppression portant sur un document publié.

### 3. `referentiel.model.ts`
- **Interfaces** : `QmsDocumentType`, `PrioriteDocument`, `NiveauConfidentialite`, `DomaineApplication`.
- **Rôle** : Référentiels de classification (types, priorités, confidentialités, domaines).

### 4. `stats.model.ts`
- **Interface** : `DocumentStatsDto`.
- **Rôle** : DTO de statistiques globales (volumes, répartitions, retards de révision).

---

## 🚀 Utilisation

```typescript
import { 
    DocumentQms, 
    DemandeDocumentDto, 
    QmsDocumentType, 
    PrioriteDocument 
} from '@features/gestion-documentaire/models';
```
