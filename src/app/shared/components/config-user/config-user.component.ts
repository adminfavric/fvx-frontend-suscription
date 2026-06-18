import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { FvxThemeId, ThemeService } from '../../../core/services/theme.service';
import { PageContentWidthService } from '../../../core/services/page-content-width.service';
import { persistLang, type FvxUiLang } from '../../../core/i18n/locale-storage';
import { UserUiPreferencesService } from '../../../core/services/user-ui-preferences.service';
import { SectionCardComponent } from '../section-card/section-card.component';
import {
  SegmentedToggleComponent,
  type SegmentedToggleItem,
} from '../segmented-toggle/segmented-toggle.component';

const THEME_SEGMENT_TOOLTIP_KEYS: Record<FvxThemeId, string> = {
  'tmp-default': 'layout.theme.tmpDefault',
  'tmp-light': 'layout.theme.tmpLight',
  'tmp-dark': 'layout.theme.tmpDark',
  'tmp-blackandwhite': 'layout.theme.tmpBlackandwhite',
  'tmp-beige': 'layout.theme.tmpBeige',
};

/**
 * Preferencias de shell (tema, ancho de página, idioma) en un bloque **colapsable**
 * (``app-section-card``) para el pie del sidebar. Estado del panel y los tres
 * selectores se persisten vía ``UserUiPreferencesService`` (API si hay sesión).
 * Usar desde ``layout`` como ``<app-config-user [narrow]="…" />``.
 */
@Component({
  selector: 'app-config-user',
  standalone: true,
  imports: [TranslocoPipe, SectionCardComponent, SegmentedToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section-card
      class="cfg-shell"
      [flat]="true"
      [noPadding]="true"
      [collapsible]="true"
      [expanded]="uiPrefs.appearanceSectionExpanded()"
      (expandedChange)="uiPrefs.setAppearanceExpanded($event)"
      [title]="narrow ? '' : ('layout.configuration' | transloco)"
      [icon]="narrow ? 'tune' : undefined"
      [expandLabel]="'layout.configurationSectionExpand' | transloco"
      [collapseLabel]="'layout.configurationSectionCollapse' | transloco">
      <div class="cfg-body" [class.cfg-body--narrow]="narrow">
        @if (!narrow) {
          <span class="cfg-label">{{ 'layout.appearance' | transloco }}</span>
        }
        <app-segmented-toggle
          appearance="sidebar"
          [vertical]="narrow"
          [items]="themeSegmentItems()"
          [value]="theme.currentId()"
          (valueChange)="selectTheme($event)"
          [ariaLabel]="'layout.themeAria' | transloco"
        />
        @if (!narrow) {
          <span class="cfg-label">{{ 'layout.contentWidth' | transloco }}</span>
        }
        <app-segmented-toggle
          appearance="sidebar"
          [vertical]="narrow"
          [items]="contentWidthSegmentItems()"
          [value]="pageWidth.currentMode()"
          (valueChange)="onContentWidthChange($event)"
          [ariaLabel]="'layout.contentWidthAria' | transloco"
        />
        @if (!narrow) {
          <span class="cfg-label">{{ 'layout.lang.label' | transloco }}</span>
        }
        <app-segmented-toggle
          appearance="sidebar"
          [vertical]="narrow"
          [items]="langSegmentItems()"
          [value]="transloco.getActiveLang()"
          (valueChange)="onUiLangChange($event)"
          [ariaLabel]="'layout.lang.aria' | transloco"
        />
      </div>
    </app-section-card>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    :host ::ng-deep .cfg-shell .section-card {
      background: transparent;
      border: none;
      box-shadow: none;
      border-radius: 0;
    }

    :host ::ng-deep .cfg-shell .section-card__header {
      padding: 4px 4px 8px;
      min-height: 32px;
      border-bottom-color: var(--fvx-sidebar-footer-border);
    }

    :host ::ng-deep app-section-card.cfg-shell .section-card--collapsed .section-card__header {
      border-bottom: none;
    }

    :host ::ng-deep .cfg-shell .section-card__title {
      margin: 0;
      font-size: var(--fvx-text-2xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--fvx-nav-group-title);
    }

    :host ::ng-deep .cfg-shell .section-card__icon {
      color: var(--fvx-nav-item-text);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    :host ::ng-deep .cfg-shell .section-card__toggle .mat-icon {
      color: var(--fvx-nav-item-text);
    }

    :host ::ng-deep .cfg-shell .section-card__body {
      padding: 8px 2px 4px;
    }

    .cfg-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .cfg-label {
      display: block;
      width: 100%;
      box-sizing: border-box;
      font-size: var(--fvx-text-2xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--fvx-nav-group-title);
      padding: 0 2px;
      opacity: 0.7;
    }
  `],
})
export class ConfigUserComponent {
  /** Sidebar en modo raíl (colapsada en escritorio). */
  @Input() narrow = false;

  readonly theme = inject(ThemeService);
  readonly pageWidth = inject(PageContentWidthService);
  readonly transloco = inject(TranslocoService);
  readonly uiPrefs = inject(UserUiPreferencesService);

  langSegmentItems(): SegmentedToggleItem[] {
    return [
      {
        value: 'en',
        label: 'EN',
        tooltip: this.transloco.translate('layout.lang.enTip'),
        ariaLabel: this.transloco.translate('layout.lang.enTip'),
      },
      {
        value: 'es',
        label: 'ES',
        tooltip: this.transloco.translate('layout.lang.esTip'),
        ariaLabel: this.transloco.translate('layout.lang.esTip'),
      },
    ];
  }

  themeSegmentItems(): SegmentedToggleItem[] {
    return this.theme.options.map((tid) => {
      const tip = this.transloco.translate(THEME_SEGMENT_TOOLTIP_KEYS[tid]);
      return {
        value: tid,
        icon: this.themeIcon(tid),
        tooltip: tip,
        ariaLabel: tip,
      };
    });
  }

  contentWidthSegmentItems(): SegmentedToggleItem[] {
    return [
      {
        value: 'compact',
        icon: 'view_compact',
        tooltip: this.transloco.translate('layout.contentWidthCompactTip'),
        ariaLabel: this.transloco.translate('layout.contentWidthCompactTip'),
      },
      {
        value: 'extended',
        icon: 'open_in_full',
        tooltip: this.transloco.translate('layout.contentWidthExtendedTip'),
        ariaLabel: this.transloco.translate('layout.contentWidthExtendedTip'),
      },
    ];
  }

  onContentWidthChange(value: string): void {
    if (this.pageWidth.isValidMode(value)) {
      this.pageWidth.setMode(value);
      this.uiPrefs.requestSave();
    }
  }

  selectTheme(id: string): void {
    if (this.theme.isValidThemeKey(id)) {
      this.theme.setTheme(id);
      this.uiPrefs.requestSave();
    }
  }

  onUiLangChange(value: string): void {
    if (value === 'en' || value === 'es') {
      const lang = value as FvxUiLang;
      this.transloco.setActiveLang(lang);
      persistLang(lang);
      this.uiPrefs.requestSave();
    }
  }

  private themeIcon(id: FvxThemeId): string {
    switch (id) {
      case 'tmp-default':
        return 'contrast';
      case 'tmp-light':
        return 'light_mode';
      case 'tmp-dark':
        return 'dark_mode';
      case 'tmp-blackandwhite':
        return 'filter_b_and_w';
      case 'tmp-beige':
        return 'account_balance';
    }
  }
}
