import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TypeStructure } from '../../../enums';
import { REGION_LIST } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';

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
    protected readonly TypeStructure = TypeStructure;
    protected readonly REGION_LIST = REGION_LIST;


    constructor(private messageService: MessageService) {
    }

    ngOnInit() {

    }
}
