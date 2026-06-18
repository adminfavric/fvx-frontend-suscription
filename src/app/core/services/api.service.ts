import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';
import { PaginatedResponse, QueryParams } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = inject(APP_CONFIG).apiUrl;

  constructor(private http: HttpClient) {}

  list<T>(endpoint: string, params?: QueryParams): Observable<PaginatedResponse<T>> {
    return this.http.get<PaginatedResponse<T>>(
      `${this.baseUrl}/${endpoint}/`,
      { params: this.buildParams(params) }
    );
  }

  get<T>(endpoint: string, id: number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}/${id}/`);
  }

  create<T>(endpoint: string, data: Partial<T>): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}/`, data);
  }

  update<T>(endpoint: string, id: number, data: Partial<T>): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}/${id}/`, data);
  }

  patch<T>(endpoint: string, id: number, data: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}/${id}/`, data);
  }

  delete(endpoint: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${endpoint}/${id}/`);
  }

  customAction<T>(endpoint: string, id: number, action: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}/${id}/${action}/`);
  }

  private buildParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }
}
