import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { Slider } from 'primeng/slider';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { ConfigGlobalService } from '../../services/config-global.service';
import { NgIf } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { showToast, StatusEnum } from '../../utils';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-config-g',
    imports: [ReactiveFormsModule, ButtonDirective],
    templateUrl: './config-g.component.html',
    styleUrl: './config-g.component.scss'
})
export class ConfigGComponent {
    configForm: FormGroup;
    configGlobal: any = {};
    isEditMode: boolean = false;
    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private configService: ConfigGlobalService
    ) {
        this.configForm = this.fb.group({
            nomCompletRq: ['', [Validators.required]],
            emailRq: ['', [Validators.required, Validators.email]],
            rappelEcheance: [2, [Validators.required]]
        });
    }

    ngOnInit(): void {
        this.getConfigG();
    }

    getConfigG() {
        this.configService
            .findAll()
            .pipe()
            .subscribe((data: any) => {
                this.isEditMode = true;
                console.log( this.isEditMode);
                this.configGlobal = data.body;
             //   this.configForm.disable();
                this.configForm.setValue({
                    nomCompletRq: this.configGlobal.nomCompletRq,
                    emailRq:  this.configGlobal.emailRq,
                    rappelEcheance:  this.configGlobal.rappelEcheance,
                });
            });
    }
    save(): void {

            if (this.configGlobal.id) {
                console.log(this.configForm.value);
                const config = this.configForm.value;
                this.configService.updateG(config,this.configGlobal.id).subscribe({
                    next: (res) => {
                        this.configForm.reset();
                        this.getConfigG();
                        showToast(StatusEnum.success, res.status, null, this.messageService);
                    }
                });
            }else {
                const config = this.configForm.value;
                this.configService.save(config).subscribe({
                    next: (res) => {
                        this.configForm.reset();
                        this.getConfigG();
                        showToast(StatusEnum.success, res.status, null, this.messageService);
                    }
                });
            }


    }
}
