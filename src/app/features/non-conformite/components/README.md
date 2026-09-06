# Composants Non-Conformité (`features/non-conformite/components/`)

## Rôle du dossier
Ce dossier regroupe tous les **composants d'interface (UI) et widgets spécialisés** dédiés au module **Non-Conformité**.

---

## Liste des composants

1. **`action-traitement/` (`TraitementActionTableComponent`)** :  
   Tableau des actions correctives et préventives à mener, avec intégration des dialogues de validation workflow et pièces jointes.

2. **`alerte-traitement/` (`AlerteTraitement`)** :  
   Bannière d'alerte en haut du tableau de bord affichant le nombre de dossiers nécessitant une intervention urgente.

3. **`config/` (`NonConformiteUrlConfig`)** :  
   Configuration des endpoints et URLs de l'API Non-Conformité.

4. **`dashboard-card/` (`DashboardCard`)** :  
   Définition et structure des cartes métriques de synthèse pour les différents profils (Agent, Chef, Responsable Qualité).

5. **`details-dialog/` (`DetailsDialogComponent`)** :  
   Boîte de dialogue modale affichant la fiche détaillée complète d'une non-conformité (description, analyse, pièces jointes, historique).

6. **`file-upload/` (`FileUploadComponent`)** :  
   Composant de sélection et téléversement drag-and-drop de pièces jointes (fichiers, images, preuves de traitement).

7. **`form-traitement/` (`FormTraitementComponent`)** :  
   Formulaire dynamique de traitement des différentes étapes du circuit (réception, analyse des causes, imputation, validation pilote, clôture RQ).

8. **`lightbox/` (`LightboxComponent`)** :  
   Visionneuse latérale (tiroir PrimeNG) pour la consultation plein écran des fichiers et images joints.

9. **`nc-filter-bar/` (`NcFilterBarComponent`, `NcFilter`)** :  
   Barre de filtres avancée avec sélecteur de dates (périodes prédéfinies ou personnalisées), filtres multi-sélection sur les processus, niveaux de gravité et origines.

10. **`nc-stats-card/` (`NcStatsCardComponent`)** :  
    Cartes interactives affichant les statistiques clés (total, en cours, clôturées, retards).

11. **`search-agent-component/` (`SearchAgentComponent`)** :  
    Composant d'auto-complétion et de sélection d'un agent / collaborateur selon sa structure.

12. **`table-traitement/` (`TraitementTableComponent`)** :  
    Tableau principal affichant la liste des dossiers de non-conformités avec colonnes triables, statut, échéances et boutons d'actions workflow immédiates.

---

## Importation
Tous ces composants sont centralisés et exportés via `@features/non-conformite` :
```typescript
import { 
    TraitementTableComponent, 
    NcFilterBarComponent, 
    FileUploadComponent, 
    DetailsDialogComponent 
} from '@features/non-conformite';
```
