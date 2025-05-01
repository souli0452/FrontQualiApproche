import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { createRequestOption } from '../utils';

export interface CrudOperations<T, ID> {

    save(t: T): Observable<HttpResponse<T>>;

    update(t: T): Observable<HttpResponse<T>>;

    findAll(): Observable<HttpResponse<Array<T>>>;

    delete(id: ID): Observable<HttpResponse<void>>;
}

export abstract class QualiCrudService<T, ID> implements CrudOperations<T, ID> {

    protected constructor(
        protected http: HttpClient,
        protected uri: string
    ) {
    }

    save(t: T): Observable<HttpResponse<T>> {
        return this.http.post<T>(this.uri + "/create", t, {observe: 'response'});
    }

    update(t: T): Observable<HttpResponse<T>> {
        return this.http.put<T>(this.uri + "/update", t, {observe: 'response'});
    }

    findAll(): Observable<HttpResponse<Array<T>>> {
        return this.http.get<T[]>(this.uri + "/all", {observe: 'response'});
    }

    findById(id:string): Observable<HttpResponse<T>> {
        return this.http.get<T>(this.uri+`/get/${id}`, {observe: 'response'});
    }

    delete(id: ID): Observable<HttpResponse<void>> {
        return this.http.delete<void>(this.uri + `/delete/${id}` , {observe: 'response'});
    }

}
