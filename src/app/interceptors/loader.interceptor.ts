import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators'; // Import nécessaire
import { FeaturesService } from '../services/feature-service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
    constructor(private featuresService: FeaturesService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // On ne déclenche pas le loader global pour les GET (on préfère les skeletons)
        // ou si le header X-Skip-Loader est explicitement présent
        if (req.method === 'GET' || req.headers.has('X-Skip-Loader')) {
            return next.handle(req);
        }

        // 1. On signale le début de la requête pour afficher le loader (pour POST, PUT, DELETE, etc.)
        this.featuresService.addRequest(req);

        // 2. On laisse passer la requête
        return next.handle(req).pipe(
            // 3. finalize s'exécute à la fin (Succès ou Erreur)
            finalize(() => {
                this.featuresService.removeRequest(req);
            })
        );
    }
}
