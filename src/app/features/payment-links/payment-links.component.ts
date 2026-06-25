import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../environments/environment';

interface PaymentLink {
  id: number;
  plan: number;
  plan_name: string;
  name: string;
  email: string;
  months: number;
  access_until: string | null;
  payment_url: string;
  status: string;
  is_active: boolean;
  is_paid: boolean;
  created: string;
}

interface PlanOpt { id: number; name: string; amount: number | null; }

/**
 * Cobros por LINK DE PAGO de Flow. El admin genera un link (pago único que
 * habilita N meses) para enviar al cliente; el cliente paga con cualquier medio
 * dentro de Flow. Con "Verificar pago" se consulta el estado y se activa el
 * acceso. Reemplaza la modalidad manual/transferencia.
 */
@Component({
  selector: 'app-payment-links',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule, DatePipe, PageHeaderComponent],
  template: `
    <div class="page-container">
      <app-page-header
        title="Cobros por link (Flow)"
        subtitle="Genera un link de pago de Flow y envíalo al cliente. Paga con cualquier medio (tarjeta, débito, transferencia). Al pagar, verifica y se activa el acceso."
        [breadcrumbs]="[
          { labelKey: 'common.breadcrumbHome', link: '/admin/dashboard' },
          { label: 'Cobros por link' }
        ]"
      />

      <section class="pl-body">
        <!-- ── Generar link ── -->
        <div class="pl-card">
          <h2 class="pl-card__title"><mat-icon>add_link</mat-icon> Generar link de pago</h2>
          <div class="pl-form">
            <label>Correo del cliente
              <input type="email" [(ngModel)]="email" placeholder="cliente@correo.cl" />
            </label>
            <label>Nombre
              <input type="text" [(ngModel)]="name" placeholder="Nombre del cliente" />
            </label>
            <label>Membresía
              <select [(ngModel)]="planId">
                <option [ngValue]="null" disabled>Selecciona un plan</option>
                @for (p of plans(); track p.id) {
                  <option [ngValue]="p.id">{{ p.name }} @if (p.amount) { · {{ '$' + (p.amount | number:'1.0-0') }} }</option>
                }
              </select>
            </label>
            <label>Meses de acceso
              <input type="number" min="1" [(ngModel)]="months" />
            </label>
          </div>
          @if (error()) { <p class="pl-error"><mat-icon>error_outline</mat-icon> {{ error() }}</p> }
          <button class="pl-btn pl-btn--gold" [disabled]="busy()" (click)="generate()">
            <mat-icon>link</mat-icon> {{ busy() ? 'Generando…' : 'Generar link' }}
          </button>

          @if (lastLink(); as link) {
            <div class="pl-link-out">
              <span class="pl-link-out__label"><mat-icon>check_circle</mat-icon> Link generado — cópialo y envíaselo al cliente:</span>
              <div class="pl-link-out__row">
                <input readonly [value]="link" #lk />
                <button class="pl-btn" (click)="copy(link)"><mat-icon>content_copy</mat-icon> Copiar</button>
                <a class="pl-btn" [href]="link" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> Abrir</a>
              </div>
            </div>
          }
        </div>

        <!-- ── Lista de cobros ── -->
        <div class="pl-card">
          <h2 class="pl-card__title"><mat-icon>receipt_long</mat-icon> Cobros generados</h2>
          @if (loading()) {
            <p class="pl-muted">Cargando…</p>
          } @else if (!items().length) {
            <p class="pl-muted">Aún no has generado cobros por link.</p>
          } @else {
            <div class="pl-table-wrap">
              <table class="pl-table">
                <thead>
                  <tr>
                    <th>Cliente</th><th>Membresía</th><th>Meses</th>
                    <th>Estado</th><th>Acceso hasta</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (it of items(); track it.id) {
                    <tr>
                      <td>
                        <strong>{{ it.email }}</strong>
                        @if (it.name) { <span class="pl-sub">{{ it.name }}</span> }
                      </td>
                      <td>{{ it.plan_name }}</td>
                      <td class="num">{{ it.months }}</td>
                      <td>
                        @if (it.is_active) { <span class="pl-chip pl-chip--ok">Pagado · activo</span> }
                        @else if (it.is_paid) { <span class="pl-chip pl-chip--warn">Pagado · vencido</span> }
                        @else { <span class="pl-chip pl-chip--pend">Pendiente de pago</span> }
                      </td>
                      <td>{{ it.access_until ? (it.access_until | date:'dd-MM-yyyy') : '—' }}</td>
                      <td class="pl-actions">
                        <button class="pl-btn pl-btn--sm" (click)="copy(it.payment_url)" title="Copiar link"><mat-icon>content_copy</mat-icon></button>
                        @if (!it.is_paid) {
                          <button class="pl-btn pl-btn--sm pl-btn--gold" [disabled]="verifying() === it.id" (click)="verify(it)">
                            {{ verifying() === it.id ? 'Verificando…' : 'Verificar pago' }}
                          </button>
                          <button class="pl-btn pl-btn--sm pl-btn--danger" title="Eliminar cobro pendiente" (click)="remove(it)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .pl-body { display:flex; flex-direction:column; gap:16px; margin-top:.5rem; }
    .pl-card { background: var(--fvx-bg-card,#fff); border:1px solid var(--fvx-border,#e4e6f0); border-radius:14px; padding:20px 22px; }
    .pl-card__title { display:flex; align-items:center; gap:8px; margin:0 0 16px; font-size:1.05rem; color: var(--fvx-text-primary,#171a26); }
    .pl-card__title mat-icon { color: var(--fvx-primary,#5b3a8a); }
    .pl-form { display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
    .pl-form label { display:flex; flex-direction:column; gap:6px; font-size:.85rem; color: var(--fvx-text-secondary,#565d72); }
    .pl-form input, .pl-form select { padding:10px 12px; border:1px solid var(--fvx-border,#d9cdbb); border-radius:9px; font-size:.95rem; background:#fff; }
    .pl-btn { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--fvx-border,#d9cdbb); background:#fff; color: var(--fvx-text-primary,#2a2333); border-radius:999px; padding:9px 16px; font-size:.88rem; font-weight:600; cursor:pointer; text-decoration:none; }
    .pl-btn:hover:not(:disabled) { background:#f6f3fb; }
    .pl-btn:disabled { opacity:.6; cursor:default; }
    .pl-btn--gold { background:#d9a441; border-color:#d9a441; color:#2e1a52; }
    .pl-btn--gold:hover:not(:disabled) { background:#cf9a34; }
    .pl-btn--sm { padding:6px 10px; font-size:.8rem; }
    .pl-btn--danger { color:#c0392b; border-color:#e0b4b0; }
    .pl-btn--danger:hover:not(:disabled) { background:#fdecea; }
    .pl-btn mat-icon { font-size:18px; width:18px; height:18px; }
    button.pl-btn { margin-top:16px; }
    .pl-actions button.pl-btn { margin-top:0; }
    .pl-error { display:flex; align-items:center; gap:6px; color:#b91c1c; font-size:.9rem; margin:12px 0 0; }
    .pl-error mat-icon { font-size:18px; width:18px; height:18px; }

    .pl-link-out { margin-top:18px; padding:14px 16px; background:#f3f9f4; border:1px solid #cfe9d5; border-radius:10px; }
    .pl-link-out__label { display:flex; align-items:center; gap:6px; color:#1f7a45; font-weight:600; font-size:.88rem; }
    .pl-link-out__label mat-icon { font-size:18px; width:18px; height:18px; }
    .pl-link-out__row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
    .pl-link-out__row input { flex:1; min-width:240px; padding:9px 12px; border:1px solid #cfe9d5; border-radius:9px; background:#fff; font-size:.85rem; color:#2a2333; }
    .pl-link-out__row .pl-btn { margin-top:0; }

    .pl-table-wrap { overflow-x:auto; }
    .pl-table { width:100%; border-collapse:collapse; font-size:.92rem; }
    .pl-table th, .pl-table td { padding:11px 12px; text-align:left; white-space:nowrap; }
    .pl-table th { font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; color: var(--fvx-text-muted,#828aa0); border-bottom:1px solid var(--fvx-border,#e4e6f0); }
    .pl-table tbody tr { border-bottom:1px solid var(--fvx-border,#eef0f7); }
    .pl-table .num { text-align:center; }
    .pl-sub { display:block; color: var(--fvx-text-muted,#828aa0); font-size:.8rem; }
    .pl-actions { display:flex; gap:6px; }
    .pl-chip { display:inline-block; padding:3px 10px; border-radius:999px; font-size:.74rem; font-weight:700; }
    .pl-chip--ok { background:#e3f6ea; color:#1f7a45; }
    .pl-chip--warn { background:#fbf0d8; color:#b9842b; }
    .pl-chip--pend { background:#ececf2; color:#565d72; }
    .pl-muted { color: var(--fvx-text-muted,#828aa0); }
  `],
})
export class PaymentLinksComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private base = `${environment.apiUrl}/payment-links`;

  private notify(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4500 });
  }

  email = '';
  name = '';
  planId: number | null = null;
  months = 1;

  plans = signal<PlanOpt[]>([]);
  items = signal<PaymentLink[]>([]);
  loading = signal(true);
  busy = signal(false);
  verifying = signal<number | null>(null);
  error = signal('');
  lastLink = signal<string>('');

  async ngOnInit(): Promise<void> {
    try {
      const plans = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/plans/?page_size=200&is_active=true`),
      );
      this.plans.set((plans?.results ?? plans ?? []) as PlanOpt[]);
    } catch { /* sin planes */ }
    await this.loadList();
  }

  private async loadList(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<any>(`${this.base}/?page_size=200`));
      this.items.set((res?.results ?? res ?? []) as PaymentLink[]);
    } catch {
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async generate(): Promise<void> {
    this.error.set('');
    if (!this.email.includes('@') || !this.planId) {
      this.error.set('Indica un correo válido y una membresía.');
      return;
    }
    this.busy.set(true);
    try {
      const created = await firstValueFrom(
        this.http.post<PaymentLink>(`${this.base}/`, {
          email: this.email.trim(),
          name: this.name.trim(),
          plan: this.planId,
          months: this.months || 1,
        }),
      );
      this.lastLink.set(created.payment_url);
      this.items.update(list => [created, ...list]);
      this.email = ''; this.name = ''; this.planId = null; this.months = 1;
      this.notify('Link generado. Cópialo y envíaselo al cliente.');
    } catch (e: any) {
      this.error.set(e?.message || 'No se pudo generar el link. Revisa los datos e inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  async verify(it: PaymentLink): Promise<void> {
    this.verifying.set(it.id);
    try {
      const updated = await firstValueFrom(
        this.http.post<PaymentLink & { paid: boolean }>(`${this.base}/${it.id}/verify/`, {}),
      );
      this.items.update(list => list.map(x => (x.id === it.id ? { ...x, ...updated } : x)));
      if (updated.paid) {
        this.notify('✓ Pago confirmado. El acceso quedó activo.');
      } else {
        this.notify('Aún no se registra el pago en Flow. Pídele al cliente que complete el pago y vuelve a verificar.');
      }
    } catch {
      this.notify('No se pudo verificar el pago. Intenta de nuevo en unos segundos.');
    } finally {
      this.verifying.set(null);
    }
  }

  async remove(it: PaymentLink): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar cobro pendiente',
        message: `¿Eliminar el cobro pendiente de "${it.email}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Volver',
        color: 'warn',
      },
      panelClass: 'fvx-crud-dialog', width: '460px', maxWidth: '92vw',
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;
    try {
      await firstValueFrom(this.http.delete(`${this.base}/${it.id}/`));
      this.items.update(list => list.filter(x => x.id !== it.id));
      this.notify('Cobro pendiente eliminado.');
    } catch {
      this.notify('No se pudo eliminar el cobro.');
    }
  }

  copy(url: string): void {
    if (url) {
      navigator.clipboard?.writeText(url);
      this.notify('Link copiado al portapapeles.');
    }
  }
}
