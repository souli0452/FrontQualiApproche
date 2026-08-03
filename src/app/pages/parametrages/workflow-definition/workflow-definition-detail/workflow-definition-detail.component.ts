import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { WorkflowDetailComponent } from '@/app/shared';
import { CgWorflowDefinitionService } from '@/app/feature/immatriculation/services/worflow/cg-worflow-definition.service';
import { WorkflowDefinitionWeb } from '@/app/feature/referentiel/models/workflow.model';

@Component({
    selector: 'app-cg-workflow-definition-detail',
    standalone: true,
    imports: [RouterModule, ButtonModule, WorkflowDetailComponent],
    templateUrl: './cg-workflow-definition-detail.component.html'
})
export class CgWorkflowDefinitionDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly service = inject(CgWorflowDefinitionService);

    readonly workflow = signal<WorkflowDefinitionWeb | null>(null);
    readonly loading = signal(true);
    workflowId!: string;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) this.workflowId = id;

        const resolved = this.route.snapshot.data['workflow'] as WorkflowDefinitionWeb | null;
        if (resolved) {
            this.workflow.set(resolved);
            this.loading.set(false);
        } else if (this.workflowId) {
            this.loadWorkflow();
        }
    }

    loadWorkflow(): void {
        this.loading.set(true);
        this.service.getWorkflowById(this.workflowId).subscribe({
            next: (data) => {
                this.workflow.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }
}
