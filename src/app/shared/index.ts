// ─── Contrats de chargement paresseux ────────────────────────────────────────
export * from './ui/lazy-options.model';

// ─── Champs de saisie partagés ───────────────────────────────────────────────
export * from './ui/select-input/select-input.component';
export * from './ui/multiselect-input/multiselect-input.component';

// ─── Circuit de validation (délégué canoniquement à @features/workflow) ───────
export * from '../features/workflow/execution';

// ─── Tableau d'affichage partagé ─────────────────────────────────────────────
export * from './tableau-affichage/tableau-affichage';
// ─── Directives partagées ──────────────────────────────────────────────────
export * from './directives/has-permission.directive';
export * from './licence/licence-ouverte.directive';
export * from './recherche-globale';
export * from './app-crud-generic/app-crud-generic.component';
export * from './form-input-template/form-input-template.component';
export * from './alert-message/alert-message.service';
export * from './alert-message/alert-message.component';
export * from './pagination/pagination';
export * from './card-stats-admin';


