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
  /**
   * Entité à laquelle le circuit est réservé au sein de sa famille — l'identifiant d'un type de
   * document — ou absent s'il est le circuit **par défaut** de la famille.
   *
   * La famille n'est pas subdivisée pour autant : `resourceType` reste l'aiguillage de retour vers
   * le module métier (notifications, liste « à traiter »), et la réservation est un second axe.
   */
  cibleId?: string | null;
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
  /**
   * Nom du champ dont la valeur désigne le titulaire du dossier — la personne à qui les étapes
   * suivantes seront réservées. Doit être renvoyé tel quel : omis, le serveur l'efface, l'étape
   * cesse de nommer quelqu'un et les étapes réservées au titulaire deviennent indécidables.
   */
  champTitulaire?: string | null;
  transitions?: WorkflowTransitionDto[];
  fields?: WorkflowStepFieldDto[];
}

export interface WorkflowTransitionDto {
  id?: number;
  /**
   * Code de l'action au sein de son étape (`APPROUVE`, `DEMANDER_COMPLEMENT`…).
   *
   * C'est lui qui identifie l'action, et non sa décision : une étape peut en offrir plusieurs de
   * même nature — valider, ou valider en demandant un complément — qui ne mènent pas au même
   * endroit. Vide, le serveur reprend le nom de la décision, et le rend unique dans l'étape.
   */
  code?: string | null;
  /** Libellé du bouton. Null accepté : le serveur retombe alors sur le nom de la décision. */
  label?: string | null;
  /**
   * Icône du bouton, en classe PrimeIcons (`pi pi-check`). Null accepté : le serveur retombe
   * alors sur celle que porte la décision.
   */
  icon?: string | null;
  /**
   * Couleur du bouton, dans le vocabulaire PrimeNG : `success`, `info`, `warn`, `danger`,
   * `secondary`, `contrast`, `help`, `primary`. Null accepté, même repli que l'icône.
   *
   * Elle ne double pas la décision : « Retourner au rédacteur » et « Refuser la demande » sont
   * deux rejets, mais l'un invite à corriger quand l'autre arrête le dossier.
   */
  severity?: string | null;
  decision: StepDecision | string;
  /** Habilitation propre à la transition ; à défaut, celle de l'étape d'origine s'applique. */
  requiredRole?: string | null;
  /**
   * Fait que le dossier doit porter pour que la transition soit franchissable, ou vide si elle
   * l'est sans condition. Le circuit exige un fait sans savoir ce qu'il recouvre ; le module
   * métier le déclare sans savoir quelle transition l'attend.
   */
  conditionRequise?: string | null;
  /** Ce que la condition veut dire, en clair, pour l'afficher à qui attend que le dossier avance. */
  conditionLibelle?: string | null;
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
  /**
   * Décision à laquelle ce champ se rapporte (`APPROUVE`, `REJETE`), ou absent s'il vaut quelle que
   * soit la décision. Un justificatif de rejet n'a pas à être demandé à qui approuve.
   */
  decision?: string | null;
  /**
   * Code de l'action qui, seule, réclame ce champ — ou absent s'il vaut pour toutes celles que sa
   * décision laisse passer. Sans lui, le motif demandé par « Demander un complément » se
   * présenterait aussi à qui valide simplement : les deux approuvent.
   */
  actionCode?: string | null;
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
  /**
   * Circuit que suit le dossier.
   *
   * <p>Sans lui, une fiche qui reçoit l'état connaît l'étape courante mais pas le circuit dont elle
   * fait partie : ni ce qui reste à franchir, ni qui l'attendra ensuite. Le module documentaire s'en
   * tirait avec une colonne à lui ; les non-conformités et les demandes n'en ont pas.</p>
   */
  workflowId?: string;
  status: ValidationStatus | string;
  /**
   * Code de l'étape courante. À renvoyer tel quel en `expectedStateCode` lors d'une décision :
   * c'est ce qui permet au serveur de refuser une décision prise depuis un écran périmé.
   */
  currentStateCode?: string;
  currentStateName?: string;
  /**
   * Habilitation attendue à l'étape courante — un rôle, ou `@TITULAIRE` quand l'étape est réservée
   * à la personne désignée sur le dossier. Sert à dire qui l'on attend lorsque l'appelant, lui,
   * n'a rien à décider.
   */
  currentStepRole?: string | null;
  allowedActions: WorkflowActionDto[];
  /**
   * Champs à saisir avant de décider sur l'étape courante. Le serveur refuse la décision en 400
   * si un champ requis manque — les présenter à l'utilisateur évite un aller-retour perdu.
   */
  currentStepFields?: WorkflowStepFieldDto[];
  /**
   * Décisions que l'étape prévoit mais qu'une condition non remplie retient. Le moteur les retire
   * des actions offertes — proposer une clôture que le dossier n'admet pas ne mènerait qu'à un
   * refus — mais rien ne les mentionnait ensuite, et le dossier paraissait arrêté sans raison.
   */
  pendingDecisions?: DecisionEnAttenteDto[];
  /**
   * Tout ce qui a été saisi sur ce dossier depuis l'ouverture de son circuit, dans l'ordre où il
   * l'a recueilli — la valeur la plus récente d'un champ faisant foi.
   *
   * Une donnée demandée à une étape n'existait plus nulle part à la suivante, sauf si un module
   * l'avait recopiée dans une colonne à lui. Elle accompagne désormais l'état du circuit, donc la
   * fiche comme les lignes de liste. L'historique, lui, garde les valeurs successives.
   */
  saisies?: SaisieDto[];
}

