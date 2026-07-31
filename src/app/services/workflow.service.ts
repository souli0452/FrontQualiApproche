import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiUrlConfig, WORKFLOW_SERVICE } from './quali-url-configs';
import { WorkflowDto, EmailTemplateDto, WorkflowStateDto } from '../models/workflow.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly workflowUrl = QualiUrlConfig.WORKFLOW_DEFINITION_URL;
  private readonly emailTemplateUrl = QualiUrlConfig.EMAIL_TEMPLATE_URL;

  constructor(private http: HttpClient) { }

  // --- Workflows API ---
  getAllWorkflows(): Observable<WorkflowDto[]> {
    return this.http.get<WorkflowDto[]>(this.workflowUrl);
  }

  getWorkflowById(id: string): Observable<WorkflowDto> {
    return this.http.get<WorkflowDto>(`${this.workflowUrl}/${id}`);
  }

  getWorkflowStateForResource(resourceId: string): Observable<WorkflowStateDto> {
    return this.http.get<WorkflowStateDto>(`${this.workflowUrl}/instances/${resourceId}/state`);
  }

  createWorkflow(dto: WorkflowDto): Observable<WorkflowDto> {
    return this.http.post<WorkflowDto>(this.workflowUrl, dto);
  }

  updateWorkflow(id: string, dto: WorkflowDto): Observable<WorkflowDto> {
    return this.http.put<WorkflowDto>(`${this.workflowUrl}/${id}`, dto);
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.workflowUrl}/${id}`);
  }

  // --- Email Templates API ---

  getAllEmailTemplates(): Observable<EmailTemplateDto[]> {
    return this.http.get<EmailTemplateDto[]>(this.emailTemplateUrl);
  }

  getEmailTemplateById(id: string): Observable<EmailTemplateDto> {
    return this.http.get<EmailTemplateDto>(`${this.emailTemplateUrl}/${id}`);
  }

  createEmailTemplate(dto: EmailTemplateDto): Observable<EmailTemplateDto> {
    return this.http.post<EmailTemplateDto>(this.emailTemplateUrl, dto);
  }

  updateEmailTemplate(id: string, dto: EmailTemplateDto): Observable<EmailTemplateDto> {
    return this.http.put<EmailTemplateDto>(`${this.emailTemplateUrl}/${id}`, dto);
  }

  deleteEmailTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.emailTemplateUrl}/${id}`);
  }
}
