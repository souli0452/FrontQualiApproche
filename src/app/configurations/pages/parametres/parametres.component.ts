import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../models/generique.model';
import { NatureParametre, Parametre, ParametreService } from '../../services/parametre.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { LicenceOuverteDirective } from '@shared/licence/licence-ouverte.directive';

/** Nature d'un réglage, avec ce qu'elle change pour la saisie. */
interface Nature {
    label: string;
    value: NatureParametre;
    aide: string;
}

/**
 * Réglages de l'organisation : contact, logo, responsable qualité, et ce que l'organisation y ajoute.
 * Premier onglet du centre de configurations (/configurations/config-systeme).
 */
@Component({
    selector: 'app-parametres',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, TableauAffichageComponent, LicenceOuverteDirective],
    providers: [MessageService],
    templateUrl: './parametres.component.html'
})
export class ParametresComponent implements OnInit, OnDestroy {

    readonly natures: Nature[] = [
        { label: 'Texte', value: 'TEXTE', aide: 'Texte libre.' },
        { label: 'Courriel', value: 'COURRIEL', aide: 'Adresse de courriel.' },
        { label: 'Téléphone', value: 'TELEPHONE', aide: 'Numéro affiché tel quel.' },
        { label: 'Adresse web', value: 'URL', aide: 'Sans protocole, https:// est ajouté dans les courriels.' },
        {
            label: 'Image', value: 'IMAGE',
            aide: 'Adresse de l\'image. Elle doit être accessible depuis l\'extérieur, sinon elle '
                + 'apparaîtra vide chez le destinataire d\'un courriel.'
        },
        { label: 'Adresse postale', value: 'ADRESSE', aide: 'Plusieurs lignes acceptées.' },
        { label: 'Nombre', value: 'NOMBRE', aide: 'Nombre entier. Une valeur non numérique est refusée.' }
    ];

    reglages: Parametre[] = [];
    recherche = '';
    chargement = true;
    enregistrement = false;
    peutEcrire = false;
    currentPage = 0;
    pageSize = 10;

    tableCols: TableColumn[] = [];
    cellTemplates: { [field: string]: TemplateRef<any> } = {};
    @ViewChild('reglageTpl', { static: true }) reglageTpl!: TemplateRef<any>;
    @ViewChild('valeurTpl', { static: true }) valeurTpl!: TemplateRef<any>;
    @ViewChild('natureTpl', { static: true }) natureTpl!: TemplateRef<any>;
    @ViewChild('actionTpl', { static: true }) actionTpl!: TemplateRef<any>;

    dialogueOuvert = false;
    reglageEnCours: Parametre | null = null;
    formulaire: FormGroup;

    private readonly search$ = new Subject<string>();
    private readonly destroy$ = new Subject<boolean>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly service: ParametreService,
        private readonly messageService: MessageService
    ) {
        this.formulaire = this.fb.group({
            cle: ['', [Validators.required]],
            libelle: ['', [Validators.required]],
            type: ['TEXTE' as NatureParametre, [Validators.required]],
            valeur: [''],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['config-global-write', 'CONFIG_GLOBAL_MANAGE']);
        this.tableCols = [
            { field: 'libelle', header: 'Réglage', type: 'custom', width: this.peutEcrire ? '42%' : '48%', sort: false },
            { field: 'valeur', header: 'Valeur', type: 'custom', width: this.peutEcrire ? '28%' : '34%', sort: false },
            { field: 'type', header: 'Nature', type: 'custom', width: this.peutEcrire ? '16%' : '18%', sort: false },
            ...(this.peutEcrire ? [{ field: 'action', header: 'Action', type: 'custom' as const, width: '14%', align: 'right' as const, sort: false }] : [])
        ];
        this.cellTemplates = {
            libelle: this.reglageTpl,
            valeur: this.valeurTpl,
            type: this.natureTpl,
            action: this.actionTpl
        };

        this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(term => {
            this.recherche = term;
            this.currentPage = 0;
            this.charger();
        });

        this.charger();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    charger(): void {
        this.chargement = true;
        this.service.liste(this.recherche).pipe(takeUntil(this.destroy$)).subscribe({
            next: (reglages) => {
                this.reglages = reglages ?? [];
                this.chargement = false;
            },
            error: (error) => {
                this.chargement = false;
                showToast(StatusEnum.error, error.status, 'Chargement des réglages impossible',
                    this.messageService, error);
            }
        });
    }

    onSearch(term: string): void {
        this.search$.next((term ?? '').trim());
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage = event.page ?? 0;
        this.pageSize = event.size ?? this.pageSize;
    }

    onRowClick(reglage: Parametre): void {
        if (this.peutEcrire) {
            this.ouvrirModification(reglage);
        }
    }

    // ------------------------------------------------------------------ dialogue

    ouvrirModification(reglage: Parametre): void {
        this.reglageEnCours = reglage;
        this.formulaire.reset({
            cle: reglage.cle,
            libelle: reglage.libelle,
            type: reglage.type ?? 'TEXTE',
            valeur: reglage.valeur ?? '',
            description: reglage.description ?? ''
        });
        // La clé désigne le réglage pour le code qui le lit : elle se voit, elle ne se modifie pas.
        this.formulaire.get('cle')?.disable();
        this.dialogueOuvert = true;
    }

    enregistrer(): void {
        if (this.formulaire.invalid || !this.reglageEnCours?.id) {
            this.formulaire.markAllAsTouched();
            return;
        }

        // `getRawValue` et non `value` : la clé est désactivée en modification, et le serveur exige
        // qu'elle lui soit renvoyée telle quelle.
        const saisie = this.formulaire.getRawValue();
        const reglage: Parametre = {
            ...saisie,
            valeur: this.videEnNull(saisie.valeur),
            description: this.videEnNull(saisie.description),
            lisibleSansHabilitation: true
        };

        this.enregistrement = true;
        this.service.modifier(this.reglageEnCours.id, reglage)
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.enregistrement = false;
                this.dialogueOuvert = false;
                this.messageService.add({
                    severity: 'success', summary: 'Enregistré',
                    detail: 'Réglage enregistré. Il est repris dans les courriels dans les minutes '
                        + 'qui suivent.'
                });
                this.charger();
            },
            error: (error) => {
                this.enregistrement = false;
                showToast(StatusEnum.error, error.status, 'Enregistrement impossible',
                    this.messageService, error);
            }
        });
    }

    // ------------------------------------------------------------------ affichage

    get natureRetenue(): Nature | undefined {
        return this.natures.find(nature => nature.value === this.formulaire.get('type')?.value);
    }

    libelleNature(type?: NatureParametre): string {
        return this.natures.find(nature => nature.value === type)?.label ?? 'Texte';
    }

    estUneImage(reglage: Parametre): boolean {
        return reglage.type === 'IMAGE' && !!reglage.valeur?.trim();
    }

    estRenseigne(reglage: Parametre): boolean {
        return !!reglage.valeur && reglage.valeur.trim().length > 0;
    }

    private videEnNull(valeur: unknown): string | null {
        const texte = valeur === null || valeur === undefined ? '' : String(valeur).trim();
        return texte.length > 0 ? texte : null;
    }
}
