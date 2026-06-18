import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config.token';
import type { DashboardStatsResponse } from '../models/dashboard-stats.model';

@Injectable({ providedIn: 'root' })
export class DashboardStatsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiUrl}/stats/`;

  /** ``GET /api/v1/stats/`` (JWT vía interceptor). */
  getStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(this.url);
  }
}
