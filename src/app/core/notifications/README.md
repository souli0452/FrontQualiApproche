# Guide d'intégration du Système de Notifications et Badges

Ce document explique l'architecture du système de notifications consolidé de **FrontQualiApproche** et détaille la démarche pas-à-pas pour brancher un nouveau module métier (ex: *Actions*, *Audits*, *Réclamations*, etc.).

---

## 🏛️ Architecture globale

Le système repose sur un Hub réactif centralisé : **[`AppNotificationService`](./app-notification.service.ts)** (situé dans `@core`).

```text
  [ Module Non-Conformités ]   ──┐
  [ Module Documentaire    ]   ──┼──>  [ AppNotificationService ]  ──>  [ Menu Latéral (app.menu) ]
  [ Nouveau Module Métier  ]   ──┘           (@core)                ──>  [ Cloche Topbar (app.topbar) ]
```

### Avantages :
1. **Découplage total** : Le menu (`app.menu.ts`) n'a plus besoin d'importer directement chaque service métier.
2. **Réactivité instantanée** : Dès qu'un module met à jour son compteur via `setModuleBadge()`, le badge s'affiche automatiquement en rouge sur l'élément de menu correspondant.
3. **Extensibilité** : L'ajout d'un nouveau module prend 3 minutes et ne risque pas de casser l'existant.

---

## 🚀 Démarche pas-à-pas pour brancher un nouveau module

Prenons l'exemple d'un module nommé **« Actions correctives et préventives »** (clé : `'ACTIONS'`).

### Étape 1 : Déclarer / émettre le compteur dans le service du module

Dans le service gérant les données à traiter ou les tâches en attente du module (ex: `action.service.ts`) :

1. **Injecter `AppNotificationService`** :
   ```typescript
   import { Injectable, inject } from '@angular/core';
   import { AppNotificationService } from '@core';

   @Injectable({ providedIn: 'root' })
   export class ActionService {
       private readonly appNotificationService = inject(AppNotificationService);
       
       // ...
   ```

2. **Émettre le nombre d'éléments à traiter** lors du chargement ou du rafraîchissement des données :
   ```typescript
   rafraichirActionsATraiter(): void {
       this.http.get<any[]>(`${API_URL}/a-traiter`).subscribe({
           next: (actions) => {
               const count = actions?.length || 0;
               
               // 🚀 Envoi au Hub central avec la clé du module
               this.appNotificationService.setModuleBadge('ACTIONS', count);
           },
           error: () => {
               this.appNotificationService.setModuleBadge('ACTIONS', 0);
           }
       });
   }
   ```

---

### Étape 2 : Connecter l'écouteur dans le menu latéral (`app.menu.ts`)

Dans `src/app/core/layout/component/app.menu.ts`, souscrivez à la clé de votre module dans le bloc centralisé `ngOnInit()` :

```typescript
// src/app/core/layout/component/app.menu.ts
this.appNotificationService.moduleBadges$.subscribe(badges => {
    if (badges['NC'] !== undefined) {
        this.updateMenuBadge('Non-Conformités', badges['NC']);
    }
    if (badges['DOC'] !== undefined) {
        this.updateMenuBadge('Gestion documentaire', badges['DOC']);
    }
    
    // ➕ AJOUTEZ VOTRE MODULE ICI :
    if (badges['ACTIONS'] !== undefined) {
        this.updateMenuBadge('Action corrective et préventive', badges['ACTIONS']);
    }
});
```

> ⚠️ **Important** : Le premier paramètre de `updateMenuBadge('...')` doit correspondre **exactement** au `label` de l'élément de menu défini dans `this.model`.

---

### Étape 3 (Optionnelle) : Ajouter les alertes détaillées dans la Cloche Topbar

Si votre module a également des tâches détaillées à afficher dans le menu déroulant de la cloche (`app.topbar.ts`) :

1. Préparez vos notifications au format standard `AppNotificationItem` :
   ```typescript
   const notificationsActions: AppNotificationItem[] = actions.map(act => ({
       id: act.id,
       title: act.numero,
       detail: act.designation,
       time: 'À traiter',
       icon: 'pi pi-bolt',
       colorClass: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
       read: false,
       route: `/actions/${act.id}/traitement`,
       moduleKey: 'ACTION'
   }));
   ```

2. Poussez-les dans le Hub :
   ```typescript
   this.appNotificationService.updateModuleNotifications('ACTION', notificationsActions);
   ```

3. Le compteur global de la cloche s'incrémente automatiquement et le clic redirigera directement l'utilisateur vers la route spécifiée.

---

## 📋 Exemples de référence existants

- **Non-Conformités** : [`NonConformiteService.rafraichirNotifications()`](file:///Users/davidnayo/Desktop/MES-PROJETS/QualiSira/FrontQualiApproche/src/app/features/non-conformite/services/non-conformite.service.ts)
  - Clé module : `'NC'`
  - Label menu : `'Non-Conformités'`
  - Met à jour le badge du menu + le badge d'onglet « Traitement & Suivi ».

- **Gestion Documentaire** : [`DocumentaireATraiterService.rafraichir()`](file:///Users/davidnayo/Desktop/MES-PROJETS/QualiSira/FrontQualiApproche/src/app/features/gestion-documentaire/services/documentaire-a-traiter.service.ts)
  - Clé module : `'DOC'`
  - Label menu : `'Gestion documentaire'`
  - Calcule la somme `documents` + `demandes` à traiter et informe le Hub.
