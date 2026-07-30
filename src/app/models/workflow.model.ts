export interface WorkflowDto {
  id?: string;
  nom: string;
  description?: string;
  resourceType: string;
  steps?: WorkflowStepDto[];
}

export interface WorkflowStepDto {
  id?: string;
  /** Identifiant fonctionnel fixé à la création, non modifiable ensuite. */
  code?: string | null;
  nomEtape: string;
  stepOrder: number;
  responsableRole?: string;
  description?: string;
  emailTemplateCode?: string;
  transitions?: WorkflowTransitionDto[];
  fields?: WorkflowStepFieldDto[];
}

export interface WorkflowTransitionDto {
  id?: string;
  label: string;
  decision: string;
  requiredRole?: string;
  /** Code de l'étape de destination : clé stable, à préférer au nom et au rang. */
  toStepCode?: string | null;
  toStepId?: string;
  toStepName?: string;
}

export interface WorkflowStepFieldDto {
  id?: string;
  fieldName: string;
  fieldLabel: string;
  type: string;
  required: boolean;
  options?: string;
}

export interface EmailTemplateDto {
  id?: string;
  code: string;
  subject: string;
  body: string;
  description?: string;
}

export interface WorkflowStateDto {
  instanceId?: string;
  status: string;
  currentStateCode?: string;
  currentStateName?: string;
  allowedActions: WorkflowActionDto[];
}

export interface WorkflowActionDto {
  code: string;
  libelle: string;
  permission?: string;
}
