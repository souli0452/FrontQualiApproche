# 📄 Pages Gestion Documentaire (`src/app/features/gestion-documentaire/pages`)

Ce dossier regroupe les 6 écrans principaux composant le module **Gestion Documentaire** de QualiSira.

---

## 📑 Pages incluses

### 1. `vue-ensemble/`
- **Route** : `/gestion-documentaire/vue-ensemble`
- **Composants** : `VueEnsembleComponent` (`QmsVueEnsembleComponent`), `QmsATraiterComponent`
- **Rôle** : Tableau de bord analytique présentant les métriques du SMQ (total documents, documents à réviser, documents confidentiels/externes, répartition par type et domaine) ainsi que la liste réactive des tâches et décisions ouvertes à l'utilisateur.

### 2. `documents/`
- **Route** : `/gestion-documentaire/documents`
- **Composants** : `DocumentsComponent` (`QmsDocumentComponent`) et sous-composants dédiés :
  - `QmsDocumentListComponent` (table paginée avec filtres avancés, visualiseur PDF intégré)
  - `QmsDocumentDetailComponent` (tiroir latéral de synthèse du document)
  - `QmsDocumentHistoryComponent` (historique des révisions et téléchargement des anciennes versions)
  - `QmsDocumentAuditComponent` (journal d'audit des actions survenues)
  - `QmsDocumentDemandesComponent` (historique des demandes de révision/suppression portées sur le document)
  - `QmsDocumentAccessDialogComponent` (gestion des habilitations et partages nominatifs)
  - `QmsReclassementDialogComponent` (modification de niveau de confidentialité avec alertes)

### 3. `create/`
- **Routes** : `/gestion-documentaire/create` et `/gestion-documentaire/nouveau` (alias rétrocompatible)
- **Composant** : `DocumentCreateComponent` (`QmsDocumentCreateComponent`)
- **Rôle** : Formulaire complet de dépôt d'un document (rattachement processus/service, types de document, priorités, domaines, upload de binaire sous contrôle de licence).

### 4. `documents-partages/`
- **Route** : `/gestion-documentaire/partages`
- **Composant** : `DocumentsPartagesComponent` (`QmsDocumentsPartagesComponent`)
- **Rôle** : Consultation des documents mis à disposition de l'utilisateur ou de son service par délégation/partage d'accès.

### 5. `demandes/`
- **Route** : `/gestion-documentaire/demandes`
- **Composants** : `DemandesComponent` (`QmsDemandesComponent`), `QmsDemandeDetailComponent`
- **Rôle** : Suivi des demandes formelles de modification ou de suppression de documents en circuit d'instruction.

### 6. `demande-create/`
- **Route** : `/gestion-documentaire/demandes/nouvelle`
- **Composant** : `DemandeCreateComponent` (`QmsDemandeCreateComponent`)
- **Rôle** : Formulaire pour soumettre une proposition de révision ou d'abrogation sur un document qualité publié.

---

## 🚀 Utilisation

```typescript
import { 
    VueEnsembleComponent, 
    DocumentsComponent, 
    DocumentCreateComponent, 
    DocumentsPartagesComponent, 
    DemandesComponent, 
    DemandeCreateComponent 
} from '@features/gestion-documentaire/pages';
```
