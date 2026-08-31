import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Structure } from '../../../pages/parametrages/structure/structure-config/structure';
import { AuthData } from '../../../models/auth.model';


@Component({
    selector: 'app-search-agent',
    templateUrl: './search-agent.component.html',
    styleUrl: './search-agent.component.scss',
    standalone: true,
    imports: [NgPrimeModule]
})
export class SearchAgentComponent implements OnInit {
    directions: Structure[] = [];
    services: Structure[] = [];

    directionId: string | undefined;
    serviceId: string | undefined;
    searchedAgent: any;
    users: AuthData[] = [];
    agents: any[] = [];
    @Input() prefilledStructureId?: string;
    @Output() searchedAgentChange = new EventEmitter<any>();

    constructor(private authService: AuthService) {}

    ngOnInit() {
        if (this.prefilledStructureId) {
            this.loadAgentsForStructure(this.prefilledStructureId);
        }
    }

    loadAgents() {
        if (this.directionId || this.serviceId) {
            this.loadAgentsForStructure(this.serviceId ? this.serviceId : this.directionId!);
        }
    }

    loadAgentsForStructure(structureId: string) {
        this.authService.loadAgentPublicByService(structureId)
            .subscribe({
                next: (data) => {
                    this.agents = data.data.content.map((a: any) => ({
                        label: a.user ? `${a.lastName} ${a.firstName}` : `${a.lastName || ''} ${a.firstName || ''}`.trim() || 'Utilisateur inconnu',
                        value: a
                    }));

                    this.searchedAgent = undefined;
                    this.searchedAgentChange.emit(this.searchedAgent);
                },
                error: (error) => {
                    console.log(error);
                }
            });
    }

    onAgentSelect(agent: AuthData) {
        this.searchedAgentChange.emit(agent);
    }
}