/** Une donnée saisie sur le dossier au cours de son circuit, et qui lui reste attachée. */
export interface SaisieDto {
  /** Nom technique du champ — clé stable. */
  fieldName: string;
  /** Intitulé présenté à qui a saisi, conservé avec la valeur : un champ retiré reste lisible. */
  fieldLabel?: string;
  value?: string;
  stepCode?: string;
  stepName?: string;
  decisionDate?: string;
  /** Nom de qui a saisi, tel qu'il se présentait alors ; à défaut, son identifiant. */
  auteur?: string;
}

/** Une décision prévue par l'étape, et la condition qui lui manque. */
export interface DecisionEnAttenteDto {
  libelle?: string;
  /** Nom technique du fait exigé. */
  condition?: string;
  /** Ce que la condition veut dire, tel que l'auteur du circuit l'a écrit. */
  conditionLibelle?: string;
}

export interface WorkflowActionDto {
  /** Identifiant technique de la transition, à renvoyer au serveur pour l'exécuter. */
  code: string;
  /**
   * Code métier de l'action au sein de son étape (`APPROUVE`, `DEMANDER_COMPLEMENT`…), stable d'une
   * installation à l'autre là où `code` est un identifiant technique. C'est par lui qu'un champ se
   * rattache à une action précise.
   */
  actionCode?: string | null;
  libelle: string;
  /** Rôle exigé pour franchir. Informatif : le serveur tranche, l'écran ne fait que l'indiquer. */
  permission?: string;
  /** Décision portée par l'action, pour distinguer une approbation d'un rejet. */
  decision?: StepDecision | string;
  /**
   * Icône du bouton, en classe PrimeIcons, telle que le circuit la déclare. Le serveur retombe
   * sur celle de la décision quand elle n'est pas configurée : la valeur est donc toujours
   * exploitable.
   */
  icon?: string;
  /**
   * Couleur du bouton, dans le vocabulaire PrimeNG (`success`, `warn`, `danger`…), utilisable
   * telle quelle dans `[severity]`. Même repli que l'icône.
   */
  severity?: string;
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
  /** Intitulé du champ au moment de la saisie ; à défaut, le nom technique. */
  fieldLabel?: string;
  value?: string;
}

/**
 * Sort d'un dossier dans une décision groupée.
 *
 * <p>Une décision groupée n'est pas une décision sur N dossiers : ce sont N décisions, dont
 * certaines peuvent échouer. Le motif est destiné à l'utilisateur.</p>
 */
export interface ResultatDecisionDto {
  resourceId: string;
  aboutie: boolean;
  motif?: string | null;
}
