import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-chart-doughnut',
  standalone: true,
  imports: [CommonModule, ChartModule],
  templateUrl: './chart-doughnut.component.html'
})
export class ChartDoughnutComponent implements OnInit {
    @Input() data: any = null; 
    @Input() title?: string; 
    @Input() cutout: string = '70%'; 
    
    // NOUVEAU : Ce que tu veux afficher au centre
    @Input() centerValue?: number | string; 
    @Input() centerLabel?: string; 

    options: any;
    
    // NOUVEAU : Plugin natif pour dessiner exactement au centre de l'anneau (ignorant la légende)
    customPlugins = [
        {
            id: 'centerTextPlugin',
            beforeDraw: (chart: any) => {
                if (this.centerValue === undefined) return;
                
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                if (!meta || !meta.data || meta.data.length === 0) return;
                
                // Centre exact de l'anneau géométrique
                const centerX = meta.data[0].x;
                const centerY = meta.data[0].y;
                
                ctx.save();
                
                // 1. Dessiner la valeur (ex: 2)
                ctx.font = 'bold 36px sans-serif';
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#0f172a'; // S'adapte au mode sombre
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.centerValue.toString(), centerX, centerY - 10);
                
                // 2. Dessiner le sous-titre (ex: TOTAL)
                if (this.centerLabel) {
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillStyle = '#64748b'; // Gris
                    ctx.fillText(this.centerLabel.toUpperCase(), centerX, centerY + 20);
                }
                ctx.restore();
            }
        }
    ];

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.initChartOptions();
    }

     ngOnInit() {
        this.initChartOptions();
    }

  initChartOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color') || '#475569';
        const isPetiteFenetre = window.innerWidth < 1300;
        // On recrée l'objet options pour forcer PrimeNG à se mettre à jour
        this.options = {
            cutout: this.cutout,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: {
                legend: {
                    position: isPetiteFenetre ? 'right' : 'right',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 10,
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        };
    }

}
