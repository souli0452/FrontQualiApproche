import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TypeStructure } from '../../../../enums/enums';
import { REGION_LIST } from '../../../../utils/global/global-utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { CategorieProcessus } from '../../../../models/categore-processus.model';

@Component({
    selector: 'app-creation-structure',
    templateUrl: './creation.component.html',
    styleUrl: './creation.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
    ]
})
export class CreationComponent implements OnInit {
    @Input() editForm?: UntypedFormGroup;
    @Input() typeStructure: TypeStructure = TypeStructure.DIRECTION;
    /**
     * Catégories de processus proposées au choix. Chargées par l'écran appelant, qui les tient
     * déjà pour sa colonne : les redemander ici n'apporterait qu'un appel de plus.
     */
    @Input() categoriesProcessus: CategorieProcessus[] = [];
    protected readonly TypeStructure = TypeStructure;
    protected readonly REGION_LIST = REGION_LIST;


    constructor(private messageService: MessageService) {
    }

    ngOnInit() {

    }
}
