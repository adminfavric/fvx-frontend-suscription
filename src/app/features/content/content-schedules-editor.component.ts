import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

interface Schedule {
  id: number;
  content: number;
  plan: number;
  plan_name?: string;
  starts_at: string;
  ends_at: string | null;
  date_mode: 'date' | 'tbd' | 'available';
}

interface PlanOption {
  id: number;
  name: string;
}

const DATE_MODES = [
  { value: 'date', label: 'Mostrar fecha' },
  { value: 'tbd', label: 'Por confirmar' },
  { value: 'available', label: 'Material disponible' },
];

const DATE_MODE_LABELS: Record<string, string> = Object.fromEntries(
  DATE_MODES.map(m => [m.value, m.label]),
);

function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Programaciones de UNA pieza de contenido, para editarlas donde la usuaria las
 * va a buscar: dentro del propio contenido.
 *
 * **Por qué una lista y no un multiselect de membresías.** Cada programación
 * tiene datos propios —desde cuándo, hasta cuándo y cómo se muestra la fecha—
 * que unas casillas no pueden representar: una pieza puede estar en Oro desde
 * el 1 mostrando fecha y en Premium desde el 15 por confirmar. Con casillas,
 * marcar obligaría a inventar fechas y desmarcar borraría en silencio las que
 * había. Con la lista, agregar pide sus fechas y quitar avisa qué se pierde.
 *
 * Los cambios se guardan al momento (cada fila es un registro aparte, no un
 * campo del contenido), y así se dice en pantalla.
 */
@Component({
  selector: 'app-content-schedules-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    StatusChipComponent,
  ],
  template: `
    <div class="sched">
      <div class="sched__head">
        <span class="sched__title">
          <mat-icon>event_available</mat-icon>
          Programado en
        </span>
        <span class="sched__note">Los cambios de esta sección se guardan al momento.</span>
      </div>

      @if (loading()) {
        <p class="sched__muted">Cargando programaciones…</p>
      } @else if (!schedules().length && !formOpen()) {
        <p class="sched__empty">
          <mat-icon>visibility_off</mat-icon>
          Sin programar: nadie ve este contenido hasta que lo asignes a una membresía.
        </p>
      } @else {
        <ul class="sched__list">
          @for (s of schedules(); track s.id) {
            <li class="sched__row">
              <app-status-chip variant="info" [label]="s.plan_name || ('Membresía ' + s.plan)" />
              <span class="sched__range">
                {{ range(s) }}
                <span class="sched__mode">{{ modeLabel(s) }}</span>
              </span>
              <span class="sched__actions">
                <button mat-icon-button type="button" matTooltip="Editar esta programación"
                        aria-label="Editar esta programación" (click)="startEdit(s)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button type="button" color="warn" matTooltip="Quitar de esta membresía"
                        aria-label="Quitar de esta membresía" (click)="remove(s)">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </span>
            </li>
          }
        </ul>
      }

      @if (formOpen()) {
        <form [formGroup]="form" class="sched__form">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sched__form-plan">
            <mat-label>Membresía</mat-label>
            <mat-select formControlName="plan">
              @for (p of availablePlans(); track p.id) {
                <mat-option [value]="p.id">{{ p.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Desde</mat-label>
            <input matInput type="date" formControlName="starts_at" />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Hasta (vacío = sin fin)</mat-label>
            <input matInput type="date" formControlName="ends_at" />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sched__form-mode">
            <mat-label>Cómo mostrar la fecha</mat-label>
            <mat-select formControlName="date_mode">
              @for (m of dateModes; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="sched__form-actions">
            <button mat-button type="button" [disabled]="saving()" (click)="cancel()">Cancelar</button>
            <button mat-flat-button color="primary" type="button"
                    [disabled]="saving() || !form.value.plan || !form.value.starts_at"
                    (click)="save()">
              {{ saving() ? 'Guardando…' : (editing() ? 'Guardar cambios' : 'Agregar') }}
            </button>
          </div>
        </form>
      } @else {
        <button mat-stroked-button type="button" class="sched__add"
                [disabled]="loading() || !availablePlans().length"
                [matTooltip]="availablePlans().length ? '' : 'Ya está programado en todas las membresías activas.'"
                (click)="startAdd()">
          <mat-icon>add</mat-icon>
          Agregar membresía
        </button>
      }
    </div>
  `,
  styles: [`
    .sched__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .sched__title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: var(--fvx-text-sm, 0.875rem);
      color: var(--fvx-text-primary);
    }
    .sched__title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .sched__note, .sched__muted {
      font-size: 0.75rem;
      color: var(--fvx-text-secondary, #64748b);
    }
    .sched__empty {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px;
      padding: 10px 12px;
      border-radius: var(--fvx-radius, 9px);
      background: var(--fvx-chip-warn-bg, #fef3c7);
      color: var(--fvx-chip-warn-fg, #92400e);
      font-size: var(--fvx-text-sm, 0.875rem);
    }
    .sched__empty mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    .sched__list { list-style: none; margin: 0 0 10px; padding: 0; }
    .sched__row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid var(--fvx-border, #e5e7eb);
    }
    .sched__row:last-child { border-bottom: 0; }
    .sched__range {
      flex: 1 1 auto;
      min-width: 0;
      font-size: var(--fvx-text-sm, 0.875rem);
      color: var(--fvx-text-primary);
    }
    .sched__mode {
      display: block;
      font-size: 0.72rem;
      color: var(--fvx-text-secondary, #64748b);
    }
    .sched__actions { display: flex; flex-shrink: 0; }

    .sched__form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 6px;
      padding: 12px;
      border-radius: var(--fvx-radius, 9px);
      background: var(--fvx-hover-bg, #f8fafc);
    }
    .sched__form-plan, .sched__form-mode, .sched__form-actions { grid-column: 1 / -1; }
    .sched__form-actions { display: flex; justify-content: flex-end; gap: 8px; }

    @media (max-width: 600px) {
      .sched__form { grid-template-columns: 1fr; }
    }
  `],
})
export class ContentSchedulesEditorComponent implements OnInit {
  /** Pieza de contenido cuyas programaciones se editan. */
  @Input({ required: true }) contentId!: number;

