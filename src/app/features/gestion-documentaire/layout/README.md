# 🖥️ Layout Gestion Documentaire (`src/app/features/gestion-documentaire/layout`)

Composant conteneur principal du module **Gestion Documentaire**.

---

## 📑 Responsabilités

1. **En-tête unifié** : S'appuie sur `<app-header-page>` pour présenter le titre, sous-titre, fil d'Ariane et bouton d'action primaire protégé par vérification de licence (`siLicenceOuverte`).
2. **Navigation par onglets** : Hub de navigation PrimeNG (`<p-tabs>`) permettant de basculer entre les différentes sections du module :
   - *Vue d'ensemble* (`/gestion-documentaire/vue-ensemble`)
   - *Répertoire documentaire* (`/gestion-documentaire/documents`)
   - *Documents partagés* (`/gestion-documentaire/partages`)
   - *Demandes* (`/gestion-documentaire/demandes`)
3. **Point d'injection dynamique** : Affiche `<router-outlet>` pour rendre les sous-pages du module.

---

## 🚀 Utilisation

```typescript
import { GestionDocumentaireLayoutComponent } from '@features/gestion-documentaire/layout';
```
