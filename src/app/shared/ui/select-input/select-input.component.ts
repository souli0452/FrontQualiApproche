import { Component, forwardRef, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Subject, Subscription } from 'rxjs';
import { concatMap, debounceTime, map, switchMap } from 'rxjs/operators';
import { OptionsLoader } from '../lazy-options.model';

/**
 * Liste déroulante à choix unique, alimentée page par page.
 *
 * <p>Un `p-select` reçoit d'ordinaire la liste entière. Nos référentiels sont servis paginés :
 * lui passer la réponse telle quelle ne lui donne pas un tableau mais un objet de pagination, et
 * n'en extraire que `content` le limite silencieusement à la première page. Ce composant prend la
 * pagination en charge — première page à l'ouverture, suivantes à la demande, recherche déléguée
 * au serveur.</p>
 *
 * <p>Il s'emploie comme un `p-select` : mêmes `optionLabel` / `optionValue` sur les objets
 * métier, et `[(ngModel)]` ou `[formControl]` indifféremment. Le libellé du champ reste à
 * l'appelant tant qu'il n'en passe pas un, pour ne rien changer aux écrans existants.</p>
 *
 * @example
 * <app-select-input [(ngModel)]="prioriteId" optionLabel="libelle" optionValue="id"
 *                   [lazy]="true" [loadOptions]="prioriteService.chargerOptions"
 *                   [selectedOptions]="prioriteCourante ? [prioriteCourante] : []" />
 */
@Component({
    selector: 'app-select-input',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, SelectModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectInputComponent),
            multi: true
        }
    ],
    template: `
        <div class="flex flex-col gap-1 w-full">
            @if (label()) {
                <label [for]="fieldId()" class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    {{ label() }}
                    @if (required()) {
                        <span class="text-red-500 ml-0.5">*</span>
                    }
                </label>
            }
            <p-select
                [inputId]="fieldId()"
                [options]="lazy() ? lazyOptions() : options()"
                [optionLabel]="optionLabel()"
                [optionValue]="optionValue()"
                [placeholder]="placeholder()"
                [filter]="filter() || lazy()"
                [filterBy]="filterBy() || optionLabel()"
                [showClear]="showClear()"
                [ngModel]="value"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="onSelection($event)"
                (onFilter)="onFilter($event)"
                (onBlur)="onTouched()"
                [disabled]="disabled() || desactiveParLeFormulaire()"
                [appendTo]="appendTo()"
                [styleClass]="styleClass()"
                scrollHeight="220px"
                [loading]="loading()"
            >
                <ng-template let-option pTemplate="item">
                    @if (option?._chargement) {
                        <div class="flex items-center gap-2 text-slate-400 py-1 opacity-60">
                            <i class="pi pi-spinner pi-spin text-sm"></i>
                            <span class="text-sm italic">Chargement…</span>
                        </div>
                    } @else {
                        <span>{{ libelleDe(option) }}</span>
                    }
                </ng-template>

                <!--
                  Le pied de liste ne s'affiche que s'il reste réellement des pages : sur un
                  référentiel qui tient en une page, « Voir plus » ne ferait qu'induire en erreur.
                -->
                <ng-template pTemplate="footer">
                    @if (lazy() && totalRecords() > pageSize()) {
                        <div
                            class="flex items-center justify-center gap-2 py-2 cursor-pointer border-t border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            (mousedown)="$event.preventDefault(); $event.stopPropagation(); hasMore() ? chargerPageSuivante() : revenirALaPremierePage()"
                        >
                            @if (loading()) {
                                <i class="pi pi-spinner pi-spin text-sm text-primary-500"></i>
                                <span class="text-sm text-slate-500">Chargement…</span>
                            } @else if (hasMore()) {
                                <i class="pi pi-chevron-down text-xs text-primary-500"></i>
                                <span class="text-sm text-primary-500 font-semibold">Voir plus</span>
                            } @else {
                                <i class="pi pi-chevron-up text-xs text-orange-500"></i>
                                <span class="text-sm text-orange-500 font-semibold">Voir moins</span>
                            }
                        </div>
                    }
                </ng-template>

                <ng-template pTemplate="empty">
                    <div class="py-2 px-3 text-sm text-slate-500">
                        @if (loading()) {
                            Chargement…
                        } @else {
                            Aucun résultat.
                        }
                    </div>
                </ng-template>
            </p-select>
        </div>
    `
})
export class SelectInputComponent implements OnInit, OnDestroy, ControlValueAccessor {
    /** Libellé du champ. Omis, l'appelant garde le sien et le composant ne rend que la liste. */
    label = input<string>('');
    required = input(false);
    /** Liste complète, hors mode paresseux. */
    options = input<any[]>([]);
    placeholder = input('Sélectionner…');
    /** Champ portant le libellé affiché, comme sur `p-select`. */
    optionLabel = input('label');
    /**
     * Champ portant la valeur retenue, comme sur `p-select`. Laissé vide, c'est l'objet
     * entier qui est retenu — même convention que PrimeNG.
     */
    optionValue = input<string | undefined>(undefined);
    /** Champs sur lesquels porte le filtre côté client. À défaut, le libellé. */
    filterBy = input('');
    filter = input(false);
    showClear = input(true);
    disabled = input(false);
    appendTo = input<any>('body');
    styleClass = input('w-full');