  /**
   * Aviso de que algo cambió. Estas filas se guardan al momento, así que el
   * listado de detrás queda desfasado aunque el usuario cierre el diálogo con
   * Cancelar: la columna "Membresías" mostraría lo de antes.
   */
  @Input() onChange?: () => void;

  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  readonly dateModes = DATE_MODES;

  schedules = signal<Schedule[]>([]);
  plans = signal<PlanOption[]>([]);
  loading = signal(true);
  saving = signal(false);
  formOpen = signal(false);
  /** Programación en edición; `null` = el formulario está agregando una nueva. */
  editing = signal<Schedule | null>(null);

  form: FormGroup = this.fb.group({
    plan: [null as number | null],
    starts_at: [''],
    ends_at: [''],
    date_mode: ['date'],
  });

  ngOnInit(): void {
    forkJoin({
      schedules: this.api.list<Schedule>('content-schedules', { content: this.contentId, page_size: 100 }),
      plans: this.api.list<PlanOption>('plans', { page_size: 200, is_active: true }),
    }).subscribe({
      next: ({ schedules, plans }) => {
        this.schedules.set(schedules.results);
        this.plans.set(plans.results);
        this.loading.set(false);
      },
      error: err => {
        this.notify.handleError(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Membresías que se pueden elegir. Al agregar, solo las que aún no tienen
   * programación (el backend impone una por contenido y plan); al editar, la
   * propia, porque cambiar de membresía es quitar una y crear otra.
   */
  availablePlans(): PlanOption[] {
    const current = this.editing();
    if (current) return this.plans().filter(p => p.id === current.plan);
    const taken = new Set(this.schedules().map(s => s.plan));
    return this.plans().filter(p => !taken.has(p.id));
  }

  range(s: Schedule): string {
    return `${formatDay(s.starts_at)} → ${s.ends_at ? formatDay(s.ends_at) : 'sin fin'}`;
  }

  modeLabel(s: Schedule): string {
    return DATE_MODE_LABELS[s.date_mode] ?? DATE_MODE_LABELS['date'];
  }

  startAdd(): void {
    this.editing.set(null);
    const first = this.availablePlans()[0];
    this.form.reset({
      plan: first?.id ?? null,
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: '',
      date_mode: 'date',
    });
    this.formOpen.set(true);
  }

  startEdit(s: Schedule): void {
    this.editing.set(s);
    this.form.reset({
      plan: s.plan,
      starts_at: s.starts_at,
      ends_at: s.ends_at ?? '',
      date_mode: s.date_mode,
    });
    this.formOpen.set(true);
  }

  cancel(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  save(): void {
    const v = this.form.getRawValue();
    const payload = {
      content: this.contentId,
      plan: v.plan,
      starts_at: v.starts_at,
      ends_at: v.ends_at || null,
      date_mode: v.date_mode,
    };
    const current = this.editing();
    this.saving.set(true);
    const req = current
      ? this.api.patch<Schedule>('content-schedules', current.id, payload)
      : this.api.create<Schedule>('content-schedules', payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.notify.success(current ? 'Programación actualizada.' : 'Contenido programado.');
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        this.notify.handleError(err);
      },
    });
  }

  /** Quitar borra la fila y sus fechas, así que se dice cuáles antes de hacerlo. */
  remove(s: Schedule): void {
    const nombre = s.plan_name || `la membresía ${s.plan}`;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Quitar de ${nombre}`,
          message:
            `Este contenido dejará de verse en ${nombre}, y se pierden sus fechas ` +
            `(${this.range(s)}). El contenido en sí no se borra.`,
          confirmText: 'Quitar',
          color: 'warn',
        },
        width: '440px',
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.api.delete('content-schedules', s.id).subscribe({
          next: () => {
            this.notify.success(`Se quitó de ${nombre}.`);
            this.reload();
          },
          error: err => this.notify.handleError(err),
        });
      });
  }

  private reload(): void {
    this.api
      .list<Schedule>('content-schedules', { content: this.contentId, page_size: 100 })
      .subscribe({
        next: res => {
          this.schedules.set(res.results);
          this.onChange?.();
        },
        error: err => this.notify.handleError(err),
      });
  }
}
