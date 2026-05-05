import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { DataViewModule } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { GlobalSearchService, SearchResult } from '../../services/global-search.service';

@Component({
    selector: 'app-search-results',
    standalone: true,
    imports: [CommonModule, RouterModule, CardModule, DataViewModule, TagModule, ButtonModule, SkeletonModule, BadgeModule],
    template: `
        <div class="search-results-container p-4">
            <div class="flex align-items-center gap-3 mb-5">
                <i class="pi pi-search text-4xl text-primary"></i>
                <h1 class="text-3xl font-bold m-0">Résultats pour : "{{ query }}"</h1>
            </div>

            <div class="grid">
                <!-- Filtres / Catégories -->
                <div class="col-12 lg:col-3">
                    <p-card header="Catégories" styleClass="mb-4 shadow-sm">
                        <div class="flex flex-column gap-2">
                            <p-button label="Tous les résultats" [text]="true" severity="secondary" styleClass="text-left w-full" [badge]="results.length.toString()"></p-button>
                            <p-button label="Utilisateurs" [text]="true" severity="secondary" styleClass="text-left w-full" badge="0"></p-button>
                            <p-button label="Non-conformités" [text]="true" severity="secondary" styleClass="text-left w-full" badge="0"></p-button>
                            <p-button label="Structures" [text]="true" severity="secondary" styleClass="text-left w-full" badge="0"></p-button>
                        </div>
                    </p-card>
                </div>

                <!-- Résultats -->
                <div class="col-12 lg:col-9">
                    <div *ngIf="loading">
                        <div class="card mb-3 p-3" *ngFor="let i of [1,2,3]">
                            <p-skeleton width="30%" height="2rem" styleClass="mb-2"></p-skeleton>
                            <p-skeleton width="100%" height="1.5rem" styleClass="mb-2"></p-skeleton>
                            <p-skeleton width="60%" height="1rem"></p-skeleton>
                        </div>
                    </div>

                    <div *ngIf="!loading && results.length === 0" class="flex flex-column align-items-center justify-content-center p-8 bg-surface-50 border-round-xl">
                        <i class="pi pi-search-minus text-6xl text-slate-300 mb-4"></i>
                        <span class="text-xl font-medium text-slate-500">Aucun résultat trouvé pour "{{ query }}"</span>
                        <p-button label="Effacer la recherche" [text]="true" class="mt-2" (click)="clearSearch()"></p-button>
                    </div>

                    <p-dataView #dv [value]="results" [rows]="5" [paginator]="true" layout="list" *ngIf="!loading && results.length > 0">
                        <ng-template #list let-items>
                            <div class="grid grid-nogutter">
                                <div class="col-12" *ngFor="let item of items; let first = first">
                                    <div class="flex flex-column sm:flex-row align-items-start p-4 gap-4 border-bottom-1 border-surface-200 hover:bg-surface-50 cursor-pointer transition-colors" (click)="goToDetail(item)">
                                        <div class="flex-1">
                                            <div class="flex justify-content-between align-items-center mb-2">
                                                <span class="font-bold text-xl text-primary">{{ item.title }}</span>
                                                <p-tag [value]="item.type" [severity]="getTypeSeverity(item.type)"></p-tag>
                                            </div>
                                            <p class="text-slate-600 m-0 mb-3">{{ item.description }}</p>
                                            <div class="flex align-items-center gap-2 text-sm text-slate-400">
                                                <i class="pi pi-calendar"></i>
                                                <span>{{ item.date }}</span>
                                                <span class="mx-2">•</span>
                                                <i class="pi pi-info-circle"></i>
                                                <span>{{ item.reference }}</span>
                                            </div>
                                        </div>
                                        <button pButton icon="pi pi-chevron-right" class="p-button-rounded p-button-text p-button-plain align-self-center"></button>
                                    </div>
                                </div>
                            </div>
                        </ng-template>
                    </p-dataView>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .search-results-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        :host ::ng-deep .p-dataview-content {
            background: transparent;
            border: none;
        }
    `]
})
export class SearchResultsComponent implements OnInit, OnDestroy {
    query: string = '';
    loading: boolean = false;
    results: SearchResult[] = [];
    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private route: ActivatedRoute,
        private globalSearchService: GlobalSearchService,
        private router: Router
    ) {}

    ngOnInit() {
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            this.query = params['q'] || '';
            if (this.query) {
                this.performSearch();
            }
        });
    }

    performSearch() {
        this.loading = true;
        this.globalSearchService.search(this.query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.results = data;
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Search error:', error);
                    this.loading = false;
                }
            });
    }

    getTypeSeverity(type: string) {
        switch (type) {
            case 'NC': return 'danger';
            case 'Utilisateur': return 'info';
            case 'Structure': return 'success';
            default: return 'warning';
        }
    }

    goToDetail(item: any) {
        if (item.link) {
            this.router.navigate([item.link]);
        }
    }

    clearSearch() {
        this.query = '';
        this.results = [];
        this.router.navigate(['/pages/recherche']);
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
