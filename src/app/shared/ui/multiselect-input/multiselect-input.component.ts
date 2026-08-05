import { Component, forwardRef, input, NgZone, OnDestroy, OnInit, output, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { Subject, Subscription } from 'rxjs';
import { concatMap, debounceTime, map, switchMap } from 'rxjs/operators';
import { OptionsLoader } from '../lazy-options.model';

/**
 * Liste déroulante à choix multiple, alimentée page par page.
 *
 * <p>Même mécanique que {@link SelectInputComponent} — première page à l'ouverture, suivantes à
 * la demande, recherche déléguée au serveur — avec en plus le défilement infini : sur un choix
 * multiple, l'utilisateur parcourt la liste, et l'obliger à cliquer « Voir plus » à chaque palier
 * casserait ce parcours. Le bouton reste offert en pied de liste pour qui n'utilise pas la
 * souris.</p>
 *
 * @example
 * <app-multiselect-input [(ngModel)]="structureIds" optionLabel="libelleLong" optionValue="id"
 *                        [lazy]="true" [loadOptions]="structureService.chargerOptions"
 *                        [selectedOptions]="structuresRetenues" />
 */
@Component({
    selector: 'app-multiselect-input',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, MultiSelectModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MultiselectInputComponent),
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
            <p-multiselect
                [inputId]="fieldId()"
                [options]="lazy() ? lazyOptions() : options()"
                [optionLabel]="optionLabel()"
                [optionValue]="optionValue()"
                [placeholder]="placeholder()"
                [filter]="filter() || lazy()"
                [filterBy]="filterBy() || optionLabel()"
                [showClear]="showClear()"
                [display]="display()"
                [maxSelectedLabels]="maxSelectedLabels()"
                [selectedItemsLabel]="selectedItemsLabel()"
                [ngModel]="value"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="onSelection($event)"
                (onFilter)="onFilter($event)"
                (onPanelShow)="onPanelShow()"
                (onPanelHide)="onPanelHide()"
                (onBlur)="onTouched()"
                [disabled]="disabled() || desactiveParLeFormulaire()"
                [appendTo]="appendTo()"
                [styleClass]="styleClass()"
                scrollHeight="220px"
                [loading]="loading()"
            >
                <ng-template let-option pTemplate="item">
                    <span>{{ libelleDe(option) }}</span>
                </ng-template>

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
            </p-multiselect>
        </div>
    `
})
export class MultiselectInputComponent implements OnInit, OnDestroy, ControlValueAccessor {
    /** Libellé du champ. Omis, l'appelant garde le sien et le composant ne rend que la liste. */
    label = input<string>('');
    required = input(false);
    options = input<any[]>([]);
    placeholder = input('Sélectionner…');
    optionLabel = input('label');
    /** Laissé vide, c'est l'objet entier qui est retenu — même convention que PrimeNG. */
    optionValue = input<string | undefined>(undefined);
    filterBy = input('');
    filter = input(true);
    showClear = input(true);
    disabled = input(false);
    appendTo = input<any>('body');
    styleClass = input('w-full');
    display = input<'comma' | 'chip'>('comma');
    maxSelectedLabels = input(3);
    selectedItemsLabel = input('{0} sélectionnés');

    lazy = input(false);
    pageSize = input(20);
    loadOptions = input<OptionsLoader>();
    /** Éléments déjà retenus, à réinjecter : en modification ils ne sont pas tous en première page. */
    selectedOptions = input<any[]>([]);

    selectionChange = output<any>();

    loading = signal(false);
    hasMore = signal(true);
    lazyOptions = signal<any[]>([]);
    currentPage = signal(0);
    totalRecords = signal(0);

    value: any[] = [];
    desactiveParLeFormulaire = signal(false);
    onChange: (valeur: any) => void = () => {};
    onTouched: () => void = () => {};

    /** Voir {@link SelectInputComponent} : le filtre annule, la pagination empile. */
    private filtreSubject = new Subject<string>();
    private paginationSubject = new Subject<void>();
    private filtreSub?: Subscription;
    private paginationSub?: Subscription;
    private rechercheCourante = '';
    private versionFiltre = 0;

    /** Sentinelle posée en fin de liste : sa venue à l'écran déclenche la page suivante. */
    private sentinelle?: HTMLElement;
    private observateur?: IntersectionObserver;

    constructor(private ngZone: NgZone) {}

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

        this.filtreSubject.next('');
    }

    ngOnDestroy(): void {
        this.filtreSub?.unsubscribe();
        this.paginationSub?.unsubscribe();
        this.onPanelHide();
    }

    // ─── ControlValueAccessor ───────────────────────────────────────────────

    writeValue(valeur: any): void {
        this.value = valeur ?? [];
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

    onSelection(valeur: any[]): void {
        this.value = valeur ?? [];
        this.onChange(this.value);
        this.onTouched();
        this.selectionChange.emit(this.value);
    }

    // ─── Filtre, pagination, défilement ─────────────────────────────────────

    onFilter(event: any): void {
        if (!this.lazy()) {
            return;
        }
        this.rechercheCourante = event?.filter ?? '';
        this.filtreSubject.next(this.rechercheCourante);
    }

    /**
     * À l'ouverture du panneau, pose une sentinelle en fin de liste et l'observe.
     *
     * <p>L'observation se fait hors de la zone Angular : elle se déclenche à chaque pixel de
     * défilement, et y faire tourner la détection de changements rendrait la liste poussive. On
     * n'y rentre que pour demander la page suivante.</p>
     */
    onPanelShow(): void {
        if (!this.lazy()) {
            return;
        }
        this.ngZone.runOutsideAngular(() => {
            let tentatives = 0;
            const poser = () => {
                const liste = document.querySelector('.p-multiselect-list');
                if (!liste) {
                    // Le panneau est rendu de façon différée : on retente brièvement.
                    if (tentatives++ < 20) {
                        setTimeout(poser, 50);
                    }
                    return;
                }

                this.sentinelle = document.createElement('div');
                this.sentinelle.style.height = '1px';
                liste.appendChild(this.sentinelle);

                this.observateur = new IntersectionObserver(
                    (entrees) => {
                        if (!entrees[0]?.isIntersecting) {
                            return;
                        }
                        this.ngZone.run(() => this.chargerPageSuivante());
                    },
                    { root: liste.parentElement, rootMargin: '0px 0px 80px 0px', threshold: 0 }
                );
                this.observateur.observe(this.sentinelle);
            };
            poser();
        });
    }

    /** À la fermeture, tout est démonté : un observateur laissé derrière retiendrait le panneau. */
    onPanelHide(): void {
        this.observateur?.disconnect();
        this.observateur = undefined;
        this.sentinelle?.remove();
        this.sentinelle = undefined;
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
        return `multiselect-${base.toLowerCase().replace(/\s+/g, '-')}`;
    }

    private resteDesPages(annonce: boolean | undefined, recus: number, cumules: number, total: number): boolean {
        return annonce ?? (recus >= this.pageSize() && cumules < total);
    }

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
