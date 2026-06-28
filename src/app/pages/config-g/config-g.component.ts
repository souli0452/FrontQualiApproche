import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigGlobalService } from '../../services/config-global.service';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';
import { showToast, StatusEnum } from '../../utils';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-config-g',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
    templateUrl: './config-g.component.html',
    styleUrl: './config-g.component.scss'
})
export class ConfigGComponent implements OnInit {
    configForm: FormGroup;
    configGlobal: any = {};
    isEditMode: boolean = false;
    loading: boolean = false;

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
        this.loading = true;
        this.configService
            .findAll()
            .pipe(finalize(() => this.loading = false))
            .subscribe((data: any) => {
                if (data.body) {
                    this.isEditMode = true;
                    this.configGlobal = data.body;
                    this.configForm.patchValue({
                        nomCompletRq: this.configGlobal.nomCompletRq,
                        emailRq: this.configGlobal.emailRq,
                        rappelEcheance: this.configGlobal.rappelEcheance,
                    });
                }
            });
    }

    save(): void {
        if (this.configForm.invalid) return;

        this.loading = true;
        const config = this.configForm.value;

        const request = this.configGlobal.id 
            ? this.configService.update(config, this.configGlobal.id)
            : this.configService.create(config);

        request.pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (res) => {
                    this.getConfigG();
                    showToast(StatusEnum.success, 200, "Configuration enregistrée", this.messageService);
                },
                error: (err) => {
                    showToast(StatusEnum.error, 500, "Erreur lors de l'enregistrement", this.messageService);
                }
            });
    }
}
