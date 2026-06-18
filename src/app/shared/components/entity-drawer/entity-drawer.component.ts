import { Component, DestroyRef, inject, effect, HostListener, ViewEncapsulation, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EntityDrawerService } from '../../../core/services/entity-drawer.service';
import { ApiService } from '../../../core/services/api.service';
import { UserDetailComponent } from './details/user-detail.component';

@Component({
  selector: 'app-entity-drawer',
  standalone: true,
  imports: [
    CommonModule,
    NgComponentOutlet,
    A11yModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
    UserDetailComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (isOpen()) {
      <!-- Overlay. El click cierra el drawer; el teclado YA tiene una vía
           equivalente (Escape, via @HostListener('document:keydown.escape')).
           aria-hidden="true" lo saca del árbol de accesibilidad (patrón estándar
           de backdrop de diálogo modal). -->
      <div class="drawer-overlay" (click)="drawerService.close()" aria-hidden="true"></div>
      <!-- Drawer -->
      <div
        class="entity-drawer"
        [class.open]="isOpen()"
        [style.--fvx-drawer-width]="width()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-drawer-title"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        >
        <!-- Header -->
        <div class="drawer-header">
          <h2 id="entity-drawer-title">{{ getDefaultTitle() }}</h2>
          <button mat-icon-button (click)="drawerService.close()" class="close-btn"
                  [attr.aria-label]="'entityDrawer.close' | transloco">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <!-- Content -->
        <div class="drawer-content">
          @if (loading) {
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>{{ 'entityDrawer.loading' | transloco }}</p>
            </div>
          }
          @if (error && !loading) {
            <div class="error-container">
              <mat-icon>error_outline</mat-icon>
              <p>{{ error }}</p>
              <button mat-stroked-button (click)="loadData()">{{ 'entityDrawer.retry' | transloco }}</button>
            </div>
          }
          @if (isEmbedMode()) {
            <ng-container
              [ngComponentOutlet]="embedComponent()!"
              [ngComponentOutletInputs]="embedInputs()">
            </ng-container>
          } @else if (data && !loading && !error) {
            @if (drawerService.config()?.entityType === 'user') {
              <app-user-detail [data]="data"></app-user-detail>
            }
          }
        </div>
      </div>
    }
    `,
  styles: [`
    @use 'variables' as v;

    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      /* Blur sutil del contenido detrás. */
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .entity-drawer {
      /* Ancho parametrizable por instancia vía [style.--fvx-drawer-width] desde el config. */
      position: fixed;
      top: 0;
      right: calc(-1 * var(--fvx-drawer-width, 600px));
      width: var(--fvx-drawer-width, 600px);
      max-width: 100vw;
      height: 100vh;
      background: var(--fvx-bg-card);
      color: var(--fvx-text-primary);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      display: flex;
      flex-direction: column;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &.open {
        right: 0;
      }
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--fvx-border);
      flex-shrink: 0;

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--fvx-text-primary);
      }
    }

    .drawer-content {
      /* Consumido por embeds (p. ej. ProfileEditorComponent) para barra de acciones a ancho completo. */
      --entity-drawer-content-padding: 20px;
      flex: 1;
      overflow-y: auto;
      padding: var(--entity-drawer-content-padding);
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 40px;
      text-align: center;
    }

    .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: v.$color-warn;
    }
  `]
})
export class EntityDrawerComponent {
  drawerService = inject(EntityDrawerService);
  private api = inject(ApiService);
  private transloco = inject(TranslocoService);
  private destroyRef = inject(DestroyRef);

  isOpen = computed(() => this.drawerService.isOpen());

  /** Modo embed: sin llamada HTTP en el shell del drawer. */
  isEmbedMode = computed(() => !!this.drawerService.config()?.embedComponent);

  embedComponent = computed(() => this.drawerService.config()?.embedComponent ?? null);

  embedInputs = computed(() => this.drawerService.config()?.embedInputs ?? {});

  /**
   * Ancho del cajón en CSS. `null` → no se aplica style binding y la regla CSS
   * por defecto (`var(--fvx-drawer-width, 600px)` en `.entity-drawer`) toma valor.
   */
  width = computed(() => this.drawerService.config()?.width ?? null);

  loading = false;
  error: string | null = null;
  data: any = null;

  /** Estado previo de apertura + elemento a re-enfocar al cerrar (a11y). */
  private prevOpen = false;
  private restoreFocusEl: HTMLElement | null = null;

  /** Cierra el drawer con Escape (a11y de diálogo modal). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerService.isOpen()) {
      this.drawerService.close();
    }
  }

  constructor() {
    effect(() => {
      const cfg = this.drawerService.config();
      const open = this.drawerService.isOpen();

      // Foco: al abrir, recuerda el elemento disparador (si no está dentro del
      // drawer) para devolverle el foco al cerrar. cdkTrapFocusAutoCapture
      // mueve el foco al drawer; aquí solo gestionamos la restauración.
      if (open && !this.prevOpen) {
        const active = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
        this.restoreFocusEl = active && !active.closest('.entity-drawer') ? active : null;
      } else if (!open && this.prevOpen) {
        this.restoreFocusEl?.focus?.();
        this.restoreFocusEl = null;
      }
      this.prevOpen = open;

      if (open && cfg) {
        if (cfg.embedComponent) {
          this.loading = false;
          this.error = null;
          this.data = null;
          return;
        }
        this.loadData();
      } else if (!open) {
        this.data = null;
        this.error = null;
        this.loading = false;
      }
    });
  }

  getDefaultTitle(): string {
    const cfg = this.drawerService.config();
    if (cfg?.title) {
      return cfg.title;
    }
    return this.transloco.translate('entityDrawer.defaultTitle');
  }

  loadData(): void {
    const cfg = this.drawerService.config();
    if (!cfg || cfg.embedComponent) return;
    if (cfg.entityType !== 'user' || cfg.entityId == null) return;

    this.loading = true;
    this.error = null;

    // takeUntilDestroyed: abrir/cerrar el drawer repetidamente disparaba este
    // get() sin cancelar los anteriores (subs acumuladas + posible race al
    // setear this.data tras destruir).
    this.api.get<any>('users', cfg.entityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.data = res;
          this.loading = false;
        },
        error: err => {
          this.error = err?.message || this.transloco.translate('entityDrawer.loadError');
          this.loading = false;
        },
      });
  }
}
