# Architecture FrontQualiApproche (`src/app`)

Ce document décrit l'architecture technique, les principes directeurs et les conventions de développement du frontend **QualiSira**.  
Il sert de **guide de référence obligatoire** tant pour les développeurs de l'équipe que pour les **outils de génération de code et IA (LLM, Copilot, Antigravity, etc.)**, garantissant ainsi une cohérence architecturale parfaite dans le temps.

---

## 1. Vue d'ensemble de l'arborescence

```text
src/app/
├── core/             # Infrastructure globale, singletons, auth, layout, base CRUD
├── features/         # Modules métiers complexes et riches (GED, Non-conformité, Workflow, etc.)
├── pages/            # Écrans CRUD d'entités standardisées avec services colocalisés
├── configurations/   # Écrans de paramétrage système et configuration globale
├── shared/           # Composants, directives et pipes réutilisables transversalement
├── models/           # Modèles et interfaces TypeScript transverses
├── enums/            # Énumérations globales de l'application
├── utils/            # Fonctions utilitaires pures (formatage, dates, validateurs)
├── app.component.*   # Composant racine
├── app.config.ts     # Configuration de démarrage Angular (provideHttpClient, providers...)
└── app.routes.ts     # Routing racine et lazy loading
```

---

## 2. Aliases TypeScript (@paths)

Utilisez systématiquement les alias configurés dans `tsconfig.json` plutôt que des chemins relatifs profonds :

| Alias | Cible | Description |
| :--- | :--- | :--- |
| `@core` | `src/app/core/index.ts` | Services de base, auth, guards, interceptors |
| `@core/*` | `src/app/core/*` | Accès direct aux sous-dossiers de core |
| `@shared` | `src/app/shared/index.ts` | Composants UI génériques, tableau, inputs |
| `@shared/*` | `src/app/shared/*` | Accès aux sous-dossiers de shared |
| `@features/*` | `src/app/features/*` | Modules métiers (ex: `@features/non-conformite`) |
| `@configurations` | `src/app/configurations/index.ts`| Services et écrans de configuration |

---

## 3. Description détaillée des dossiers et règles de création

### 3.1. `core/` (Noyau technique)

> **Règle d'or :** Aucun code métier spécifique ici. Uniquement des services singletons, de la sécurité et l'infrastructure technique globale.

* **`auth/`** : Gestion de session (`auth.service.ts`), `auth.state.ts`, tokens JWT, décodage des permissions.
* **`guards/`** : Gardes de routage (`auth.guard.ts`, `permission.guard.ts`).
* **`interceptors/`** : Intercepteurs HTTP (`auth.interceptor.ts`, `licence.interceptor.ts`).
* **`layout/`** : Composants structurels (sidebar, topbar, menu de navigation, breadcrumb).
* **`licence/`** : Gestion de la licence logicielle client.
* **`components/`** : Composants de niveau noyau (ex: `share-confirm-toast`).
* **`services/`** :
  - `base-crud.service.ts` : Classe générique `BaseCrudService<T>` fournissant toutes les opérations CRUD standard (`findAll`, `save`, `update`, `delete`, pagination, recherche, etc.).
  - `url-config.ts` : Définition des endpoints API (`UrlConfig`).
  - `feature-service.ts` : Service transverse de gestion des fonctionnalités actives.

---

### 3.2. `pages/` (Entités CRUD standard)

> **Règle d'or :** Pour les entités de gestion standard (Audite, Fournisseur, Risque, Produit, etc.), **le composant et son service sont colocalisés dans le même dossier**.

#### Structure d'un sous-dossier dans `pages/`
Exemple pour une entité `fournisseur` :
```text
pages/fournisseur/
├── fournisseur.ts          # Composant Standalone Angular
├── fournisseur.html        # Template HTML
└── fournisseur.service.ts  # Service d'accès aux API étendant BaseCrudService
```

#### Convention pour `<entite>.service.ts` :
Tout service d'entité dans `pages/` doit hériter de `BaseCrudService<T>` :
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService, UrlConfig } from '@core';

