# 📦 Modèles de Données Non-Conformité (`src/app/features/non-conformite/models`)

Ce dossier regroupe l'ensemble des interfaces TypeScript typant les entités liées à la gestion des Non-Conformités (NC) dans QualiSira.

---

## 📑 Répartition des fichiers

### 1. `non-conformite.model.ts`
- **Interface** : `NonConformite`
- **Rôle** : Entité centrale représentant une fiche de non-conformité. Alignée avec les recommandations ISO 9001 et intégrant les nouveaux alias explicites ainsi que les champs historiques pour rétrocompatibilité backend.

### 2. `referentiel.model.ts`
- **Interfaces** : `NiveauNonConformite`, `OrigineNonConformite`
- **Rôle** : Référentiels de classification et de gravité (niveaux/criticités avec scores et couleurs) et sources d'apparition des écarts.

### 3. `plan-action.model.ts`
- **Interfaces** : `PlanAction`, `ActionNonConformite`, `ActionCorrectivePreventive`
- **Rôle** : Plans d'actions correctives / préventives (CAPA) associés à une non-conformité ou rattachés aux réclamations.

### 4. `nc-stats.model.ts`
- **Interfaces** : `NcStats`, `NcNotificationBadges`
- **Rôle** : DTO de statistiques par statut et compteurs des badges de notifications des étapes du workflow.

### 5. `nc-filter.model.ts`
- **Interface** : `NcFilter`
- **Rôle** : Typage des filtres de recherche multicritères dans les tableaux et vues de suivi.

---

## 🚀 Utilisation

Importez directement depuis le point d'entrée du module :

```typescript
import { 
    NonConformite, 
    NiveauNonConformite, 
    OrigineNonConformite, 
    PlanAction, 
    NcStats 
} from '@features/non-conformite/models';
```
