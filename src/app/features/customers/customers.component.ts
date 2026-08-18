import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';

interface FlowCustomer {
  customerId: string;
  name: string;
  email: string;
  creditCardType: string | null;
  last4CardDigits: string | null;
  status: number;
  created: string;
}

type CardFilter = 'all' | 'card' | 'nocard';

/**
 * Clientes registrados en Flow (espejo de solo lectura). Flow es la fuente de
 * verdad; este listado consume `GET /api/v1/customers/` que hace de proxy.
 *
 * OJO: en Flow "cliente" ≠ "suscripción". La ficha de cliente (con o sin tarjeta
 * registrada) queda creada al iniciar cualquier checkout y sigue vigente aunque
 * la persona no tenga ninguna suscripción activa o la haya cancelado. Por eso
 * aquí NO se muestra "Activo/Inactivo" (confundía con el estado de la
 * membresía): se muestra si tiene tarjeta registrada, que es lo que la ficha
 * realmente representa. Las suscripciones vivas se ven en /admin/subscriptions.
 */
@Component({
  selector: 'app-customers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTableModule, MatPaginatorModule, MatProgressBarModule, MatIconModule, PageHeaderComponent],
  template: `
   <div class="page-container">
    <app-page-header
      title="Clientes"
      subtitle="Fichas de cliente registradas en Flow (solo lectura). Una ficha no implica suscripción activa: eso se ve en Suscripciones."
      [breadcrumbs]="breadcrumbs">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (error()) {
      <div class="state state--error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (!loading() && rows().length === 0) {
      <div class="state"><mat-icon>group_off</mat-icon> Aún no hay clientes en Flow.</div>
    } @else if (!loading()) {
      <div class="search-bar">
        <mat-icon>search</mat-icon>
        <input type="text" [value]="search()" (input)="onSearch($any($event.target).value)"
               placeholder="Buscar por nombre, correo, tarjeta o ID Flow…" />
        @if (search()) {
          <button class="search-clear" (click)="onSearch('')" aria-label="Limpiar búsqueda"><mat-icon>close</mat-icon></button>
          <span class="search-count">{{ filtered().length }} resultado(s)</span>
        }
      </div>
      <div class="filters">
        <button class="chip-f" [class.chip-f--on]="filter() === 'all'" (click)="setFilter('all')">
          Todos <span class="chip-f__n">{{ rows().length }}</span>
        </button>
        <button class="chip-f" [class.chip-f--on]="filter() === 'card'" (click)="setFilter('card')">
          Con tarjeta <span class="chip-f__n">{{ withCard() }}</span>
        </button>
        <button class="chip-f" [class.chip-f--on]="filter() === 'nocard'" (click)="setFilter('nocard')">
          Sin tarjeta <span class="chip-f__n">{{ rows().length - withCard() }}</span>
        </button>
      </div>

      @if (!filtered().length) {
        <div class="state"><mat-icon>search_off</mat-icon> Sin resultados para "{{ search() }}".</div>
      } @else {
        <div class="table-wrap">
          <table mat-table [dataSource]="paged()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let c">{{ c.name || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let c">{{ c.email }}</td>
            </ng-container>
            <ng-container matColumnDef="card">
              <th mat-header-cell *matHeaderCellDef>Tarjeta registrada</th>
              <td mat-cell *matCellDef="let c">
                @if (c.last4CardDigits) {
                  <span class="chip chip--ok"><mat-icon>credit_card</mat-icon> {{ c.creditCardType }} ••••{{ c.last4CardDigits }}</span>
                } @else {
                  <span class="chip">Sin tarjeta</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Registrado</th>
              <td mat-cell *matCellDef="let c">{{ c.created | date: 'dd-MM-yyyy HH:mm' }}</td>
            </ng-container>
            <ng-container matColumnDef="customerId">
              <th mat-header-cell *matHeaderCellDef>ID Flow</th>
              <td mat-cell *matCellDef="let c"><code>{{ c.customerId }}</code></td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
          <mat-paginator
            [length]="filtered().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[20, 50, 100, 200]"
            (page)="onPage($event)"
            aria-label="Paginación de clientes">
          </mat-paginator>
        </div>
      }
    }
   </div>
  `,
  styles: [`
    :host { display: block; }
    .search-bar {
      display:flex; align-items:center; gap:8px; margin:0 0 12px; padding:8px 14px;
      background:#fff; border:1px solid var(--fvx-border,#e0dbe9); border-radius:12px; max-width:520px;
    }
    .search-bar > mat-icon { color:var(--fvx-text-muted,#8a8398); font-size:20px; width:20px; height:20px; flex:0 0 auto; }
    .search-bar input { flex:1; border:none; outline:none; background:transparent; font-size:.95rem; color:var(--fvx-text-primary,#2a2333); }
    .search-clear { border:none; background:transparent; cursor:pointer; display:grid; place-items:center; color:var(--fvx-text-muted,#8a8398); padding:0; }
    .search-clear mat-icon { font-size:18px; width:18px; height:18px; }
    .search-count { color:var(--fvx-text-muted,#8a8398); font-size:.8rem; white-space:nowrap; }
    .filters { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 14px; }
    .chip-f { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--fvx-border,#e0d6ec); background:#fff; color: var(--fvx-primary,#5b3a8a); border-radius:999px; padding:6px 14px; font-size:.85rem; font-weight:600; cursor:pointer; }
    .chip-f--on { background: var(--fvx-primary,#5b3a8a); color:#fff; border-color: var(--fvx-primary,#5b3a8a); }
    .chip-f__n { background: rgba(0,0,0,.08); border-radius:999px; padding:0 7px; font-size:.72rem; }
    .chip-f--on .chip-f__n { background: rgba(255,255,255,.25); }
    .table-wrap { overflow-x: auto; background: var(--fvx-surface, #fff); border: 1px solid var(--fvx-border, #e6e6ef); border-radius: 12px; }
    table { width: 100%; }
    code { font-size: .82rem; color: var(--fvx-text-muted, #6b6478); }
    .chip { display: inline-flex; align-items:center; gap:4px; padding: 2px 10px; border-radius: 999px; font-size: .78rem; background: #ececf2; color: #555; white-space:nowrap; }
    .chip mat-icon { font-size:15px; width:15px; height:15px; }
    .chip--ok { background: #e3f6ea; color: #1f7a45; }
    .state { display: flex; align-items: center; gap: 8px; padding: 32px; color: var(--fvx-text-muted, #6b6478); justify-content: center; }
    .state--error { color: #c0392b; }
  `],
})
export class CustomersComponent implements OnInit {
  private http = inject(HttpClient);
  cols = ['name', 'email', 'card', 'created', 'customerId'];
  rows = signal<FlowCustomer[]>([]);
  loading = signal(true);
  error = signal('');
  search = signal('');
  filter = signal<CardFilter>('all');
  pageSize = signal(20);
  pageIndex = signal(0);
  breadcrumbs = [
    { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
    { label: 'Clientes' },
  ];

  withCard = computed(() => this.rows().filter(c => !!c.last4CardDigits).length);

  /** Filas según el filtro con/sin tarjeta + la búsqueda de texto. */
  filtered = computed(() => {
    let list = this.rows();
    if (this.filter() === 'card') list = list.filter(c => !!c.last4CardDigits);
    else if (this.filter() === 'nocard') list = list.filter(c => !c.last4CardDigits);
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter(c =>
      `${c.name} ${c.email} ${c.creditCardType ?? ''} ${c.last4CardDigits ?? ''} ${c.customerId}`
        .toLowerCase()
        .includes(q),
    );
  });

  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  onSearch(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
  }

  setFilter(f: CardFilter): void {
    this.filter.set(f);
    this.pageIndex.set(0);
  }

  onPage(e: PageEvent): void {
    this.pageSize.set(e.pageSize);
    this.pageIndex.set(e.pageIndex);
  }

  async ngOnInit(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: FlowCustomer[] }>(`${environment.apiUrl}/customers/`),
      );
      this.rows.set(res?.data ?? []);
    } catch {
      this.error.set('No se pudieron cargar los clientes desde Flow.');
    } finally {
      this.loading.set(false);
    }
  }
}