@Injectable({
  providedIn: 'root'
})
export class FournisseurService extends BaseCrudService<any> {
  constructor(http: HttpClient) {
    super(http, UrlConfig.FOURNISSEUR);
  }
}
```

---

### 3.3. `features/` (Modules métiers riches)

> **Règle d'or :** Utilisé pour les domaines métiers complexes ayant des sous-écrans multiples, des workflows, des modales dédiées ou des flux d'approbation.

Exemples actuels :
- `gestion-documentaire/` : GED (vue d'ensemble, documents, demandes, partages, référentiels).
- `non-conformite/` : Gestion des fiches NC, formulaires de traitement, plans d'action.
- `workflow/` : Définition et exécution des circuits de validation.
- `dashboard/` : Tableaux de bord, indicateurs décisionnels.
- `gestion-utilisateurs/` : Administration des utilisateurs, rôles et permissions.

#### Structure type d'une sous-feature dans `features/<nom-domaine>/` :
```text
features/<nom-domaine>/
├── components/     # Composants internes spécifiques à la feature (modales, cartes, tables)
├── pages/          # Écrans routés de la feature
├── services/       # Services métiers d'appel API et de logique du domaine
├── models/         # Modèles et interfaces TypeScript propres au domaine
├── layout/         # (Optionnel) Layout avec barre latérale/onglets dédiés
├── <domaine>.routes.ts # Définition du sous-routing lazy-loaded
└── index.ts        # Exports publics de la feature
```

---

### 3.4. `configurations/` (Paramètres système)

Regroupe les écrans et réglages transverses de configuration de l'application (ex: `pages/parametres/`, constantes système, tables de mapping).

---

### 3.5. `shared/` (Partagé et Réutilisable)

Composants UI agnostiques réutilisables dans n'importe quelle page ou feature :
- `tableau-affichage/` : Table générique avec tri, pagination, filtres et sticky columns.
- `app-crud-generic/` : Wrapper générique pour formulaire et gestion CRUD.
- `pagination/` : Classe abstraite de base `BasePaginationComponent` fournissant l'état standard de pagination (`totalElements`, `currentPage`, `pageSize`, `totalPages`, `loading`, `onPageChange()`, `applyPagination()`).
- `form-input-template/` : Contrôles de formulaires standardisés.
- `directives/` & `pipes/` : Directives utilitaires (ex: droits, formatage).

---

### 3.6. `models/` et `enums/`

- **`models/`** : Interfaces et types TypeScript partagés par plusieurs modules (ex: `auth.model.ts`, `plan-action.model.ts`). Les modèles spécifiques à une seule feature restent dans `features/<domaine>/models/`.
- **`enums/`** : Énumérations globales transverses (statuts d'état, types de documents, etc.).

---

### 3.7. `utils/` (Fonctions pures)

Contient uniquement des fonctions pures et des classes utilitaires statiques (sans injection de dépendances Angular) :
- `formatage/` : Dates, monnaies, chaînes, nettoyages de données.
- Helpers de calculs mathématiques ou de manipulation de tableaux.

---

## 4. Règles de Qualité de Code & SonarQube

Pour que toute génération de code (humaine ou IA) soit immédiatement validée par SonarQube :

1. **Accessibilité HTML (WCAG 2.0)** :
   - Toute balise d'en-tête de tableau `<th>` **doit impérativement comporter l'attribut `scope="col"`** (ou `scope="row"`).
   - Exemple : `<th scope="col" class="...">Libellé</th>`.
2. **Propriétés CSS standard** :
   - Ne jamais utiliser de raccourcis Tailwind dans des attributs HTML `style="..."` (ex: écrire `padding-top: 0.5rem;` et non `pt: 0.5rem;`).
   - Toujours spécifier une police générique de secours dans `font-family` (ex: `font-family: 'Golos Text', sans-serif;`).
3. **Composants Standalone (Angular 18+)** :
   - Tous les composants créés doivent être `standalone: true`.
   - Importer explicitement les dépendances nécessaires (`CommonModule`, `ButtonModule`, `TableModule`, etc.) dans le tableau `imports: [...]`.
4. **Pas de code mort / commenté** :
   - Éviter de laisser de gros blocs de template HTML commentés (SonarQube lève des Code Smells majeurs pour code commenté).
