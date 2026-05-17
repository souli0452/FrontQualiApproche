import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TypeStructure } from '../../enums';
import { NgPrimeModule } from '../../../prime-ng.module';
import { KcUser } from '../../models';
import { takeUntil } from 'rxjs/operators';
import { showToast, StatusEnum } from '../../utils';
import { AuthService } from '../../services/auth-services/auth.service';
import { Structure } from '../../pages/structure/structure-config/structure';
import { StructureService } from '../../pages/structure/structure-service/structure-service';


@Component({
    selector: 'app-search-agent',
    templateUrl: './search-agent.component.html',
    styleUrl: './search-agent.component.scss',
    imports:[NgPrimeModule]
})
export class SearchAgentComponent implements OnInit {

    directions: Structure[] = [];
    services: Structure[] = [];

    directionId: string | undefined;
    serviceId: string | undefined;
    searchedAgent: KcUser | undefined;
    users: KcUser[]=[];
    agents: any[] = [];
    @Output() searchedAgentChange = new EventEmitter<any>();

    constructor(private structureService: StructureService,private authService: AuthService) {
    }

    ngOnInit() {
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

    loadServiceByDirection() {
        if (this.directionId) {
            this.structureService.getAllStructure(TypeStructure.SERVICE, this.directionId)
                .subscribe({
                    next: (data) => {
                        this.services = data.body || [];
                    },
                    error: (error) => {
                        console.log(error);
                    }
                });
        }
    }
    loadAgents() {
        if (this.directionId || this.serviceId) {
            this.authService.loadAgentPublicByService(this.serviceId ? this.serviceId : this.directionId!)
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
    }

    onAgentSelect(agent: KcUser) {
        this.searchedAgentChange.emit(agent);
    }
}
