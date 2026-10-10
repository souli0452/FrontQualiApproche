import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, takeUntil } from 'rxjs';
import { ApiItemResponse } from '../../../models/response.model';
import { DropdownSelector, MultiSelectSelector } from '../../../models/generique.model';
import { HeaderPage } from '../../../shared/header-page/header-page';
import { AlertService } from '../../../shared/alert-message/alert-message.service';
import { BasePaginationComponent } from '../../../shared/pagination/pagination';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';
import { UrlConfig } from '@core/services/url-config';
import { contenu } from '../services/audit.service';
import {
    DESTINATAIRES_RAPPEL, LISTES_PARAMETRAGE_AUDIT, ListeParametrageAudit, Option, SEPARATEURS, TYPES_DOCUMENT_AUDIT
} from './parametrage-audit.config';

/**
 * Une liste du paramétrage Audit (types d'audit, natures de constat, sites, critères et niveaux
 * d'évaluation, règles de rappel, codification), sur le socle commun des écrans de paramétrage :
 * la route dit laquelle (`data.liste`), la configuration dit ses colonnes et ses champs.
 */
@Component({
    selector: 'app-parametrage-audit-liste',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent, HeaderPage],
    template: `
        <app-header-page
            [title]="liste.titre"
            [subtitle]="liste.sousTitre"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="peutAjouter ? liste.boutonNouveau : undefined"
            buttonIcon="pi pi-plus"
            (actionClick)="nouveau()"
        />
        <div class="page-layout">
            <div class="card-first overflow-hidden border-none premium-hub transition-colors duration-300">
                <app-crud-generic
                    #crudGeneric
                    [requireRqPassword]="true"
                    [showAddButton]="false"
                    [dialogWidth]="'40rem'"
                    [formLongDescription]="liste.formLongDescription"
                    [detailLongDescription]="'Consultez ci-dessous l\\'ensemble des informations relatives à cette entrée.'"
                    [detailImagePath]="'assets/logo-quali-sira.svg'"
                    [showItemDescriptionOnTop]="false"
                    [loading]="loading"
                    [pageLabel]="liste.titre"
                    [tableCols]="liste.tableCols"
                    [detailCols]="liste.detailCols"
                    [listeObject]="dataList"
                    [formGroup]="formGroup"
                    [formCols]="liste.formCols"
                    [dropdownList]="dropdownList"
                    [multiSelectList]="multiSelectList"
                    [deleteConfirmField]="liste.champLibelle"
                    [isAffich]="true"
                    [closeDialog]="closeDialog"
                    [formHeader]="liste.formHeader"
                    (newItemEvent)="onSave($event)"
                    [totalElements]="totalElements"
                    [isPagination]="true"
                    [currentPage]="currentPage"
                    [pageSize]="pageSize"
                    (pageChangeEvent)="onPageChange($event)"
                    (searchEvent)="rechercher($event)"
                    (removeEvent)="onDelete($event)">
                </app-crud-generic>
            </div>
        </div>
    `
})
export class ParametrageAuditListeComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    @ViewChild('crudGeneric') crudGeneric!: AppCrudGenericComponent;

    destroy$: Subject<boolean> = new Subject<boolean>();
    closeDialog = false;
    liste: ListeParametrageAudit;
    formGroup: UntypedFormGroup;
    dropdownList: DropdownSelector[] = [];
    multiSelectList: MultiSelectSelector[] = [];
    breadcrumbs: { label: string; routerLink?: string }[];
    /** Le texte cherché, que le serveur applique à la page. */
    private recherche = '';
    private recherche$ = new Subject<string>();

    /** Les options des listes du formulaire, constantes ou lues dans le module Non-conformités. */
    private options: Record<string, Option[]> = {
        typesDocument: TYPES_DOCUMENT_AUDIT,
        separateurs: SEPARATEURS,
        destinataires: DESTINATAIRES_RAPPEL
    };

    constructor(
        protected fb: UntypedFormBuilder,
        private http: HttpClient,
        private route: ActivatedRoute,
        private alertService: AlertService
    ) {
        super();
        const cle = this.route.snapshot.data['liste'];
        this.liste = LISTES_PARAMETRAGE_AUDIT.find(l => l.cle === cle) ?? LISTES_PARAMETRAGE_AUDIT[0];
        this.breadcrumbs = [
            { label: 'Tableau de bord', routerLink: '/' },
            { label: 'Configurations', routerLink: '/configurations' },
            { label: this.liste.titre, routerLink: `/parametrage-audit/${this.liste.cle}` }
        ];
        const controles: Record<string, any> = {};
        for (const c of this.liste.formCols) {
            controles[c.field!] = [null, c.required ? Validators.required : []];
        }
        this.formGroup = this.fb.group(controles);
    }

    ngOnInit(): void {
        this.chargerListesLiees().pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.poserLesOptions();
            this.fetchObject();
        });
        this.recherche$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(texte => {
            this.recherche = texte;
            this.currentPage = 0;
            this.fetchObject();
        });
    }

    rechercher(texte: string): void {
        this.recherche$.next((texte ?? '').trim());
    }

    /** Les listes du module Non-conformités, quand la liste en dépend. */
    private chargerListesLiees(): Observable<unknown> {
        const nc = (url: string) =>
            this.http.get(`${url}/all`, { params: { page: 0, size: 1000 } }).pipe(
                map(res => contenu<any>(res).map(x => ({ label: x.libelle, value: x.id }))),
                // Sans droit de lecture sur le module NC, la liste reste vide : le reste fonctionne.
                catchError(() => of([] as Option[]))
            );
        const besoins: Record<string, Observable<Option[]>> = {};
        const cles = new Set(Object.values(this.liste.listes ?? {}));
        if (cles.has('typesNc')) besoins['typesNc'] = nc(UrlConfig.TYPE_NON_CONFORMITE_ROOT_URL);
        if (cles.has('niveauxNc')) besoins['niveauxNc'] = nc(UrlConfig.NIVEAU_NON_CONFORMITE_ROOT_URL);
        if (!Object.keys(besoins).length) return of(null);
        return forkJoin(besoins).pipe(map(r => (this.options = { ...this.options, ...r })));
    }

    private poserLesOptions(): void {
        this.dropdownList = Object.entries(this.liste.listes ?? {})
            .map(([field, cle]) => ({ field, dropdownEntries: this.options[cle] ?? [] }));
        this.multiSelectList = Object.entries(this.liste.listesMultiples ?? {})
            .map(([field, cle]) => ({ field, optionLabel: 'label', multiselectEntries: this.options[cle] ?? [] }));
    }

    /** Une codification par document : plus d'ajout quand tous en ont une. */
    get peutAjouter(): boolean {
        return this.liste.cle !== 'codification' || this.totalElements < TYPES_DOCUMENT_AUDIT.length;
    }

    nouveau(): void {
        this.crudGeneric.openNew();
        this.formGroup.patchValue(this.liste.valeursParDefaut);
    }

    fetchObject(): void {
        this.loading = true;
        const params: Record<string, any> = { page: this.currentPage, size: this.pageSize };
        if (this.recherche) params['search'] = this.recherche;
        if (this.liste.retraitParActif) params['inactifs'] = false;
        if (this.liste.tri) params['sort'] = `${this.liste.tri},asc`;
        // La racine sert l'écran par pages ; `/all` reste aux listes de choix.
        this.http.get(this.liste.url, { params })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => this.applyPagination(res, 250, this.preparer(contenu<any>(res))),
                error: () => {
                    this.loading = false;
                    this.alertService.showError(`Chargement de « ${this.liste.titre} » impossible`);
                }
            });
    }

    /** Les lignes telles que le tableau et le formulaire les attendent : triées, enrichies, listes dépliées. */
    private preparer(lignes: any[]): any[] {
        let prepares = lignes.map(l => this.liste.enrichir ? this.liste.enrichir(l, this.options) : { ...l });
        for (const champ of this.liste.listesEnTexte ?? []) {
            prepares = prepares.map(l => ({ ...l, [champ]: l[champ] ? String(l[champ]).split(',').map((s: string) => s.trim()).filter(Boolean) : [] }));
        }
        if (this.liste.tri) {
            const tri = this.liste.tri;
            prepares.sort((a, b) => (a[tri] ?? 0) - (b[tri] ?? 0));
        }
        return prepares;
    }

    onSuccess(res: ApiItemResponse<any>, message?: string) {
        this.closeDialog = true;
        this.fetchObject();
        this.alertService.showSuccess(message ?? res?.message ?? 'Enregistré.');
    }

    onSave(object: any) {
        const envoi: any = { ...object };
        for (const champ of this.liste.listesEnTexte ?? []) {
            envoi[champ] = Array.isArray(envoi[champ]) ? envoi[champ].join(',') : envoi[champ];
        }
        if (this.liste.retraitParActif && envoi.actif === undefined) envoi.actif = true;
        const request = object.id != null
            ? this.http.put<ApiItemResponse<any>>(`${this.liste.url}/update/${object.id}`, envoi)
            : this.http.post<ApiItemResponse<any>>(`${this.liste.url}/create`, envoi);
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: res => this.onSuccess(res),
            error: error => this.alertService.showError(error.error?.message ?? 'Enregistrement impossible')
        });
    }

    /** Retirer (referentiel-service) ou supprimer (evaluation-service), selon la liste. */
    onDelete(ligne: any) {
        const request = this.liste.retraitParActif
            ? this.http.put<ApiItemResponse<any>>(`${this.liste.url}/update/${ligne.id}`, { ...ligne, actif: false })
            : this.http.delete<ApiItemResponse<any>>(`${this.liste.url}/delete/${ligne.id}`);
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: res => this.onSuccess(res, this.liste.retraitParActif ? 'Entrée retirée.' : 'Entrée supprimée.'),
            error: error => this.alertService.showError(error.error?.message ?? 'Suppression impossible')
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
