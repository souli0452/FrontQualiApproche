# Spécification Fonctionnelle & Métier : Tableaux de Bord des Non-Conformités
**Rôles : AGENT, PILOTE DE PROCESSUS (CHEF), RESPONSABLE QUALITÉ (RQ)**

---

## 1. Vision d'Ensemble & Philosophie de Conception

Le module de gestion des **Non-Conformités (NC)** s'appuie sur une pyramide décisionnelle à 3 niveaux. Chaque profil possède des responsabilités métiers bien précises :

```
             ▲
            / \     RESPONSABLE QUALITÉ (RQ) ── Gouvernance globale, arbitrages & conformité SMQ
           /   \
          /=====\   PILOTE DE PROCESSUS (CHEF) ── Animation d'équipe, recevabilité & pilotage service
         /       \
        /=========\ AGENT (COLLABORATEUR) ────── Déclaration terrain & exécution des plans d'action
```

Pour répondre aux standards ergonomiques du composant générique `app-card-stats-admin`, chaque profil dispose d'un jeu de **4 cartes synthétiques** complété, selon son niveau de responsabilité, par des **blocs d'analyse graphique et d'évolution**.

---

## 2. Tableau de Bord de l'AGENT

### Mission de l'Agent
L'Agent est un acteur opérationnel de terrain :
* Il constate et déclare les dysfonctionnements observés.
* Il exécute les actions curatives ou correctives qui lui sont confiées par son responsable.
* Son besoin est **immédiat, personnel et centré sur sa tâche quotidienne**.

### Ses 4 Cards & Justification Métier

