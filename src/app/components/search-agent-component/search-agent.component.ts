import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TypeStructure } from '../../enums';
import { NgPrimeModule } from '../../../prime-ng.module';
import { KcUser } from '../../models';
import { takeUntil } from 'rxjs/operators';
import { getCurrentUserStructure, showToast, StatusEnum } from '../../utils';
import { AuthService } from '../../services/auth-services/auth.service';
import { Structure } from '../../pages/structure/structure-config/structure';
import { StructureService } from '../../pages/structure/structure-service/structure-service';


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
    @Output() searchedAgentChange = new EventEmitter<any>();
    userStructure: Structure = {};
    constructor(
        private structureService: StructureService,
        private authService: AuthService
    ) {
        this.userStructure = getCurrentUserStructure();
    }

    ngOnInit() {
      this.loadAgents(this.userStructure.id!);
    }

    loadAgents(structureId: string) {

            this.authService.loadAgentPublicByService(structureId).subscribe({
                next: (data) => {
                    this.agents = data.map((a) => ({
                        label: a.lastName + ' ' + a.firstName,
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
