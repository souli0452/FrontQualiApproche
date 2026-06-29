import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TypeStructure } from '../../../enums/enums';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Structure } from '../../../pages/parametrages/structure/structure-config/structure';
import { StructureService } from '../../../pages/parametrages/structure/structure-service/structure-service';
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
    searchedAgent: AuthData | undefined;
    users: AuthData[] = [];
    agents: any[] = [];
    @Input() prefilledStructureId?: string;
    @Output() searchedAgentChange = new EventEmitter<any>();

    constructor(
        private structureService: StructureService,
        private authService: AuthService) {}

    ngOnInit() {
        if (this.prefilledStructureId) {
            this.loadAgentsForStructure(this.prefilledStructureId);
        } 
        // else {
        //     this.structureService.getAllDirections(TypeStructure.DIRECTION)
        //         .subscribe({
        //             next: (data) => {
        //                 this.directions = data.body || [];
        //             },
        //             error: (error) => {
        //                 console.log(error);
        //             }
        //         });
        // }
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
                    this.agents = data.data.content.map(a => ({
                        label:  a.user.lastName + ' ' + a.user.firstName,
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
