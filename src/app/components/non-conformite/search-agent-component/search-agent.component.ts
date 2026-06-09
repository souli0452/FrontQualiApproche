import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TypeStructure } from '../../../enums';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { KcUser } from '../../../models';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Structure } from '../../../pages/parametrages/structure/structure-config/structure';
import { StructureService } from '../../../pages/parametrages/structure/structure-service/structure-service';


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
    searchedAgent: KcUser | undefined;
    users: KcUser[] = [];
    agents: any[] = [];
    @Input() prefilledStructureId?: string;
    @Output() searchedAgentChange = new EventEmitter<any>();

    constructor(
        private structureService: StructureService,
        private authService: AuthService) {}

    ngOnInit() {
        if (this.prefilledStructureId) {
            this.loadAgentsForStructure(this.prefilledStructureId);
        } else {
            this.structureService.getAllDirections(TypeStructure.DIRECTION)
                .subscribe({
                    next: (data) => {
                        this.directions = data.body || [];
                    },
                    error: (error) => {
                        console.log(error);
                    }
                });
        }
    }

    loadServiceByDirection() {
        if (this.directionId) {
            this.structureService.getAllStructure(TypeStructure.SERVICE, this.directionId)
                .subscribe({
                    next: (data) => {
                        this.services = data.content || [];
                    },
                    error: (error) => {
                        console.log(error);
                    }
                });
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
                    this.agents = data.map(a => ({
                        label:  a.lastName + ' ' + a.firstName,
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

    onAgentSelect(agent: KcUser) {
        this.searchedAgentChange.emit(agent);
    }
}
