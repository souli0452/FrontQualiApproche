import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { AuditGestionService } from '../../services/audit.service';
import { NoeudReferentiel } from '../../models/audit.model';

@Component({
    selector: 'app-referentiel-rqapbf',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    templateUrl: './referentiel-rqapbf.component.html'
})
export class ReferentielRQAPBFComponent implements OnInit, OnDestroy {

    referentiel: NoeudReferentiel[] = [];
    loading = true;
    recherche = '';

    private destroy$ = new Subject<void>();

    constructor(private auditService: AuditGestionService) {}

    ngOnInit(): void {
        this.charger();
    }

    charger(): void {
        this.loading = true;
        this.auditService.getReferentielRQAPBF()
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: [] }))
            )
            .subscribe((res: any) => {
                this.referentiel = res?.data ?? [];
                this.loading = false;
            });
    }

    get referentielFiltre(): NoeudReferentiel[] {
        if (!this.recherche.trim()) return this.referentiel;
        const q = this.recherche.toLowerCase();
        return this.filtrerNoeuds(this.referentiel, q);
    }

    private filtrerNoeuds(noeuds: NoeudReferentiel[], q: string): NoeudReferentiel[] {
        return noeuds.reduce((acc, n) => {
            const correspond = n.libelle?.toLowerCase().includes(q) || n.code?.toLowerCase().includes(q);
            const enfantsFiltres = n.enfants ? this.filtrerNoeuds(n.enfants, q) : [];
            if (correspond || enfantsFiltres.length > 0) {
                acc.push({ ...n, enfants: enfantsFiltres.length > 0 ? enfantsFiltres : n.enfants });
            }
            return acc;
        }, [] as NoeudReferentiel[]);
    }

    trackByNoeud(_index: number, n: NoeudReferentiel): string {
        return n.id ?? String(_index);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
