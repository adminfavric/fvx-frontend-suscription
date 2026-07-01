import {
  ChangeDetectionStrategy,
  Component,
  signal,
  HostListener,
  OnInit,
  OnDestroy,
  effect,
  inject,
  Renderer2,
  ElementRef,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterModule } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import type { MenuSectionDto } from '../../../core/models/menu.model';
import { MenuService } from '../../../core/services/menu.service';
import { normalizeNavRoute } from '../../../core/utils/nav-route.util';
import {
  labelKeyForMenuItem,
  labelKeyForMenuSection as labelKeyForMenuSectionUtil,
} from '../../../core/utils/nav-i18n.util';
import { EntityDrawerService } from '../../../core/services/entity-drawer.service';
import { UiSettingsService } from '../../../core/services/ui-settings.service';
import { UserUiPreferencesService } from '../../../core/services/user-ui-preferences.service';
import { InboxService } from '../../../core/services/inbox.service';
import { BreadcrumbsService } from '../../../core/services/breadcrumbs.service';
import { CommandPaletteService } from '../../../core/commands/command-palette.service';
import type { InboxNotification, InboxNotificationKind } from '../../../core/models/inbox-notification.model';
import { ProfileEditorComponent } from '../profile-editor/profile-editor.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ConfigUserComponent } from '../config-user/config-user.component';
import { ContentDialogComponent } from '../content-dialog/content-dialog.component';
import { type StatusChipVariant } from '../status-chip/status-chip.component';
import { HelpShortcutsComponent } from '../help-shortcuts/help-shortcuts.component';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavItem } from '../nav-item/nav-item.model';
import { DateFormatPipe } from '../../pipes/date-format.pipe';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { APP_CONFIG, type AppStage } from '../../../core/config/app-config.token';
import { ThemeService, type FvxThemeId } from '../../../core/services/theme.service';
import type { FvxUiLang } from '../../../core/i18n/locale-storage';

interface NavGroup {
  /**
   * Identidad estable y ÚNICA del grupo (slug de la sección, o un id fijo en el
   * fallback). Es la clave del ``@for`` y del estado de colapso — NO usar
   * ``labelKey``/``label`` para eso: pueden venir ``undefined`` o repetirse entre
   * secciones, y al colisionar el ``@for`` reutiliza nodos y el colapso se aplica
   * al grupo equivocado (toggling errático tras el primer click).
   */
  key: string;
  /** API menu section name (plain text). */
  label?: string;
  /** i18n key for fallback nav when the menu API is empty. */
  labelKey?: string;
  items: NavItem[];
}

const DEFAULT_NAV_GROUPS: NavGroup[] = [
  {
    key: 'fallback-administration',
    labelKey: 'layout.nav.fallback.groupAdministration',
    items: [
      { slug: 'fallback-plans', icon: 'card_membership', labelKey: 'layout.nav.fallback.plans', route: '/admin/plans' },
      { slug: 'fallback-customers', icon: 'badge', labelKey: 'layout.nav.fallback.customers', route: '/admin/customers' },
      { slug: 'fallback-subscriptions', icon: 'subscriptions', labelKey: 'layout.nav.fallback.subscriptions', route: '/admin/subscriptions' },
      { slug: 'fallback-content', icon: 'video_library', labelKey: 'layout.nav.fallback.content', route: '/admin/content' },
      { slug: 'fallback-programacion', icon: 'event_note', labelKey: 'layout.nav.fallback.programacion', route: '/admin/programacion' },
      { slug: 'fallback-payment-links', icon: 'add_link', label: 'Cobros por link', route: '/admin/links-pago' },
      { slug: 'fallback-events', icon: 'celebration', labelKey: 'layout.nav.fallback.events', route: '/admin/events' },
      { slug: 'fallback-messages', icon: 'mail', labelKey: 'layout.nav.fallback.messages', route: '/admin/messages' },
      { slug: 'fallback-correos', icon: 'campaign', label: 'Correos masivos', route: '/admin/correos' },
      { slug: 'fallback-comp-access', icon: 'vpn_key', label: 'Accesos de cortesía', route: '/admin/acceso-cortesia' },
    ],
  },
  {
    key: 'fallback-dev',
    labelKey: 'layout.nav.fallback.groupDev',
    items: [
      {
        slug: 'fallback-components',
        icon: 'widgets',
        labelKey: 'layout.nav.fallback.components',
        route: '/admin/components',
      },
    ],
  },
];