| Card | Thème | Titre Métier | Pourquoi cette Card ? (Raison d'être) |
| :--- | :--- | :--- | :--- |
| **Card 1** | 🟧 **Orange** | **Mes Déclarations** | **Parce qu'il doit suivre son activité de signalement :** l'agent doit savoir combien d'anomalies il a enregistrées dans le système et s'assurer que ses constats sont bien pris en charge par l'organisation. |
| **Card 2** | 🟦 **Bleu** | **En cours de traitement** | **Parce que c'est sa to-do list active :** elle regroupe ses signalements encore en cours de circuit et, surtout, les plans d'action qui lui sont assignés et qu'il doit exécuter. |
| **Card 3** | 🟥 **Rouge** | **Mes Actions en Retard** | **Parce que c'est son signal d'alarme individuel :** il doit repérer instantanément les plans d'action dont l'échéance est dépassée afin d'éviter tout blocage et rendre compte à son responsable. |
| **Card 4** | 🟩 **Vert** | **Mes NC Clôturées** | **Parce que c'est la traçabilité de son impact :** voir les dossiers qu'il a initiés ou traités arriver à leur terme valide l'efficacité de son intervention et clôture son engagement. |

### Blocs Graphiques Additionnels
* **Aucun bloc macro-graphique lourd.**  
  *Justification :* L'agent n'a pas à analyser les tendances transversales de l'entreprise. Un affichage analytique surchargerait inutilement son interface. Son tableau de bord doit privilégier ses cartes d'action et sa table opérationnelle.

---

## 3. Tableau de Bord du PILOTE (Chef de Service / Responsable Processus)

### Mission du Pilote
Le Pilote de Processus est un gestionnaire d'équipe et garant d'un périmètre d'activité :
* Il qualifie la pertinence des signalements concernant son entité (recevable / non fondé).
* Il délègue et impute le traitement aux agents sous sa responsabilité.
* Il suit l'avancement des plans d'action pour son service.

### Ses 4 Cards & Justification Métier

| Card | Thème | Titre Métier | Pourquoi cette Card ? (Raison d'être) |
| :--- | :--- | :--- | :--- |
| **Card 1** | 🟧 **Orange** | **Total du Processus / Service** | **Parce qu'il doit évaluer le volume d'incidents impactant son entité :** mesurer la charge d'anomalies survenue dans son périmètre organisationnel sur la période. |
| **Card 2** | 🟦 **Bleu** | **En cours dans le Service** | **Parce qu'il pilote la charge de travail de son équipe :** il doit surveiller les dossiers en attente d'imputation et les actions correctives en cours de réalisation chez ses collaborateurs. *(Sous-métriques : "À imputer" / "En traitement")*. |
| **Card 3** | 🟥 **Rouge** | **Plans d'Action en Retard** | **Parce qu'il est garant du respect des délais de son service :** détecter les goulots d'étranglement, réallouer des ressources ou relancer les collaborateurs avant que le retard n'impacte les usagers/clients. *(Accompagné du taux de respect SLA)*. |
| **Card 4** | 🟩 **Vert** | **Résolues & Clôturées** | **Parce qu'il doit mesurer l'efficacité de son processus :** quantifier les problèmes définitivement éliminés et apprécier le taux de résolution de son service. |

### Bloc Additionnel : Analyse des NC / Niveau de Gravité / Date
En plus de ses 4 cards, le Pilote bénéficie d'un bloc analytique dédié :

* **Pourquoi par Niveau de Gravité (Mineure, Majeure, Critique) ?**  
  Le pilote doit hiérarchiser les urgences de son unité : dix non-conformités mineures n'ont pas le même impact opérationnel qu'une seule critique bloquant la production ou le service.
* **Pourquoi par Date (Évolution mensuelle / temporelle) ?**  
  Pour vérifier la dynamique de son plan d'amélioration continue : les actions correctives mises en œuvre réduisent-elles effectivement les récurrences de mois en mois ?

---

## 4. Tableau de Bord du RESPONSABLE QUALITÉ (RQ)

### Mission du Responsable Qualité (RQ)
Le RQ a la vision hélicoptère et la responsabilité stratégique du Système de Management de la Qualité (SMQ) :
* Il veille à la conformité globale de l'organisation vis-à-vis des normes (ISO 9001, etc.).
* Il valide les réceptions, arbitre les affectations entre directions et valide la clôture définitive des dossiers après mesure d'efficacité.
* Il prépare les revues de direction et les audits qualité.

### Ses 4 Cards & Justification Métier

| Card | Thème | Titre Métier | Pourquoi cette Card ? (Raison d'être) |
| :--- | :--- | :--- | :--- |
| **Card 1** | 🟧 **Orange** | **Total Global Déclarées** | **Parce qu'il supervise le baromètre global de la non-qualité :** avoir la visibilité exhaustive sur tout ce qui entre dans le système pour l'ensemble des départements et filiales. |
| **Card 2** | 🟦 **Bleu** | **En cours de traitement** | **Parce qu'il garantit la fluidité du cycle de vie du SMQ :** identifier les blocages dans le circuit de validation et s'assurer que les dossiers progressent régulièrement de la soumission à la clôture. *(Sous-métriques : "Validation Pilote", "Validation RQ")*. |
| **Card 3** | 🟥 **Rouge** | **Dépassements & Alertes SLA** | **Parce qu'il protège l'entreprise contre les dérives critiques :** un dépassement récurrent expose l'organisation à des constats d'audit défavorables, des pénalités contractuelles ou une dégradation de l'image de marque. |
| **Card 4** | 🟩 **Vert** | **Clôturées Efficaces** | **Parce qu'il démontre la valeur ajoutée de la démarche Qualité :** présenter à la Direction Générale le volume d'anomalies définitivement résolues avec preuves d'efficacité. |

### Bloc Additionnel : Analyse Avancée NC / Niveau / Date / Service
Le RQ a accès à la matrice d'analyse croisée complète :

* **Pourquoi par Service / Structure ?**  
  * Pour identifier les services sous tension nécessitant un audit ciblé ou un renfort méthodologique.
  * Pour détecter la sous-déclaration (un service qui ne déclare jamais aucune anomalie présente souvent un risque silencieux).
* **Pourquoi par Niveau de Gravité (Critique / Majeure / Mineure) ?**  
  * Pour cartographier la criticité des risques résiduels à l'échelle de l'entreprise.
* **Pourquoi par Date (Année, Mois, Évolution pluriannuelle) ?**  
  * Pour alimenter les indicateurs annuels de la Revue de Direction, mesurer les tendances saisonnières et justifier les investissements d'amélioration continue.

---

## 5. Synthèse Comparée des 3 Tableaux de Bord

| Dimension | 👷‍♂️ AGENT | 👔 PILOTE (CHEF) | 👑 RESPONSABLE QUALITÉ (RQ) |
| :--- | :--- | :--- | :--- |
| **Périmètre des données** | Individuel (mes créations + mes imputations) | Équipe / Structure / Processus concerné | Global Organisation (toutes structures) |
| **Finalité de la vue** | Opérationnelle & Réalisation | Animation d'équipe & Respect des délais | Stratégique, Arbitrage & Conformité SMQ |
| **Card 1 (Orange)** | Mes Déclarations | Total du Service / Processus | Total Global Entreprise |
| **Card 2 (Bleu)** | Mes actions en cours | En cours dans l'équipe *(Sous-étapes)* | En cours global *(Validation Pilote & RQ)* |
| **Card 3 (Rouge)** | Mes échéances dépassées | Alertes SLA Équipe *(Taux de respect)* | Dérives globales SMQ *(Risque audit)* |
| **Card 4 (Vert)** | Mes dossiers finalisés | Résolues dans le Service | Résolues Entreprise *(Taux de résolution)* |
| **Bloc Analytique 1** | *Aucun (accès direct à la table)* | **Graphique NC / Niveau / Date** | **Graphique NC / Niveau / Date** |
| **Bloc Analytique 2** | *Aucun* | *Aucun (centré sur son unité)* | **Répartition croisée par Service** |

---

## 6. Alignement Technique Backend & Frontend

### Contrat d'API Unique (`NcDashboardDto`)
Les trois profils consomment la même structure d'objet servie par le backend :
* `GET /amelioration/non-conformite/dashboard/user/{userId}` (Agent)
* `GET /amelioration/non-conformite/dashboard/pilot/{structureId}` (Pilote)
* `GET /amelioration/non-conformite/dashboard/rq` (RQ)

```json
{
  "total": 52,
  "enCours": 14,
  "enRetard": 3,
  "cloturees": 35,
  "tauxSla": 85.0,
  "tauxResolution": 67.3,
  "statsByStatus": { ... }
}
```

Ce contrat unifié permet au composant générique `CardStatsAdminComponent` d'être instancié de façon identique pour chaque rôle, avec une fluidité visuelle et un code frontend maintenable.
