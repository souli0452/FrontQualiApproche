/**
 * Contrat de workflow-service.
 *
 * Ces interfaces reprennent les DTO exposés par le service. Deux points structurent l'ensemble et
 * méritent d'être connus avant de s'en servir :
 *
 * - **Le code d'étape (`code`) est l'identité fonctionnelle**, stable et non modifiable. Le nom
 *   (`nomEtape`) n'est qu'un libellé d'affichage : le prendre pour identité rompait toutes les
 *   destinations dès qu'on le corrigeait. Toute référence à une étape passe par `code`.
 * - **Les réponses de succès ne sont pas enveloppées.** workflow-service n'applique pas
 *   `ApiResponse` à ses succès, contrairement aux autres services ; seules ses *erreurs* le sont,
 *   avec un champ `message` exploitable. Ne pas déplier `.data` sur les succès de ce service.
 */

/** Décision métier portée par une transition. */
export type StepDecision = 'APPROUVE' | 'REJETE';

/** Statut d'une instance de validation. */
export type ValidationStatus = 'EN_COURS' | 'TERMINE';

/** Types de ressource pilotés par un circuit. */
export type ResourceType = 'DOCUMENT' | 'NON_CONFORMITE' | 'PLAN_ACTION';

// ---------------------------------------------------------------- configuration des circuits

export interface WorkflowDto {
  id?: string;
  nom: string;
  description?: string;
  resourceType: ResourceType | string;
  /**
   * Un seul circuit doit être actif par type de ressource : c'est celui qu'ouvrent les services
   * métier. Sans ce marqueur, le premier circuit rendu par la base était choisi arbitrairement.
   */
  actif?: boolean;
  steps?: WorkflowStepDto[];
}

export interface WorkflowStepDto {
  id?: number;
  /**
   * Identité fonctionnelle de l'étape, fixée à la création et **non modifiable** ensuite : les
   * transitions la désignent et les dossiers en cours s'y rapportent. Le serveur refuse en 409
   * toute tentative de la changer.
   */
  code?: string | null;
  nomEtape: string;
  stepOrder: number;
  /** Rôle habilité à décider sur cette étape, et destinataire de sa notification. */
  responsableRole?: string;
  description?: string;
  /** État de traitement métier propagé au service propriétaire (`VALIDATION_RS`, `CLOTURE`…). */
  etatTraitement?: string | null;
  emailTemplateCode?: string | null;
  /** Modèle du catalogue ayant servi à pré-remplir l'étape. Simple référence, sans lien JPA. */
  stepTemplateId?: string | null;
  transitions?: WorkflowTransitionDto[];
  fields?: WorkflowStepFieldDto[];
}

export interface WorkflowTransitionDto {
  id?: number;
  /** Libellé du bouton. Null accepté : le serveur retombe alors sur le nom de la décision. */
  label?: string | null;
  decision: StepDecision | string;
  /** Habilitation propre à la transition ; à défaut, celle de l'étape d'origine s'applique. */
  requiredRole?: string | null;
  /** Destination désignée par code : seule clé à la fois stable et connue avant enregistrement. */
  toStepCode?: string | null;
  toStepId?: number | null;
  toStepName?: string | null;
  toStepOrder?: number | null;
  /**
   * La transition **clôt le circuit** au lieu de mener à une autre étape.
   *
   * Marqueur explicite, et non déduit de l'absence de destination : sans lui, une transition
   * simplement non configurée était proposée comme action et clôturait le dossier si on la
   * déclenchait. Une transition sans destination *ni* ce marqueur est ignorée par le moteur.
   */
  terminal?: boolean;
}

export interface WorkflowStepFieldDto {
  id?: number | null;
  fieldName: string;
  fieldLabel: string;
  /** Valeurs de l'énumération `FieldType` du serveur : TEXT, NUMERIC, SELECT, DATE, FILE. */
  type: string;
  required: boolean;
  /** Valeurs proposées pour un champ de type liste, séparées par des virgules. */
  options?: string | null;
}

export interface EmailTemplateDto {
  id?: string;
  code: string;
  subject: string;
  body: string;
  description?: string;
}

// ---------------------------------------------------------------- instances et décisions

export interface WorkflowInstanceDto {
  instanceId?: string;
  workflowId?: string;
  status: ValidationStatus | string;
  currentStateCode?: string;
  currentStateName?: string;
}

export interface WorkflowStateDto {
  instanceId?: string;
  status: ValidationStatus | string;
  /**
   * Code de l'étape courante. À renvoyer tel quel en `expectedStateCode` lors d'une décision :
   * c'est ce qui permet au serveur de refuser une décision prise depuis un écran périmé.
   */
  currentStateCode?: string;
  currentStateName?: string;
  allowedActions: WorkflowActionDto[];
  /**
   * Champs à saisir avant de décider sur l'étape courante. Le serveur refuse la décision en 400
   * si un champ requis manque — les présenter à l'utilisateur évite un aller-retour perdu.
   */
  currentStepFields?: WorkflowStepFieldDto[];
}

export interface WorkflowActionDto {
  /** Identifiant technique de la transition, à renvoyer au serveur pour l'exécuter. */
  code: string;
  libelle: string;
  /** Rôle exigé pour franchir. Informatif : le serveur tranche, l'écran ne fait que l'indiquer. */
  permission?: string;
  /** Décision portée par l'action : détermine son apparence (approbation / rejet). */
  decision?: StepDecision | string;
}

/** Corps d'une demande de décision. */
export interface WorkflowValidationRequestDto {
  comments?: string;
  /**
   * Étape sur laquelle l'écran croit agir. Le serveur répond 409 si le dossier a changé d'étape
   * entre-temps, ce qui neutralise aussi le second envoi d'un double clic.
   */
  expectedStateCode?: string;
  /** Valeurs saisies, indexées par identifiant de champ. */
  fields?: Record<number, string>;
}

// ---------------------------------------------------------------- traçabilité

export interface ValidationHistoryDto {
  id?: number;
  stepCode?: string;
  stepName?: string;
  decision: string;
  comments?: string;
  validatorUserId?: string;
  /**
   * Nom de l'auteur au moment de la décision. Absent des décisions prises avant que le serveur ne
   * le consigne : l'identifiant technique reste alors le seul repère, et c'est lui qui s'affiche.
   */
  validatorFullName?: string;
  decisionDate?: string;
  fieldValues?: ValidationFieldValueDto[];
}

export interface ValidationFieldValueDto {
  fieldCode?: string;
  fieldName?: string;
  value?: string;
}