    /** Active le chargement page par page. Sans lui, le composant se comporte comme un `p-select`. */
    lazy = input(false);
    /** Taille de page demandée au serveur. */
    pageSize = input(20);
    loadOptions = input<OptionsLoader>();
    /**
     * Éléments déjà retenus, à réinjecter dans la liste.
     *
     * <p>En modification, la valeur enregistrée n'est pas nécessairement en première page :
     * sans cet apport, le champ s'afficherait vide alors qu'il porte une valeur.</p>
     */
    selectedOptions = input<any[]>([]);

    /** Émis à chaque changement de sélection, pour les écrans qui relancent une recherche derrière. */
    selectionChange = output<any>();
    /**
     * Émis avec l'option entière, et non la seule valeur retenue.
     *
     * <p>Un écran qui enregistre l'identifiant a souvent besoin du libellé qui va avec — pour
     * l'afficher sans réinterroger le référentiel. Le chercher dans une liste chargée d'avance
     * n'est plus possible ici : les options arrivent page par page.</p>
     */
    optionChange = output<any>();

    loading = signal(false);
    hasMore = signal(true);
    lazyOptions = signal<any[]>([]);
    currentPage = signal(0);
    totalRecords = signal(0);

    value: any = null;
    /** Désactivation venue du formulaire (`control.disable()`), distincte de l'entrée `disabled`. */
    desactiveParLeFormulaire = signal(false);
    onChange: (valeur: any) => void = () => {};
    onTouched: () => void = () => {};

    /**
     * Deux flux distincts, parce que les deux gestes ne se répondent pas de la même façon.
     *
     * <p>La saisie du filtre annule la recherche précédente et repart de la page 0 (`switchMap`) —
     * garder une réponse devenue obsolète afficherait les résultats d'un terme déjà effacé. Le
     * défilement, lui, empile les pages dans l'ordre (`concatMap`) : deux pages arrivées à
     * l'envers mêleraient les éléments.</p>
     */
    private filtreSubject = new Subject<string>();
    private paginationSubject = new Subject<void>();
    private filtreSub?: Subscription;
    private paginationSub?: Subscription;
    private rechercheCourante = '';
    /** Numéro de la recherche en cours : toute réponse plus ancienne est écartée. */
    private versionFiltre = 0;