// Mapas i18n del menú movidos a ``core/utils/nav-i18n.util.ts`` como fuente
// única — el command palette también los consume. Aliasamos
// ``labelKeyForMenuSection`` para mantener la firma original que toma el
// ``MenuSectionDto`` completo.
function labelKeyForMenuSection(s: MenuSectionDto): string | undefined {
  return labelKeyForMenuSectionUtil(s.slug, s.name);
}

function menuSectionsToNavGroups(sections: MenuSectionDto[]): NavGroup[] {
  // Claves de grupo ÚNICAS y estables. No confiar en que ``s.slug`` sea único:
  // si el menú trae slugs vacíos o repetidos, dos grupos comparten clave, el
  // ``track`` del @for colisiona y Angular reutiliza nodos (solo el primero y el
  // último responden bien al colapso). Desambiguamos con el índice ante choque.
  const seen = new Set<string>();
  return sections
    .map((s, index) => {
      const groupLabelKey = labelKeyForMenuSection(s);
      const items: NavItem[] = s.items.flatMap(it => {
        const route = normalizeNavRoute(it.route);
        if (route === null) {
          return [];
        }
        const labelKey = labelKeyForMenuItem(route, it.slug);
        const item: NavItem = {
          slug: it.slug,
          icon: it.icon?.trim() ? it.icon : 'label',
          label: it.name,
          labelKey,
          route,
        };
        return [item];
      });
      const base = (s.slug ?? '').trim() || `section-${index}`;
      const key = seen.has(base) ? `${base}-${index}` : base;
      seen.add(key);
      return { key, label: s.name, labelKey: groupLabelKey, items };
    })
    .filter(g => g.items.length > 0);
}

