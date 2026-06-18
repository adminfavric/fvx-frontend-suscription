import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';

import { NavItem } from './nav-item.model';

/**
 * Ítem de navegación del sidebar — pieza reutilizable que unifica el render del
 * menú normal y el de favoritos (antes duplicado en ``LayoutComponent``).
 *
 * Encapsula: ``routerLink`` + estado activo (clase ``nav-item--active``), ícono,
 * label, tooltip en modo colapsado y el botón ⭐ (favorito). La línea gráfica
 * del estado activo (color + peso + ícono relleno, sin fondo ni barra) vive en
 * el SCSS de este componente — un solo lugar para tocarla.
 *
 * ``ViewEncapsulation.None``: los estilos ``.nav-item*`` deben aplicar también
 * a los selectores de contexto que emite el layout (``.sidebar.collapsed``,
 * ``.nav-group--favorites``), por eso son globales (mismo patrón que
 * ``app-data-table`` / ``app-entity-drawer``).
 *
 * El drag-and-drop de favoritos NO vive aquí: el layout envuelve este
 * componente en ``<div class="nav-item-row" cdkDrag>`` dentro del ``cdkDropList``.
 */
@Component({
  selector: 'app-nav-item',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <a class="nav-item"
       [class.nav-item--favorite]="mode === 'pinned'"
       [routerLink]="item.route"
       routerLinkActive="nav-item--active"
       [routerLinkActiveOptions]="{ exact: true }"
       [attr.aria-label]="linkAriaLabel || null"
       [attr.aria-keyshortcuts]="linkAriaKeyshortcuts || null"
       [matTooltip]="collapsedTooltip ? (item.labelKey ? (item.labelKey | transloco) : (item.label || '')) : ''"
       matTooltipPosition="right"
       (click)="navClick.emit()">
      <mat-icon class="nav-item-icon">{{ item.icon }}</mat-icon>
      @if (showLabel) {
        <span class="nav-item-label">
          @if (item.labelKey) { {{ item.labelKey | transloco }} } @else { {{ item.label }} }
        </span>
        <button type="button"
                class="nav-item-fav"
                [class.nav-item-fav--on]="starOn"
                [disabled]="starDisabled"
                (click)="onStar($event)"
                [matTooltip]="starTooltipKey() | transloco"
                matTooltipPosition="right"
                [attr.aria-label]="starAriaKey() | transloco">
          <mat-icon>{{ starOn ? 'star' : 'star_border' }}</mat-icon>
        </button>
      }
    </a>
  `,
  styleUrls: ['./nav-item.component.scss'],
})
export class NavItemComponent {
  @Input({ required: true }) item!: NavItem;
  /** Mostrar label + ⭐ (false en sidebar colapsado de escritorio). */
  @Input() showLabel = true;
  /** Mostrar el tooltip lateral con el label (solo en colapsado de escritorio). */
  @Input() collapsedTooltip = false;
  /** ¿Este ítem ya es favorito del usuario? */
  @Input() favorite = false;
  /** ¿Quedan cupos de favoritos? (deshabilita la ⭐ al llegar al máximo). */
  @Input() canAddFavorite = true;
  /** ``toggle`` = ítem normal (⭐ alterna); ``pinned`` = sección Favoritos (⭐ siempre activa = quitar). */
  @Input() mode: 'toggle' | 'pinned' = 'toggle';
  /** aria-label opcional para el enlace (Favoritos: nombre + posición + atajo). */
  @Input() linkAriaLabel?: string;
  /** aria-keyshortcuts opcional (Favoritos: anuncia Alt+↑/↓ para reordenar). */
  @Input() linkAriaKeyshortcuts?: string;

  @Output() navClick = new EventEmitter<void>();
  @Output() toggleFavorite = new EventEmitter<string>();

  get starOn(): boolean {
    return this.mode === 'pinned' || this.favorite;
  }

  get starDisabled(): boolean {
    return this.mode === 'toggle' && !this.favorite && !this.canAddFavorite;
  }

  starTooltipKey(): string {
    if (this.mode === 'pinned' || this.favorite) return 'layout.nav.favorites.removeTooltip';
    return this.canAddFavorite ? 'layout.nav.favorites.addTooltip' : 'layout.nav.favorites.maxReached';
  }

  starAriaKey(): string {
    return this.starOn ? 'layout.nav.favorites.removeTooltip' : 'layout.nav.favorites.addTooltip';
  }

  onStar(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleFavorite.emit(this.item.slug);
  }
}
