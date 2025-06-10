import { Injectable } from '@angular/core';
import { HttpEvent, HttpEventType, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import {Observable, Observer, Subscription} from 'rxjs';
import { FeaturesService } from '../services/feature-service';


@Injectable()
export class LoaderInterceptor implements HttpInterceptor {

    constructor(private featuresService: FeaturesService) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        return new Observable<HttpEvent<any>>((observer: Observer<any>) => {
            const subscription: Subscription = next.handle(req).subscribe({

                next: (events) => {
                    if (events.type === HttpEventType.Sent) {
                        this.featuresService.addRequest(req);
                    } else if (events.type === HttpEventType.Response) {
                        this.featuresService.removeRequest(req);
                        observer.next(events);
                    }
                },

                error: err => {
                    this.featuresService.removeRequest(req);
                    observer.error(err);
                },

                complete: () => {
                    this.featuresService.removeRequest(req);
                    observer.complete;
                }
            });

            return () => {
                this.featuresService.removeRequest(req);
                subscription.unsubscribe();

            };
        });
    }
}