@Component({
  selector: 'app-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    DragDropModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressBarModule,
    MatBadgeModule,
    MatTooltipModule,
    ConfigUserComponent,
    AvatarComponent,
    NavItemComponent,
    DateFormatPipe,
    TimeAgoPipe,
    TranslocoPipe,
  ],
  template: `
    <!-- Mobile overlay -->
    @if (mobileOpen() && isMobile()) {
      <!-- Backdrop: cerrar al tocar fuera es un atajo de puntero; por teclado el
           menú se cierra con Escape / el botón hamburguesa (ambos enfocables).
           El overlay no es un control y no debe estar en el tab-order. -->
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div class="sidebar-overlay"
           (click)="mobileOpen.set(false)"
           (touchmove)="$event.preventDefault()"></div>
    }

    <!-- Sidebar -->
    <aside class="sidebar"
           [class.collapsed]="collapsed() && !isMobile()"
           [class.mobile-open]="mobileOpen() && isMobile()"
           [class.mobile-hidden]="!mobileOpen() && isMobile()"
           (touchstart)="onTouchStart($event)"
           (touchmove)="onTouchMove($event)"
           (touchend)="onTouchEnd()">

      <div class="sidebar-header">
        <div class="sidebar-brand">
          <!-- Logo + nombre navegan al inicio (/dashboard). En mobile además cierra
               el sidebar. El <a> envuelve solo la marca; el botón close queda fuera. -->
          <a
            class="sidebar-brand__home"
            [routerLink]="['/admin/dashboard']"
            (click)="isMobile() && mobileOpen.set(false)"
            [attr.aria-label]="'layout.goHome' | transloco"
          >
            @if (logoUrl()) {
              <img class="brand-logo" [src]="logoUrl()!" alt="" />
            } @else {
              <mat-icon class="brand-icon">layers</mat-icon>
            }
            @if (!collapsed() || isMobile()) {
              @if (appTitle()) {
                <span class="brand-name">{{ appTitle() }}</span>
              } @else {
                <span class="brand-name">{{ 'layout.brandName' | transloco }}</span>
              }
            }
          </a>
          @if (isMobile()) {
            <span class="spacer"></span>
            <button class="sidebar-close" (click)="mobileOpen.set(false)">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- Favoritos del usuario: aparece arriba si tiene marcados. Drag-and-drop reordena. -->
        @if (favoriteNavItems().length > 0) {
          <div class="nav-group nav-group--favorites">
            @if (!collapsed() || isMobile()) {
              <span class="nav-group-title">
                {{ 'layout.nav.favorites.title' | transloco }}
              </span>
            } @else {
              <div class="nav-group-divider"></div>
            }
            <div cdkDropList (cdkDropListDropped)="onFavoriteDrop($event)">
              @for (item of favoriteNavItems(); track item.slug; let i = $index) {
                <!-- Reordenable por teclado (a11y, WCAG 2.1.1): la fila es
                     enfocable y Alt+↑/↓ mueve el favorito; el <a> interno de
                     app-nav-item sigue navegando. Alt evita chocar con el scroll
                     y con la navegación de flechas del lector de pantalla. -->
                <!-- El keydown se captura aquí por bubbling: el foco real vive en
                     el <a> interno de app-nav-item (enfocable nativo por routerLink),
                     que YA es operable por teclado. NO ponemos tabindex en la fila
                     para no crear un 2º tabstop. -->
                <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
                <div class="nav-item-row" cdkDrag
                     [attr.data-fav-slug]="item.slug"
                     (keydown)="onFavoriteKeydown($event, item.slug)">
                  <app-nav-item
                    [item]="item"
                    mode="pinned"
                    [showLabel]="!collapsed() || isMobile()"
                    [collapsedTooltip]="collapsed() && !isMobile()"
                    [linkAriaLabel]="(!collapsed() || isMobile()) && favoriteNavItems().length > 1 ? favoriteRowAriaLabel(item, i) : undefined"
                    [linkAriaKeyshortcuts]="favoriteNavItems().length > 1 ? 'Alt+ArrowUp Alt+ArrowDown' : undefined"
                    (navClick)="onNavClick()"
                    (toggleFavorite)="uiPrefs.toggleFavorite($event)" />
                </div>
              }
            </div>
            <!-- Anuncia el reordenamiento por teclado a lectores de pantalla. -->
            <div class="cdk-visually-hidden" aria-live="polite" role="status">{{ favoriteStatus() }}</div>
          </div>
        }

        @for (group of navGroups(); track group.key) {
          @let groupCollapsed = (!collapsed() || isMobile()) && isGroupCollapsed(group);
          <div class="nav-group" [class.nav-group--collapsed]="groupCollapsed">
            @if (!collapsed() || isMobile()) {
              <button type="button"
                      class="nav-group-title nav-group-title--toggle"
                      [attr.aria-expanded]="!groupCollapsed"
                      [title]="(groupCollapsed ? 'layout.nav.group.expand' : 'layout.nav.group.collapse') | transloco"
                      (click)="toggleGroup(group)">
                <span class="nav-group-title-text">
                  @if (group.labelKey) {
                    {{ group.labelKey | transloco }}
                  } @else {
                    {{ group.label }}
                  }
                </span>
                <mat-icon class="nav-group-chevron" aria-hidden="true">expand_more</mat-icon>
              </button>
            } @else {
              <div class="nav-group-divider"></div>
            }
            <!-- inert cuando está colapsado: el colapso es solo CSS (altura 0 +
                 opacity 0), así que sin esto los <a> invisibles seguirían en el
                 tab-order y serían alcanzables por lectores de pantalla
                 (WCAG 2.4.3 Orden del foco). [inert] los saca del foco y del AT. -->
            <div class="nav-group-items" [inert]="groupCollapsed">
              <div class="nav-group-inner">
                @for (item of group.items; track item.slug) {
                  <app-nav-item
                    [item]="item"
                    mode="toggle"
                    [favorite]="isFavorite(item.slug)"
                    [canAddFavorite]="uiPrefs.canAddMoreFavorites()"
                    [showLabel]="!collapsed() || isMobile()"
                    [collapsedTooltip]="collapsed() && !isMobile()"
                    (navClick)="onNavClick()"
                    (toggleFavorite)="uiPrefs.toggleFavorite($event)" />
                }
              </div>
            </div>
          </div>
        }
      </nav>

      <div class="sidebar-footer">
        @if (envBadge(); as badge) {
          @if (!collapsed() || isMobile()) {
            <div class="sidebar-env" [attr.data-variant]="badge.variant" role="status">
              <span class="sidebar-env__dot" aria-hidden="true"></span>
              v{{ appVersion }} · {{ envLongKey() | transloco }}
            </div>
          }
        }
        <app-config-user [narrow]="collapsed() && !isMobile()" />
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-wrapper"
         [class.sidebar-expanded]="!collapsed() && !isMobile()"
         [class.sidebar-collapsed]="collapsed() && !isMobile()">

      <header class="topbar">
        <button mat-icon-button (click)="toggleSidebar()" class="topbar-toggle">
          <mat-icon>{{ isMobile() ? 'menu' : (collapsed() ? 'menu' : 'menu_open') }}</mat-icon>
        </button>

        <!-- Breadcrumbs: auto-derivados del menú via BreadcrumbsService. -->
        <nav class="topbar-crumbs" [attr.aria-label]="'pageHeader.ariaBreadcrumb' | transloco">
          @for (c of breadcrumbs.trail(); track c.labelKey || c.label; let last = $last) {
            @if (c.link && !last) {
              <a [routerLink]="c.link"
                 class="topbar-crumbs__item"
                 [title]="c.labelKey ? (c.labelKey | transloco) : (c.label || '')">
                @if (c.labelKey) { {{ c.labelKey | transloco }} } @else { {{ c.label }} }
              </a>
            } @else {
              <span class="topbar-crumbs__item"
                    [class.topbar-crumbs__item--current]="last"
                    [title]="c.labelKey ? (c.labelKey | transloco) : (c.label || '')">
                @if (c.labelKey) { {{ c.labelKey | transloco }} } @else { {{ c.label }} }
              </span>
            }
            @if (!last) {
              <mat-icon class="topbar-crumbs__sep" aria-hidden="true">chevron_right</mat-icon>
            }
          }
        </nav>

        <span class="spacer"></span>

        <!-- Búsqueda / palette completa (placeholder + shortcut), ahora a la derecha. -->
        <button
          type="button"
          class="topbar-search"
          (click)="palette.open()"
          [matTooltip]="'layout.commandPalette.tooltip' | transloco"
          matTooltipPosition="below"
          [attr.aria-label]="'layout.commandPalette.tooltip' | transloco">
          <mat-icon class="topbar-search__icon" aria-hidden="true">search</mat-icon>
          <span class="topbar-search__placeholder">
            {{ 'layout.commandPalette.searchPlaceholder' | transloco }}
          </span>
          <kbd class="topbar-search__kbd" aria-hidden="true">{{ paletteShortcutLabel }}</kbd>
        </button>

        <button
          mat-icon-button
          type="button"
          class="topbar-action topbar-bell"
          [matMenuTriggerFor]="inboxMenu"
          [matBadge]="inbox.unreadCount() || null"
          matBadgeColor="warn"
          matBadgeSize="small"
          matBadgeOverlap="true"
          [matTooltip]="'layout.notifications.tooltip' | transloco"
          matTooltipPosition="below"
          [attr.aria-label]="'layout.notifications.tooltip' | transloco">
          <mat-icon>notifications</mat-icon>
        </button>
        <mat-menu #inboxMenu="matMenu" class="inbox-menu" xPosition="before">
          <!-- Cabecera del menú: el (click) solo frena la propagación para que el
               mat-menu no se cierre; no es un control interactivo. -->
          <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
          <div class="inbox-header" (click)="$event.stopPropagation()">
            <strong>{{ 'layout.notifications.title' | transloco }}</strong>
            @if (inbox.unreadCount() > 0) {
              <button mat-button class="inbox-mark-all" (click)="inbox.markAllRead(); $event.stopPropagation()">
                {{ 'layout.notifications.markAllRead' | transloco }}
              </button>
            }
          </div>
          <mat-divider></mat-divider>
          @if (inbox.items().length === 0) {
            <div class="inbox-empty">
              <mat-icon>inbox</mat-icon>
              <span>{{ 'layout.notifications.empty' | transloco }}</span>
            </div>
          } @else {
            <div class="inbox-list">
              @for (n of inbox.items(); track n.id) {
                <button
                  mat-menu-item
                  class="inbox-item"
                  [class.inbox-item--unread]="n.read_at === null"
                  (click)="onNotificationClick(n)">
                  <mat-icon [class]="'inbox-icon inbox-icon--' + n.kind">
                    {{ kindIcon(n.kind) }}
                  </mat-icon>
                  <div class="inbox-content">
                    <div class="inbox-title">{{ n.title }}</div>
                    @if (n.body) {
                      <div class="inbox-body">{{ n.body }}</div>
                    }
                    <div
                      class="inbox-time"
                      [matTooltip]="n.created | dateFormat: 'DD/MM/YYYY HH:mm'"
                      matTooltipPosition="left">
                      {{ n.created | timeAgo }}
                    </div>
                  </div>
                </button>
              }
            </div>
          }
        </mat-menu>

        <button
          mat-icon-button
          type="button"
          class="topbar-action"
          (click)="openHelp()"
          [matTooltip]="'layout.helpTooltip' | transloco"
          matTooltipPosition="below"
          [attr.aria-label]="'layout.helpTooltip' | transloco">
          <mat-icon>help_outline</mat-icon>
        </button>

        <button
          mat-icon-button
          type="button"
          class="topbar-action topbar-user"
          [matMenuTriggerFor]="userMenu"
          [matTooltip]="auth.user()?.email || ('layout.userTooltip' | transloco)"
          matTooltipPosition="below"
          [attr.aria-label]="'layout.userMenuAria' | transloco">
          <app-avatar
            [name]="topbarAvatarName()"
            [imageUrl]="topbarAvatarPhoto()"
            [size]="32"
          />
        </button>
        <mat-menu #userMenu="matMenu" class="fvx-user-menu" xPosition="before">
          <div class="user-menu-header">
            <strong>{{ auth.user()?.first_name }} {{ auth.user()?.last_name }}</strong>
            <small>{{ auth.user()?.email }}</small>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="openProfile()">
            <mat-icon>account_circle</mat-icon>
            <span>{{ 'layout.profile' | transloco }}</span>
          </button>
          <button mat-menu-item [matMenuTriggerFor]="themeMenu">
            <mat-icon>palette</mat-icon>
            <span>{{ 'layout.themeSubmenu' | transloco }}</span>
          </button>
          <button mat-menu-item [matMenuTriggerFor]="langMenu">
            <mat-icon>language</mat-icon>
            <span>{{ 'layout.lang.label' | transloco }}</span>
          </button>
          <button mat-menu-item (click)="openHelp()">
            <mat-icon>help_outline</mat-icon>
            <span>{{ 'layout.helpTooltip' | transloco }}</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon>
            <span>{{ 'layout.signOut' | transloco }}</span>
          </button>
          <div class="user-menu-footer">
            {{ 'layout.version' | transloco: { version: appVersion } }}
          </div>
        </mat-menu>

        <mat-menu #themeMenu="matMenu" class="fvx-user-submenu">
          @for (id of themeIds; track id) {
            <button mat-menu-item (click)="applyTheme(id)" [class.active]="currentTheme() === id">
              <mat-icon>{{ themeIcon(id) }}</mat-icon>
              <span>{{ themeLabelKey(id) | transloco }}</span>
            </button>
          }
        </mat-menu>

        <mat-menu #langMenu="matMenu" class="fvx-user-submenu">
          @for (lang of langs; track lang) {
            <button mat-menu-item (click)="applyLang(lang)" [class.active]="currentLang() === lang">
              @if (currentLang() === lang) {
                <mat-icon>check</mat-icon>
              } @else {
                <mat-icon class="user-menu-blank-icon">check</mat-icon>
              }
              <span>{{ ('layout.lang.' + lang) | transloco }}</span>
            </button>
          }
        </mat-menu>
      </header>

      @if (navigating()) {
        <mat-progress-bar
          class="route-progress"
          mode="indeterminate"
          aria-hidden="true"
        ></mat-progress-bar>
      }

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  readonly transloco = inject(TranslocoService);
  auth = inject(AuthService);
  private readonly menu = inject(MenuService);
  private readonly drawer = inject(EntityDrawerService);
  private readonly dialog = inject(MatDialog);
  private readonly uiSettings = inject(UiSettingsService);
  readonly uiPrefs = inject(UserUiPreferencesService);
  private readonly router = inject(Router);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly themeService = inject(ThemeService);
  readonly inbox = inject(InboxService);
  readonly palette = inject(CommandPaletteService);
  readonly breadcrumbs = inject(BreadcrumbsService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** Texto del atajo según OS (Mac usa ⌘, otros Ctrl). */
  readonly paletteShortcutLabel = this.isMac() ? '⌘K' : 'Ctrl K';

  private isMac(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }

  /** Título de marca remoto; el template cae a `'layout.brandName' | transloco` si es `null`. */
  readonly appTitle = this.uiSettings.appTitle;

  /** URL del logo remoto; el template cae a `<mat-icon>layers</mat-icon>` si es `null`. */
  readonly logoUrl = this.uiSettings.logoUrl;

  /** True mientras hay una navegación en curso. Pinta la barra de progreso superior. */
  readonly navigating = signal(false);
  private routerSub?: Subscription;

  // ── Env badge (footer del sidebar) + version + theme/lang submenus ───────────
  readonly appVersion = this.appConfig.version;

  /** Devuelve `null` en `production` (sin chip); en staging/dev devuelve solo el
   *  `variant` (el texto lo provee `envLongKey()` con el pipe transloco). */
  readonly envBadge = computed<{ variant: StatusChipVariant } | null>(() => {
    const stage: AppStage = this.appConfig.stage;
    if (stage === 'production') {
      return null;
    }
    return { variant: stage === 'staging' ? 'warn' : 'danger' };
  });

  /** CLAVE i18n del entorno para el chip del sidebar (se traduce con el pipe
   *  `| transloco` en el template, así reacciona al cambio de idioma —
   *  `transloco.translate()` aquí no reaccionaría). */
  readonly envLongKey = computed<string>(() => {
    const stage: AppStage = this.appConfig.stage;
    return stage === 'staging' ? 'layout.env.stagingLong' : 'layout.env.devLong';
  });

  readonly themeIds: readonly FvxThemeId[] = this.themeService.options;
  readonly currentTheme = this.themeService.currentId;
  readonly langs: readonly FvxUiLang[] = ['en', 'es'];
  readonly currentLang = signal<FvxUiLang>(
    (this.transloco.getActiveLang() as FvxUiLang) || 'en',
  );

  applyTheme(id: FvxThemeId): void {
    this.themeService.setTheme(id);
  }

  applyLang(lang: FvxUiLang): void {
    this.transloco.setActiveLang(lang);
    this.currentLang.set(lang);
  }

  themeLabelKey(id: FvxThemeId): string {
    // Las paletas viven en `layout.theme.*` (catálogo §1 ya las traduce).
    const map: Record<FvxThemeId, string> = {
      'tmp-default': 'layout.theme.tmpDefault',
      'tmp-light': 'layout.theme.tmpLight',
      'tmp-dark': 'layout.theme.tmpDark',
      'tmp-blackandwhite': 'layout.theme.tmpBlackandwhite',
      'tmp-beige': 'layout.theme.tmpBeige',
    };
    return map[id] ?? id;
  }

  /**
   * Ícono Material para cada tema. Cada uno tiene un glifo que evoca su
   * carácter visual: sun (light), moon (dark), contraste (B&W), paleta (beige),
   * sparkle (predeterminado = "el que elegimos por ti").
   */
  themeIcon(id: FvxThemeId): string {
    const map: Record<FvxThemeId, string> = {
      'tmp-default': 'auto_awesome',
      'tmp-light': 'light_mode',
      'tmp-dark': 'dark_mode',
      'tmp-blackandwhite': 'contrast',
      'tmp-beige': 'palette',
    };
    return map[id] ?? 'palette';
  }

  openHelp(): void {
    const mobile = window.innerWidth <= 768;
    ContentDialogComponent.openWith(this.dialog, {
      title: this.transloco.translate('layout.help.title'),
      titleIcon: 'help_outline',
      component: HelpShortcutsComponent,
      size: mobile ? 'fullscreen' : 'md',
    });
  }

  kindIcon(kind: InboxNotificationKind): string {
    switch (kind) {
      case 'critical': return 'error';
      case 'operational': return 'warning';
      default: return 'info';
    }
  }

  /**
   * Click en una notificación: la marca leída y si tiene `link`, navega.
   * Si el link es externo (otra origin) abre en pestaña nueva; si es relativo
   * (empieza con `/`), usa el Router para no recargar la SPA.
   */
  onNotificationClick(n: InboxNotification): void {
    if (n.read_at === null) {
      this.inbox.markRead(n.id);
    }
    const link = (n.link || '').trim();
    if (!link) return;
    if (link.startsWith('/')) {
      this.router.navigateByUrl(link);
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }

  /** Texto para iniciales / alt del ``app-avatar`` del header. */
  readonly topbarAvatarName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    return full || u.username;
  });

  readonly topbarAvatarPhoto = computed(() => this.auth.user()?.photo_url ?? null);

  readonly navGroups = computed(() => {
    const api = this.menu.sections();
    if (this.menu.loadFailed() || api.length === 0) {
      return DEFAULT_NAV_GROUPS;
    }
    return menuSectionsToNavGroups(api);
  });

  /**
   * Items favoritos resueltos: cruza ``UserUiPreferences.favorite_menu_items``
   * (slugs en orden) con los ``NavItem`` actuales (API o fallback). Slugs
   * huérfanos (item borrado o renombrado) se ignoran silenciosamente.
   */
  readonly favoriteNavItems = computed(() => {
    const slugs = this.uiPrefs.favoriteMenuItems();
    if (slugs.length === 0) return [] as NavItem[];
    // Mapa slug → NavItem para lookup O(1).
    const byslug = new Map<string, NavItem>();
    for (const group of this.navGroups()) {
      for (const item of group.items) {
        byslug.set(item.slug, item);
      }
    }
    const out: NavItem[] = [];
    for (const slug of slugs) {
      const found = byslug.get(slug);
      if (found) out.push(found);
    }
    return out;
  });

  /** True si ``slug`` está en favoritos. Usado para la ⭐ activa/inactiva. */
  isFavorite(slug: string): boolean {
    return this.uiPrefs.isFavorite(slug);
  }

  /** Drag-and-drop dentro de la sección "Favoritos". */
  onFavoriteDrop(event: CdkDragDrop<NavItem[]>): void {
    const current = [...this.uiPrefs.favoriteMenuItems()];
    moveItemInArray(current, event.previousIndex, event.currentIndex);
    this.uiPrefs.reorderFavorites(current);
  }

  /** Mensaje para la región aria-live: anuncia el reordenamiento por teclado. */
  readonly favoriteStatus = signal('');

  /** Etiqueta accesible de una fila de favorito (nombre + posición + atajo). */
  favoriteRowAriaLabel(item: NavItem, index: number): string {
    const total = this.favoriteNavItems().length;
    const name = item.labelKey ? this.transloco.translate(item.labelKey) : (item.label ?? item.slug);
    return this.transloco.translate('layout.nav.favorites.rowLabel', {
      name,
      index: index + 1,
      total,
    });
  }

  /** Reordena el favorito `slug` con Alt+↑/Alt+↓ (a11y, alternativa al D&D).
   *  Alt evita chocar con el scroll de página y la navegación del lector.
   *
   *  IMPORTANTE: deriva el índice ACTUAL desde el slug, no de un índice capturado
   *  en el template. Con `@for (... track item.slug)` Angular reordena los nodos
   *  sin recrear los listeners, así que un `index` del closure se queda obsoleto
   *  tras el primer movimiento (causaba "sube una vez y luego no hace nada"). */
  onFavoriteKeydown(event: KeyboardEvent, slug: string): void {
    if (!event.altKey) return;
    const dir = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (dir === 0) return;

    const order = [...this.uiPrefs.favoriteMenuItems()];
    const index = order.indexOf(slug);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= order.length) return; // no está, o ya en el extremo

    event.preventDefault();
    moveItemInArray(order, index, target);
    this.uiPrefs.reorderFavorites(order);

    // Anunciar el movimiento al AT.
    const name = this.favoriteNameForSlug(slug);
    this.favoriteStatus.set(
      this.transloco.translate('layout.nav.favorites.moved', {
        name,
        index: target + 1,
        total: order.length,
      }),
    );
    // Re-enfocar el MISMO favorito por slug. setTimeout (macrotask) corre DESPUÉS
    // de que Angular re-renderiza el @for; con queueMicrotask el focus() se
    // ejecutaba antes del render y el foco quedaba descolocado (solo movía una
    // vez). El <a> interno es el elemento enfocable (routerLink), no la fila.
    setTimeout(() => {
      const link = this.host.nativeElement.querySelector<HTMLElement>(
        `.nav-group--favorites .nav-item-row[data-fav-slug="${slug}"] a.nav-item`,
      );
      link?.focus();
    });
  }

  private favoriteNameForSlug(slug: string): string {
    const item = this.favoriteNavItems().find(i => i.slug === slug);
    if (!item) return slug;
    return item.labelKey ? this.transloco.translate(item.labelKey) : (item.label ?? item.slug);
  }

  // ── Grupos colapsables del menú lateral ───────────────────────────────────
  // Cada título de grupo (HOME, ADMINISTRATION, …) actúa como botón que pliega
  // sus items con una transición `grid-template-rows: 1fr → 0fr` (ver scss). El
  // estado se recuerda por grupo (su `key`) en localStorage. TODOS los grupos
  // se pueden plegar por igual, incluido el que contiene la página actual: el
  // usuario manda y la ubicación sigue visible en el título/breadcrumb.
  private readonly NAV_COLLAPSED_STORE = 'fvx-nav-collapsed';

  /** Mapa `{ [groupKey]: true }` con los grupos que el usuario plegó. Persistido en localStorage. */
  private readonly collapsedGroups = signal<Record<string, boolean>>(this.readCollapsedMap());

  /** Clave estable y única del grupo (slug de sección / id fijo del fallback). */
  private groupKey(group: NavGroup): string {
    return group.key;
  }

  /** ¿El grupo está colapsado? Lee el estado persistido por clave. */
  isGroupCollapsed(group: NavGroup): boolean {
    return !!this.collapsedGroups()[this.groupKey(group)];
  }

  /** Click en el título: pliega/expande el grupo. */
  toggleGroup(group: NavGroup): void {
    const key = this.groupKey(group);
    if (!key) return;
    const next = { ...this.collapsedGroups(), [key]: !this.collapsedGroups()[key] };
    this.collapsedGroups.set(next);
    try {
      localStorage.setItem(this.NAV_COLLAPSED_STORE, JSON.stringify(next));
    } catch {
      /* storage lleno / modo privado: el colapso sigue funcionando en memoria. */
    }
  }

  private readCollapsedMap(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(this.NAV_COLLAPSED_STORE);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  collapsed = signal(false);
  mobileOpen = signal(false);
  screenWidth = signal(window.innerWidth);

  // Touch swipe tracking
  private touchStartX = 0;
  private touchCurrentX = 0;
  private isSwiping = false;
  private readonly SWIPE_THRESHOLD = 80;

  private bodyScrollEffect = effect(() => {
    const open = this.mobileOpen();
    const mobile = this.isMobile();
    if (mobile && open) {
      this.renderer.addClass(document.body, 'sidebar-open-no-scroll');
    } else {
      this.renderer.removeClass(document.body, 'sidebar-open-no-scroll');
    }
  });

  constructor(private renderer: Renderer2) {}

  /**
   * Abre el perfil del usuario autenticado en el ``EntityDrawer``
   * (modo embed). El componente embebido (`ProfileEditorComponent`)
   * llama por sí mismo a `GET/PATCH /users/me/`.
   */
  openProfile(): void {
    this.drawer.open({
      title: this.transloco.translate('layout.profileDrawerTitle'),
      embedComponent: ProfileEditorComponent,
    });
  }

  ngOnInit(): void {
    this.screenWidth.set(window.innerWidth);
    this.menu.load();
    // Inbox: empieza polling cuando el shell se monta (usuario autenticado).
    this.inbox.start();
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Solo mostrar la barra de progreso en cambios de RUTA reales, no cuando
        // únicamente cambian los query-params en la misma página. Los filtros /
        // búsqueda / orden / paginación sincronizan su estado a la URL con
        // `router.navigate([], { queryParamsHandling: 'merge', replaceUrl: true })`
        // (ver base-crud.syncStateToUrl): eso disparaba un NavigationStart→End que
        // encendía la barra global un instante con CADA selección (flash). Comparar
        // el path (sin query) evita ese parpadeo.
        if (this.pathOf(event.url) !== this.pathOf(this.router.url)) {
          this.navigating.set(true);
        }
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.navigating.set(false);
      }
    });
  }

  /** Path de una URL sin query-string ni fragment (para distinguir un cambio de
   *  ruta real de una sincronización de filtros a query-params). */
  private pathOf(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'sidebar-open-no-scroll');
    this.routerSub?.unsubscribe();
    this.inbox.stop();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.screenWidth.set(window.innerWidth);
    if (!this.isMobile()) {
      this.mobileOpen.set(false);
    }
  }

  isMobile(): boolean {
    return this.screenWidth() < 769;
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.mobileOpen.set(!this.mobileOpen());
    } else {
      this.collapsed.set(!this.collapsed());
    }
  }

  onNavClick(): void {
    if (this.isMobile()) {
      this.mobileOpen.set(false);
    }
  }

  // ── Touch swipe to close sidebar ──
  onTouchStart(e: TouchEvent): void {
    if (!this.isMobile() || !this.mobileOpen()) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchCurrentX = this.touchStartX;
    this.isSwiping = true;
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isSwiping) return;
    this.touchCurrentX = e.touches[0].clientX;
  }

  onTouchEnd(): void {
    if (!this.isSwiping) return;
    const deltaX = this.touchStartX - this.touchCurrentX;
    if (deltaX > this.SWIPE_THRESHOLD) {
      this.mobileOpen.set(false);
    }
    this.isSwiping = false;
  }
}
