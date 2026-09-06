# 📚 Référentiels Gestion Documentaire (`src/app/features/gestion-documentaire/referentiel`)

Ce dossier regroupe les écrans d'administration et de paramétrage des référentiels propres au système documentaire de QualiSira.

---

## 📑 Référentiels inclus

### 1. `type-document/`
- **Composant** : `TypeDocumentComponent` (alias `QmsDocumentTypeComponent`)
- **Rôle** : Pyramide documentaire (Procédures, Instructions, Enregistrements, Politiques, Manuels). Détermine le code normalisé unique et le répertoire cible dans le stockage GED.

### 2. `priorite-document/`
- **Composant** : `PrioriteDocumentComponent`
- **Rôle** : Niveaux d'urgence et de criticité (Urgent, Normal, Faible), avec badges de couleur et rangs de priorisation dans les circuits de relecture.

### 3. `niveau-confidentialite/`
- **Composant** : `NiveauConfidentialiteComponent`
- **Rôle** : Rangs de sensibilité et habilitations par rôles pour la consultation restreinte des documents confidentiels.

### 4. `domaine-application/`
- **Composant** : `DomaineApplicationComponent`
- **Rôle** : Périmètre métier ou fonctionnel couvert par les documents (RH, Achats, Production, SI...).

---

## 🚀 Utilisation

```typescript
import { 
    TypeDocumentComponent, 
    PrioriteDocumentComponent, 
    NiveauConfidentialiteComponent, 
    DomaineApplicationComponent 
} from '@features/gestion-documentaire/referentiel';
```