    ngOnInit(): void {
        if (!this.lazy() || !this.loadOptions()) {
            return;
        }

        this.filtreSub = this.filtreSubject
            .pipe(
                debounceTime(300),
                switchMap((search) => {
                    this.currentPage.set(0);
                    this.versionFiltre++;
                    this.hasMore.set(true);
                    this.loading.set(true);
                    const version = this.versionFiltre;
                    return this.loadOptions()!({ search, page: 0, limit: this.pageSize() }).pipe(map((res) => ({ res, version })));
                })
            )
            .subscribe({
                next: ({ res, version }) => {
                    if (version !== this.versionFiltre) {
                        return;
                    }
                    const liste = this.avecPreSelection([...(res.options ?? [])]);
                    this.totalRecords.set(res.totalRecords ?? liste.length);
                    this.hasMore.set(this.resteDesPages(res.hasMore, res.options?.length ?? 0, liste.length, res.totalRecords ?? 0));
                    this.lazyOptions.set(liste);
                    this.loading.set(false);
                },
                error: () => this.loading.set(false)
            });

        this.paginationSub = this.paginationSubject
            .pipe(
                concatMap(() => {
                    const page = this.currentPage() + 1;
                    const search = this.rechercheCourante;
                    const version = this.versionFiltre;
                    this.loading.set(true);
                    return this.loadOptions()!({ search, page, limit: this.pageSize() }).pipe(map((res) => ({ res, page, version })));
                })
            )
            .subscribe({
                next: ({ res, page, version }) => {
                    // Le filtre a changé depuis la demande : cette page ne concerne plus rien.
                    if (version !== this.versionFiltre) {
                        this.loading.set(false);
                        return;
                    }
                    this.currentPage.set(page);
                    const liste = this.avecPreSelection([...this.lazyOptions(), ...(res.options ?? [])]);
                    this.totalRecords.set(res.totalRecords ?? liste.length);
                    this.hasMore.set(this.resteDesPages(res.hasMore, res.options?.length ?? 0, liste.length, res.totalRecords ?? 0));
                    this.lazyOptions.set(liste);
                    this.loading.set(false);
                },
                error: () => this.loading.set(false)
            });

        // Première page, sans filtre.
        this.filtreSubject.next('');
    }

    ngOnDestroy(): void {
        this.filtreSub?.unsubscribe();
        this.paginationSub?.unsubscribe();
    }

    // ─── ControlValueAccessor : ngModel comme formControl ────────────────────

    writeValue(valeur: any): void {
        this.value = valeur;
    }

    registerOnChange(fn: (valeur: any) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(desactive: boolean): void {
        this.desactiveParLeFormulaire.set(desactive);
    }

    onSelection(valeur: any): void {
        this.value = valeur;
        this.onChange(valeur);
        this.onTouched();
        this.selectionChange.emit(valeur);
        this.optionChange.emit(this.optionDe(valeur));
    }

    /** Option correspondant à une valeur retenue, parmi celles actuellement chargées. */
    private optionDe(valeur: any): any {
        const champ = this.optionValue();
        if (!champ) {
            return valeur;
        }
        const liste = this.lazy() ? this.lazyOptions() : this.options();
        return liste.find((o) => o?.[champ] === valeur) ?? null;
    }

    // ─── Filtre et pagination ───────────────────────────────────────────────

    onFilter(event: any): void {
        if (!this.lazy()) {
            return;
        }
        this.rechercheCourante = event?.filter ?? '';
        this.filtreSubject.next(this.rechercheCourante);
    }

    chargerPageSuivante(): void {
        if (this.hasMore() && !this.loading()) {
            this.paginationSubject.next();
        }
    }

    revenirALaPremierePage(): void {
        if (!this.loading()) {
            this.filtreSubject.next(this.rechercheCourante);
        }
    }

    libelleDe(option: any): string {
        return option?.[this.optionLabel()] ?? '';
    }

    fieldId(): string {
        const base = this.label() || this.optionLabel();
        return `select-${base.toLowerCase().replace(/\s+/g, '-')}`;
    }

    /** Reste-t-il des pages ? Le serveur tranche s'il le dit ; sinon on s'en remet au total. */
    private resteDesPages(annonce: boolean | undefined, recus: number, cumules: number, total: number): boolean {
        return annonce ?? (recus >= this.pageSize() && cumules < total);
    }

    /** Complète la liste des éléments déjà retenus qui n'y figureraient pas. */
    private avecPreSelection(liste: any[]): any[] {
        const champ = this.optionValue();
        for (const retenu of this.selectedOptions() ?? []) {
            // Sans `optionValue`, c'est l'objet entier qui fait valeur : on se rabat sur le
            // libellé, seul repère commun entre l'élément retenu et ceux que rend le serveur.
            const cle = champ ? retenu?.[champ] : this.libelleDe(retenu);
            const dejaLa = liste.some((o) => (champ ? o?.[champ] : this.libelleDe(o)) === cle);
            if (!dejaLa) {
                liste.push(retenu);
            }
        }
        return liste;
    }
}
