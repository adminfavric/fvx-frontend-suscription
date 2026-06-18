import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DateAdapter } from '@angular/material/core';

import { APP_CONFIG } from '../../core/config/app-config.token';
import { AuthService } from '../../core/services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

// Shared components (showcased)
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../shared/components/section-card/section-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AlertMessageComponent } from '../../shared/components/alert-message/alert-message.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { InfoHelpComponent } from '../../shared/components/info-help/info-help.component';
import { CopyButtonComponent } from '../../shared/components/copy-button/copy-button.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { DateRangePickerComponent, DateRangeValue } from '../../shared/components/date-range-picker/date-range-picker.component';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
import { JsonViewerComponent } from '../../shared/components/json-viewer/json-viewer.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { SmartSelectComponent } from '../../shared/components/smart-select/smart-select.component';
import { FileUploaderComponent } from '../../shared/components/file-uploader/file-uploader.component';
import { FileUploadResult } from '../../shared/components/file-uploader/providers/file-upload-provider';
import { TabsComponent, TabItem } from '../../shared/components/tabs/tabs.component';
import { TabContentDirective } from '../../shared/components/tabs/tab-content.directive';
import { WorkflowComponent, WorkflowStep, WorkflowEvent } from '../../shared/components/workflow/workflow.component';
import { WorkflowStepDirective } from '../../shared/components/workflow/workflow-step.directive';
import { CalendarComponent } from '../../shared/components/calendar/calendar.component';
import { CalculatorComponent, CalculatorChange } from '../../shared/components/calculator/calculator.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import type { StatCardConfig } from '../../shared/components/stat-card/stat-card.model';
import { CompositionCardComponent } from '../../shared/components/composition-card/composition-card.component';
import type { CompositionCardRow } from '../../shared/components/composition-card/composition-card.model';
import { NumericLabelComponent } from '../../shared/components/numeric-label/numeric-label.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import type { AppChartStyleOptions } from '../../shared/components/chart/chart.model';
import { PlaceMapComponent } from '../../shared/components/place-map/place-map.component';
import { type MapOptions, type MapMarker, type MapCoord } from '../../shared/components/map/map.component';
import type { MapboxPlace } from '../../core/services/mapbox.service';

// Dialogs
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ContentDialogComponent } from '../../shared/components/content-dialog/content-dialog.component';
import { FileViewerDialogComponent } from '../../shared/components/file-viewer-dialog/file-viewer-dialog.component';
import { PreviewExportService } from '../../shared/components/preview-export/preview-export.service';
import { TmpResumenComponent } from './tmp-resumen.component';

// Services
import { NotificationService } from '../../core/services/notification.service';
import { EntityDrawerService } from '../../core/services/entity-drawer.service';

// Showcase helpers
import { SampleEmbeddedComponent } from './sample-embedded.component';

interface Section {
  id: string;
  label: string;
}

/**
 * Página `/components`: recorrido visual por componentes reutilizables de
 * `shared/components/`, el **patrón de botones Material** de la plantilla, demos
 * vivas y snippets copiables.
 */
@Component({
  selector: 'app-components-showcase',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    PageHeaderComponent,
    SectionCardComponent,
    EmptyStateComponent,
    AlertMessageComponent,
    StatusChipComponent,
    InfoHelpComponent,
    CopyButtonComponent,
    LoadingOverlayComponent,
    SearchInputComponent,
    TagInputComponent,
    DateRangePickerComponent,
    DatePickerComponent,
    JsonViewerComponent,
    AvatarComponent,
    SmartSelectComponent,
    FileUploaderComponent,
    TabsComponent,
    TabContentDirective,
    WorkflowComponent,
    WorkflowStepDirective,
    CalendarComponent,
    CalculatorComponent,
    StatCardComponent,
    CompositionCardComponent,
    NumericLabelComponent,
    ChartComponent,
    PlaceMapComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Component showcase"
        subtitle="Ejemplos interactivos y código listo para copiar"
        [breadcrumbs]="[
          { label: 'Home', link: '/' },
          { label: 'Components' }
        ]"
      >
        <ng-container actions>
          <button mat-button type="button" (click)="scrollToTop()">
            <mat-icon>vertical_align_top</mat-icon>
            Top
          </button>
        </ng-container>
      </app-page-header>

      <div class="showcase-layout">
        <!-- Sidebar índice fijo (no scrollea con la página). -->
        <aside class="showcase-sidebar">
          <nav class="showcase-toc">
            @for (s of sections; track s.id) {
              <button type="button"
                      class="showcase-toc__item"
                      [class.is-active]="activeSection() === s.id"
                      (click)="scrollToSection(s.id)">
                {{ s.label }}
              </button>
            }
          </nav>
        </aside>

        <!-- Único contenedor con scroll. El sidebar de la izquierda queda fijo. -->
        <div #showcaseScroll class="showcase-content">

      <!-- ─────────── Botones Material (patrón plantilla) ─────────── -->

      <!-- ─────────── 4. app-alert-message ─────────── -->
      <section id="alert-message" class="showcase-section">
        <app-section-card
          title="app-alert-message"
          subtitle="Bloques de feedback por severidad (info, éxito, advertencia, error); tokens alineados con status-chip."
          icon="notifications_active"
        >
          <div class="demo">
            <div class="demo-preview demo-preview--stack">
              <app-alert-message
                type="info"
                message="Los cambios se guardan automáticamente cada pocos minutos."
                role="status"
              />
              <app-alert-message
                type="success"
                title="Listo"
                message="El informe se generó correctamente."
                role="status"
              />
              <app-alert-message
                type="warning"
                message="Tu cuenta se ha registrado correctamente y está pendiente de validación por un administrador. Por favor espera; te notificaremos cuando puedas acceder."
                role="status"
              />
              <app-alert-message
                type="error"
                message="Tu cuenta está inactiva. No puedes iniciar sesión hasta que un administrador la active."
              />
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.alertMessage }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 11. app-avatar ─────────── -->
      <section id="avatar" class="showcase-section">
        <app-section-card
          title="app-avatar"
          subtitle="Iniciales con color derivado o imagen."
          icon="account_circle"
        >
          <div class="demo">
            <div class="demo-preview demo-preview--inline" style="gap:12px">
              <app-avatar name="Ada Lovelace" [size]="48" />
              <app-avatar name="Grace Hopper" [size]="48" />
              <app-avatar name="Linus Torvalds" [size]="48" />
              <app-avatar
                name="With image"
                imageUrl="https://i.pravatar.cc/96?img=12"
                [size]="48"
              />
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.avatar }" />
          </div>
        </app-section-card>
      </section>
      <section id="material-buttons" class="showcase-section">
        <app-section-card
          title="Botones Material (patrón plantilla)"
          subtitle="Patrón definido en _material-overrides.scss + tokens --fvx-* (tema oscuro: primario agua, peligro rojo, advertencia ámbar con .fvx-btn-caution). Guía: docs/design-fvx.md (botones)."
          icon="smart_button"
        >
          <div class="demo">
            <div class="demo-preview">
              <div class="btn-showcase-grid">
                <span class="btn-showcase-label">Activos</span>
                <div class="btn-showcase-btns">
                  <button mat-button type="button">Cancelar</button>
                  <button mat-stroked-button type="button">Secundario</button>
                  <button mat-flat-button color="primary" type="button">
                    <mat-icon>save</mat-icon>
                    Guardar
                  </button>
                  <button mat-flat-button color="warn" type="button">
                    <mat-icon>delete</mat-icon>
                    Eliminar
                  </button>
                  <button mat-icon-button type="button" matTooltip="Más opciones">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <button mat-mini-fab color="primary" type="button" matTooltip="Añadir">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <span class="btn-showcase-label">Deshabilitados</span>
                <div class="btn-showcase-btns">
                  <button mat-button type="button" disabled>Cancelar</button>
                  <button mat-stroked-button type="button" disabled>Secundario</button>
                  <button mat-flat-button color="primary" type="button" disabled>
                    <mat-icon>save</mat-icon>
                    Guardar
                  </button>
                  <button mat-flat-button color="warn" type="button" disabled>Eliminar</button>
                </div>
                <span class="btn-showcase-label">Borde acento</span>
                <div class="btn-showcase-btns">
                  <button mat-stroked-button color="primary" type="button">
                    <mat-icon>vertical_align_top</mat-icon>
                    Ej. Top (si quieres más peso)
                  </button>
                  <button mat-stroked-button color="primary" type="button" disabled>
                    Deshabilitado
                  </button>
                </div>
                <span class="btn-showcase-label">Limpiar</span>
                <div class="btn-showcase-btns">
                  <button mat-button type="button">
                    <mat-icon>clear_all</mat-icon>
                    Limpiar filtros
                  </button>
                  <button mat-button type="button" disabled>
                    <mat-icon>clear_all</mat-icon>
                    Limpiar (off)
                  </button>
                </div>
                <span class="btn-showcase-label">Advertencia</span>
                <div class="btn-showcase-btns">
                  <button mat-flat-button type="button" class="fvx-btn-caution">
                    <mat-icon>warning</mat-icon>
                    Revisar antes de publicar
                  </button>
                  <button mat-flat-button type="button" class="fvx-btn-caution" disabled>
                    Advertencia (off)
                  </button>
                </div>
              </div>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.materialButtons }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 22. app-calculator ─────────── -->
      <section id="calculator" class="showcase-section">
        <app-section-card
          title="app-calculator"
          subtitle="Calculadora standalone. Soporta entrada por teclado (focus + teclas)."
          icon="calculate"
        >
          <div class="demo">
            <div class="demo-preview" style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start">
              <app-calculator
                [initial]="0"
                (valueChange)="onCalcChange($event)"
                (result)="onCalcResult($event)"
              />
              <div>
                <p class="demo-hint" style="margin-top:0">Último valor</p>
                <strong class="mono">{{ calcDisplay() || '—' }}</strong>
                <p class="demo-hint" style="margin:12px 0 0">Último resultado (=)</p>
                <strong class="mono">{{ calcResult() !== null ? calcResult() : '—' }}</strong>
              </div>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.calculator }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 21. app-calendar ─────────── -->
      <section id="calendar" class="showcase-section">
        <app-section-card
          title="app-calendar"
          subtitle="Calendario expandido (no flotante) con atajos Today/Clear. ControlValueAccessor."
          icon="calendar_month"
        >
          <div class="demo">
            <div class="demo-preview" style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start">
              <app-calendar
                title="Pick a date"
                [(ngModel)]="pickedDate"
                (selectedChange)="onCalendarPick($event)"
              />
              <app-calendar
                title="Con hora ([withTime])"
                [(ngModel)]="pickedDateTime"
                [withTime]="true"
              />
              <div>
                <p class="demo-hint" style="margin-top:0">
                  Fecha seleccionada:
                </p>
                <strong>{{ fmtDate(pickedDate, 'PPP') }}</strong>
                <p class="demo-hint" style="margin-top:12px">
                  Fecha + hora:
                </p>
                <strong>{{ fmtDate(pickedDateTime, 'PPp') }}</strong>
              </div>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.calendar }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 6b. Patrón Campos de texto ─────────── -->
      <section id="text-fields" class="showcase-section">
        <app-section-card
          title="Patrón de campos de texto"
          subtitle="Convención FVX para inputs de formularios — &lt;label class='field-label'&gt; arriba + &lt;mat-form-field appearance='outline'&gt; sin &lt;mat-label&gt; interno (label estático, sin floating). Aplica a TODOS los componentes derivados (date-picker, smart-select, search-input, etc.)."
          icon="text_fields"
        >
          <div class="demo">
            <div class="demo-preview" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px 16px;">
              <!-- Básico -->
              <div class="field-wrapper">
                <label class="field-label" for="tf-basic">Nombre</label>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <input id="tf-basic" matInput placeholder="Tu nombre" [(ngModel)]="textFieldsDemo.name">
                </mat-form-field>
              </div>

              <!-- Requerido -->
              <div class="field-wrapper">
                <label class="field-label" for="tf-required">Email<span class="required">*</span></label>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <input id="tf-required" matInput type="email" placeholder="tu@empresa.cl" [(ngModel)]="textFieldsDemo.email" required>
                </mat-form-field>
              </div>

              <!-- Con prefijo (icono) -->
              <div class="field-wrapper">
                <label class="field-label" for="tf-prefix">Teléfono</label>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-icon matPrefix>call</mat-icon>
                  <input id="tf-prefix" matInput placeholder="+56 9 …" [(ngModel)]="textFieldsDemo.phone">
                </mat-form-field>
              </div>

              <!-- Con sufijo (botón) -->
              <div class="field-wrapper">
                <label class="field-label" for="tf-suffix">Contraseña</label>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <input id="tf-suffix" matInput [type]="textFieldsDemo.hidePwd ? 'password' : 'text'" [(ngModel)]="textFieldsDemo.password">
                  <button mat-icon-button matSuffix type="button"
                          [attr.aria-label]="textFieldsDemo.hidePwd ? 'Mostrar' : 'Ocultar'"
                          (click)="textFieldsDemo.hidePwd = !textFieldsDemo.hidePwd">
                    <mat-icon>{{ textFieldsDemo.hidePwd ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </mat-form-field>
              </div>

              <!-- Disabled -->
              <div class="field-wrapper">
                <label class="field-label" for="tf-disabled">Usuario (lectura)</label>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <input id="tf-disabled" matInput value="jmarquez" disabled>
                </mat-form-field>
              </div>

              <!-- Textarea -->
              <div class="field-wrapper" style="grid-column: 1 / -1;">
                <label class="field-label" for="tf-textarea">Notas</label>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <textarea id="tf-textarea" matInput rows="3" placeholder="Notas internas…" [(ngModel)]="textFieldsDemo.notes"></textarea>
                </mat-form-field>
              </div>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.textFields }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 23b. app-chart (ECharts) ─────────── -->
      <section id="chart" class="showcase-section">
        <app-section-card
          title="app-chart"
          subtitle="Línea, área, pie, donut, barras, variante compacta (sin leyenda/rejilla), loading y modo raw. Tema --fvx-* vía ThemeService; bloque extra con styleOptions (pastel / donut / barras)."
          icon="bar_chart"
        >
          <div class="demo">
            <div class="demo-preview">
              <p class="demo-hint" style="margin:0 0 8px">Línea (dos series)</p>
              <app-chart
                chartType="line"
                title="Ventas vs costos"
                [height]="300"
                [labels]="chartLabels"
                [series]="chartSeries"
              />

              <p class="demo-hint" style="margin:20px 0 8px">Área (una serie)</p>
              <app-chart
                chartType="area"
                title="Tickets completados"
                [height]="260"
                [labels]="chartLabels"
                [series]="chartAreaSeries"
              />

              <p class="demo-hint" style="margin:20px 0 8px">Pastel, donut y barras</p>
              <div class="chart-row chart-row--3">
                <app-chart
                  chartType="pie"
                  title="Mix canal (pie)"
                  [height]="280"
                  [pieSlices]="chartPieSlicesFull"
                />
                <app-chart
                  chartType="donut"
                  title="Tráfico (donut)"
                  [height]="280"
                  [pieSlices]="chartPieSlices"
                />
                <app-chart
                  chartType="bar"
                  title="Por trimestre"
                  [height]="280"
                  [labels]="chartBarLabels"
                  [series]="chartBarSeries"
                />
              </div>

              <p class="demo-hint" style="margin:20px 0 8px">
                Mismo layout con <code>[styleOptions]</code> (paleta + contenedor + tipografía por instancia)
              </p>
              <div class="chart-row chart-row--3">
                <app-chart
                  chartType="pie"
                  title="Costos por rubro"
                  [height]="280"
                  [pieSlices]="chartCustomPieSlices"
                  [styleOptions]="chartStylePieWarm"
                />
                <app-chart
                  chartType="donut"
                  title="Tickets por estado"
                  [height]="280"
                  [pieSlices]="chartCustomDonutSlices"
                  [styleOptions]="chartStyleDonutCool"
                />
                <app-chart
                  chartType="bar"
                  title="NPS semestral"
                  [height]="280"
                  [labels]="chartCustomBarLabels"
                  [series]="chartCustomBarSeries"
                  [styleOptions]="chartStyleBarCorp"
                />
              </div>

              <p class="demo-hint" style="margin:20px 0 8px">Compacto: sin leyenda ni rejilla</p>
              <app-chart
                chartType="bar"
                title="Solo barras"
                [height]="200"
                [legend]="false"
                [grid]="false"
                [labels]="chartWeekLabels"
                [series]="chartWeekSeries"
              />

              <p class="demo-hint" style="margin:20px 0 8px">Loading (spinner ECharts)</p>
              <div class="chart-toolbar">
                <button mat-stroked-button type="button" (click)="toggleChartLoading()">
                  {{ chartLoading() ? 'Quitar carga' : 'Simular carga' }}
                </button>
              </div>
              <app-chart
                chartType="line"
                title="Métrica en carga"
                [height]="240"
                [loading]="chartLoading()"
                [labels]="chartSparkLabels"
                [series]="chartSparkSeries"
              />

              <p class="demo-hint" style="margin:20px 0 8px">Modo raw (<code>extraOption</code> completa)</p>
              <app-chart mode="raw" [height]="260" [extraOption]="chartRawDemoOption" />
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.chart }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 23a2. app-composition-card ─────────── -->
      <section id="composition-card" class="showcase-section">
        <app-section-card
          title="app-composition-card"
          subtitle="Lista con barras de proporción (label | barra | valor + %). tone al estilo stat-card; maxWidth / maxHeight con scroll en el cuerpo."
          icon="stacked_bar_chart"
        >
          <div class="demo">
            <div class="demo-preview composition-demo">
              <app-composition-card
                title="Composición de activos"
                subtitle="Bs 26.315.000 al 23 abr"
                tone="success"
                maxWidth="560px"
                [rows]="demoCompositionRows"
              />
              <p class="demo-hint" style="margin-top:20px">
                <code>maxHeight</code> + muchas filas → scroll solo en la lista
              </p>
              <app-composition-card
                title="Distribución extendida (demo scroll)"
                subtitle="Scroll interno cuando hay muchas filas"
                tone="info"
                maxWidth="520px"
                maxHeight="220px"
                [rows]="demoCompositionRowsMany"
              />
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.compositionCard }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 13. Confirm dialog ─────────── -->
      <section id="confirm-dialog" class="showcase-section">
        <app-section-card
          title="ConfirmDialogComponent"
          subtitle="Diálogo sí / no (MatDialog)."
          icon="help_outline"
        >
          <div class="demo">
            <div class="demo-preview">
              <button mat-flat-button color="warn" (click)="openConfirm()">
                <mat-icon>delete</mat-icon>
                Trigger confirm
              </button>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.confirmDialog }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 14. Content dialog ─────────── -->
      <section id="content-dialog" class="showcase-section">
        <app-section-card
          title="ContentDialogComponent"
          subtitle="Popup genérico que embebe cualquier componente con botonera configurable."
          icon="open_in_new"
        >
          <div class="demo">
            <div class="demo-preview">
              <button mat-flat-button color="primary" (click)="openContent()" style="margin-right:8px">
                Basic (flat Save)
              </button>
              <button mat-stroked-button (click)="openContent2()">
                Multiple actions + confirm-in-place
              </button>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.contentDialog }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 5. app-copy-button ─────────── -->
      <section id="copy-button" class="showcase-section">
        <app-section-card
          title="app-copy-button"
          subtitle="Icono que copia al portapapeles con feedback visual."
          icon="content_copy"
        >
          <div class="demo">
            <div class="demo-preview demo-preview--inline">
              <span class="mono">550e8400-e29b-41d4-a716-446655440000</span>
              <app-copy-button
                value="550e8400-e29b-41d4-a716-446655440000"
                tooltip="Copy UUID"
                [notify]="true"
                notifyMessage="UUID copiado"
              />
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.copyButton }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 9a. app-date-picker ─────────── -->
      <section id="date-picker" class="showcase-section">
        <app-section-card
          title="app-date-picker"
          subtitle="Selector de fecha única para formularios (compatible con ngModel / Reactive Forms)."
          icon="event"
        >
          <div class="demo">
            <div class="demo-preview">
              <div class="dp-grid">
                <app-date-picker
                  label="Birthdate"
                  [(ngModel)]="singleDate"
                  placeholder="dd-mm-yyyy"
                  hint="Elige una fecha"
                  [clearable]="true"
                  (dateChange)="onSingleDateChange($event)"
                />
                <app-date-picker
                  label="Appointment (solo días hábiles, a partir de hoy)"
                  [(ngModel)]="weekdayDate"
                  [minDate]="today"
                  [dateFilter]="isWeekday"
                  [required]="true"
                />
                <app-date-picker
                  label="Denso (para filtros)"
                  [(ngModel)]="denseDate"
                  [dense]="true"
                  placeholder="From"
                />
                <app-date-picker
                  label="Con hora ([withTime])"
                  [(ngModel)]="dateTimeValue"
                  [withTime]="true"
                  placeholder="dd-mm-yyyy"
                  hint="Fecha + hora combinadas en un Date"
                />
                <app-date-picker
                  label="Hora cada 1h · 07:00–17:00"
                  [(ngModel)]="businessHourValue"
                  [withTime]="true"
                  [timeInterval]="'1h'"
                  [minTime]="time7"
                  [maxTime]="time17"
                  placeholder="dd-mm-yyyy"
                  hint="[timeInterval]='1h' + [minTime]/[maxTime]"
                />
              </div>
              <p class="demo-hint">
                Birthdate: <strong>{{ fmtDate(singleDate, 'PPP') }}</strong>
                &nbsp;·&nbsp; Appointment: <strong>{{ fmtDate(weekdayDate, 'PPP') }}</strong>
                &nbsp;·&nbsp; Con hora: <strong>{{ fmtDate(dateTimeValue, 'PPp') }}</strong>
                &nbsp;·&nbsp; Horario laboral: <strong>{{ fmtDate(businessHourValue, 'PPp') }}</strong>
              </p>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.datePicker }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 9. app-date-range-picker ─────────── -->
      <section id="date-range-picker" class="showcase-section">
        <app-section-card
          title="app-date-range-picker"
          subtitle="Rango con presets (Today, Last 7d, This month...)."
          icon="date_range"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-date-range-picker
                label="Report range"
                (rangeChange)="onRangeChange($event)"
              />
              <p class="demo-hint">Start: <strong>{{ fmtDate(range().start, 'PPP') }}</strong>
                &nbsp;·&nbsp; End: <strong>{{ fmtDate(range().end, 'PPP') }}</strong></p>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.dateRange }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 3. app-empty-state ─────────── -->
      <section id="empty-state" class="showcase-section">
        <app-section-card
          title="app-empty-state"
          subtitle="Placeholder consistente para listas y paneles vacíos."
          icon="inbox"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-empty-state
                icon="inbox"
                title="No items yet"
                description="Create the first item to get started."
              >
                <button mat-flat-button color="primary">
                  <mat-icon>add</mat-icon>
                  Create item
                </button>
              </app-empty-state>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.emptyState }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 16. Entity drawer (embed mode) ─────────── -->
      <section id="entity-drawer" class="showcase-section">
        <app-section-card
          title="EntityDrawerComponent (modo embed)"
          subtitle="Drawer lateral que puede mostrar usuario vía API o embeber un componente."
          icon="chrome_reader_mode"
        >
          <div class="demo">
            <div class="demo-preview">
              <button mat-flat-button color="primary" (click)="openDrawerEmbed()">
                <mat-icon>menu_open</mat-icon>
                Open drawer (embed)
              </button>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.entityDrawer }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 17. File uploader ─────────── -->
      <section id="file-uploader" class="showcase-section">
        <app-section-card
          title="app-file-uploader"
          subtitle="Drop-zone + providers (Firebase / Signed URL / Django). En /components está wired a DjangoUploadProvider — sube al bucket configurado en backend (STORAGE_BACKEND)."
          icon="cloud_upload"
        >
          <div class="demo">
            <div class="demo-preview">
              <p class="demo-hint" style="margin:0 0 8px"><strong>variant="default"</strong> — drop-zone completo.</p>
              <app-file-uploader
                accept="image/*,application/pdf"
                [multiple]="true"
                [maxFileSizeMb]="5"
                pathPrefix="uploads/showcase"
                (uploaded)="onUploaded($event)"
              />

              <p class="demo-hint" style="margin:20px 0 8px"><strong>variant="mini"</strong> — compacto para formularios.</p>
              <app-file-uploader
                variant="mini"
                buttonLabel="Attach PDF"
                hint="Only PDF · max 5 MB"
                accept="application/pdf"
                [multiple]="false"
                [maxFileSizeMb]="5"
                pathPrefix="uploads/showcase-mini"
              />

              @if (uploadedFiles().length) {
                <p class="demo-hint">
                  URLs subidas ({{ uploadedFiles().length }}):
                </p>
                <ul class="uploaded-list">
                  @for (f of uploadedFiles(); track f.url) {
                    <li>
                      <a [href]="f.url" target="_blank" rel="noopener">{{ f.name }}</a>
                      <app-copy-button [value]="f.url" tooltip="Copy URL" />
                    </li>
                  }
                </ul>
              }
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.fileUploader }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 15. File viewer dialog ─────────── -->
      <section id="file-viewer-dialog" class="showcase-section">
        <app-section-card
          title="FileViewerDialogComponent"
          subtitle="Popup para ver PDF, imágenes, vídeo, audio, JSON, texto y Office."
          icon="visibility"
        >
          <div class="demo">
            <div class="demo-preview demo-preview--inline" style="gap:8px; flex-wrap:wrap">
              <button mat-stroked-button (click)="openViewerImage()">
                <mat-icon>image</mat-icon> Image
              </button>
              <button mat-stroked-button (click)="openViewerPdf()">
                <mat-icon>picture_as_pdf</mat-icon> PDF
              </button>
              <button mat-stroked-button (click)="openViewerJson()">
                <mat-icon>data_object</mat-icon> JSON (inline)
              </button>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.fileViewer }" />
          </div>
        </app-section-card>
      </section>

      <section id="info-help" class="showcase-section">
        <app-section-card
          title="app-info-help"
          subtitle="Icono ? con popover tipo asistente: efecto «IA escribiendo» (pensando → typing → ejemplo → feedback). El contenido vive en i18n (help.&lt;topic&gt;.*)."
          icon="help_outline"
        >
          <div class="demo">
            <div class="demo-preview" style="display:flex; gap:24px; align-items:center; flex-wrap:wrap">
              <span style="display:inline-flex; align-items:center">
                Rol del usuario
                <app-info-help topic="role" />
              </span>
              <span style="display:inline-flex; align-items:center">
                Acceso staff
                <app-info-help topic="staff" />
              </span>
              <span style="display:inline-flex; align-items:center">
                Sin efecto (instant)
                <app-info-help topic="role" [instant]="true" />
              </span>
            </div>
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 10. app-json-viewer ─────────── -->
      <section id="json-viewer" class="showcase-section">
        <app-section-card
          title="app-json-viewer"
          subtitle="Inspector de JSON con syntax highlight y botón copy."
          icon="data_object"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-json-viewer [data]="samplePayload" />
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.jsonViewer }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 6. app-loading-overlay ─────────── -->
      <section id="loading-overlay" class="showcase-section">
        <app-section-card
          title="app-loading-overlay"
          subtitle="Overlay con spinner sobre contenedores relative."
          icon="hourglass_empty"
        >
          <div class="demo">
            <div class="demo-preview">
              <div class="overlay-target">
                <app-loading-overlay [show]="overlayOn()" message="Loading data..." />
                <p>Contenido debajo del overlay.</p>
                <p>(haz click para togglear)</p>
              </div>
              <button mat-stroked-button (click)="toggleOverlay()" style="margin-top:8px">
                {{ overlayOn() ? 'Hide' : 'Show' }} overlay
              </button>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.loadingOverlay }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 17c. Mail tester (Mailpit) ─────────── -->
      <section id="mail-tester" class="showcase-section">
        <app-section-card
          title="Mail tester (Mailpit)"
          subtitle="Envío de prueba al endpoint POST /api/v1/mail-test/ que usa el template _example del módulo notifications. En local los emails los captura Mailpit (web UI en localhost:8025). Endpoint dev-only: 404 en producción."
          icon="outgoing_mail"
        >
          <div class="demo">
            <div class="demo-preview mail-tester">
              <div class="mail-tester__form">
                <div class="field-wrapper">
                  <label class="field-label" for="mt-to">Destinatario</label>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <input id="mt-to" matInput type="email" placeholder="tu@email.test"
                           [(ngModel)]="mailTester.to" required>
                    <mat-icon matSuffix>mail</mat-icon>
                  </mat-form-field>
                </div>
                <div class="field-wrapper">
                  <label class="field-label" for="mt-name">Nombre</label>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <input id="mt-name" matInput placeholder="Tester"
                           [(ngModel)]="mailTester.userName">
                  </mat-form-field>
                </div>
                <div class="field-wrapper">
                  <label class="field-label" for="mt-url">Action URL</label>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <input id="mt-url" matInput type="url"
                           placeholder="http://localhost:4200/"
                           [(ngModel)]="mailTester.actionUrl">
                  </mat-form-field>
                </div>
              </div>

              <div class="mail-tester__actions">
                <button mat-flat-button color="primary" type="button"
                        [disabled]="mailTester.sending || !mailTester.to"
                        (click)="sendTestMail()">
                  <mat-icon>send</mat-icon>
                  {{ mailTester.sending ? 'Enviando…' : 'Enviar' }}
                </button>
                <a mat-stroked-button href="http://localhost:8025/" target="_blank" rel="noopener">
                  <mat-icon>open_in_new</mat-icon>
                  Abrir Mailpit
                </a>
              </div>

              @if (mailTester.result) {
                <app-alert-message
                  [type]="mailTester.result.success ? 'success' : 'error'"
                  [title]="mailTester.result.success ? 'Email enviado' : 'No se pudo enviar'"
                  [message]="mailTester.result.message"
                />
                @if (mailTester.result.success && mailTester.result.detail; as d) {
                  <dl class="mail-tester__detail">
                    <dt>Status</dt><dd><code>{{ d.status }}</code></dd>
                    <dt>Subject</dt><dd>{{ d.subject }}</dd>
                    <dt>Provider</dt><dd><code>{{ d.provider }}</code></dd>
                    <dt>Message ID</dt><dd><code>{{ d.provider_message_id }}</code></dd>
                  </dl>
                }
              }
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.mailTester }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 32. app-place-search + app-map (Mapbox) ─────────── -->
      <section id="mapbox" class="showcase-section">
        <app-section-card
          title="Place search + Map (Mapbox)"
          subtitle="Buscador inteligente de direcciones (Geocoding API v6) y mapa interactivo (mapbox-gl JS). Configurar token en environment.ts."
          icon="map"
        >
          <div class="demo">
            <div class="demo-preview" style="display: grid; gap: 16px;">
              <!-- app-place-map [mode]='both': buscador + mapa integrados.
                   Los controles (geolocate/fullscreen/scale/zoom) son NATIVOS de
                   Mapbox, van sobre el mapa con ícono + tooltip y funcionan de
                   verdad (geolocate pide permiso, fullscreen abre, etc.). Se
                   activan vía [options].controls. -->
              <div style="height: 360px; width: 100%;">
                <app-place-map
                  [mode]="'both'"
                  searchPlaceholder="Busca una ubicación (Chile)"
                  [countries]="['cl']"
                  [types]="['address', 'street', 'place']"
                  [options]="mapOpts()"
                  [scrollZoomMode]="'click-to-activate'"
                  mapAriaLabel="Mapa demo"
                  (placeSelected)="onMapPlacePicked($event)"
                  (mapClick)="onMapClick($event)"
                  (markerClick)="onMarkerClick($event)"
                  (markerDragEnd)="onMarkerDragEnd($event)"
                />
              </div>

              @if (selectedPlace()) {
                <div class="demo-hint" style="margin: 0;">
                  <strong>Seleccionado:</strong> {{ selectedPlace()!.fullAddress }}<br>
                  <code>lng:{{ selectedPlace()!.coordinates.lng.toFixed(5) }}</code>
                  <code>lat:{{ selectedPlace()!.coordinates.lat.toFixed(5) }}</code>
                  @if (selectedPlace()!.postalCode) {
                    <code>CP:{{ selectedPlace()!.postalCode }}</code>
                  }
                </div>
              }

              <p class="demo-hint" style="margin: 0;">
                Controles nativos sobre el mapa: zoom, <strong>geolocate</strong> (pide permiso
                y sigue tu posición), <strong>fullscreen</strong> y <strong>escala</strong>. El zoom con
                rueda usa <code>scrollZoomMode='click-to-activate'</code> (patrón Google Maps): click
                en el mapa para activarlo, sale el mouse y se desactiva. Click también agrega un marker
                arrastrable; el buscador centra el mapa y pone un marker fijo (id <code>picked</code>).
              </p>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.mapbox }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 24. app-numeric-label ─────────── -->
      <section id="numeric-label" class="showcase-section">
        <app-section-card
          title="app-numeric-label"
          subtitle="Etiqueta numérica con miles, moneda, decimales, color por signo y notación compacta. Ideal para celdas y formularios."
          icon="123"
        >
          <div class="demo">
            <div class="demo-preview">
              <p class="demo-hint" style="margin:0 0 8px">Ejemplos básicos</p>
              <table class="num-table">
                <thead>
                  <tr>
                    <th>Caso</th>
                    <th style="text-align:right">Render</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Simple</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="1234567.89" [decimals]="2" />
                    </td>
                    <td><code>value=1234567.89 decimals=2</code></td>
                  </tr>
                  <tr>
                    <td>CLP (es-CL)</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="48500" currency="CLP" locale="es-CL" [decimals]="0" />
                    </td>
                    <td><code>currency="CLP" locale="es-CL"</code></td>
                  </tr>
                  <tr>
                    <td>USD (en-US)</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="1234.5" currency="USD" locale="en-US" />
                    </td>
                    <td><code>currency="USD"</code></td>
                  </tr>
                  <tr>
                    <td>EUR narrow</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="1999.99" currency="EUR" currencyDisplay="narrowSymbol" locale="de-DE" />
                    </td>
                    <td><code>currencyDisplay="narrowSymbol"</code></td>
                  </tr>
                  <tr>
                    <td>Prefijo/sufijo custom</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="42.7" prefix="$" suffix=" USD" [decimals]="2" />
                    </td>
                    <td><code>prefix="$" suffix=" USD"</code></td>
                  </tr>
                  <tr>
                    <td>Negativo rojo</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="-1250.5" currency="USD" colorMode="negative-red" />
                    </td>
                    <td><code>colorMode="negative-red"</code></td>
                  </tr>
                  <tr>
                    <td>Pos verde / Neg rojo</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="8.5" suffix="%" colorMode="pos-neg" [showSignIcon]="true" />
                    </td>
                    <td><code>colorMode="pos-neg" showSignIcon</code></td>
                  </tr>
                  <tr>
                    <td>Color custom</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="42" color="#b45309" weight="bold" />
                    </td>
                    <td><code>color="#b45309" weight="bold"</code></td>
                  </tr>
                  <tr>
                    <td>Compact (KPI)</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="1250000" notation="compact" locale="en-US" />
                    </td>
                    <td><code>notation="compact"</code> → 1.3M</td>
                  </tr>
                  <tr>
                    <td>Null</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="null" emptyText="—" />
                    </td>
                    <td><code>value=null</code></td>
                  </tr>
                  <tr>
                    <td>Mono (tabular)</td>
                    <td style="text-align:right">
                      <app-numeric-label [value]="9876543.21" [decimals]="2" [monospace]="true" />
                    </td>
                    <td><code>monospace=true</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.numericLabel }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 1. app-page-header ─────────── -->
      <section id="page-header" class="showcase-section">
        <app-section-card
          title="app-page-header"
          subtitle="Cabecera con título, subtítulo, breadcrumbs y slot [actions]."
          icon="title"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-page-header
                title="Upload center"
                subtitle="Manage documents"
                [breadcrumbs]="[{ label: 'Admin', link: '/' }, { label: 'Uploads' }]"
              >
                <ng-container actions>
                  <button mat-stroked-button>Export</button>
                  <button mat-flat-button color="primary">New</button>
                </ng-container>
              </app-page-header>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.pageHeader }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 17b. app-preview-export ─────────── -->
      <section id="preview-export" class="showcase-section">
        <app-section-card
          title="app-preview-export (servicio)"
          subtitle="Abre un componente arbitrario dentro de un dialog tipo hoja carta (80vh). Toolbar con imprimir, descargar PDF y descargar PNG. Útil para ver/exportar reportes pre-renderizados (resumen mensual, ficha de paciente, contrato, etc.)."
          icon="picture_as_pdf"
        >
          <div class="demo">
            <div class="demo-preview" style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button mat-flat-button color="primary" (click)="openResumenPreview()">
                <mat-icon>description</mat-icon>
                Ver "Resumen mensual"
              </button>
              <button mat-stroked-button (click)="openResumenPreviewLandscape()">
                <mat-icon>crop_landscape</mat-icon>
                Mismo, PDF horizontal
              </button>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.previewExport }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 7. app-search-input ─────────── -->
      <section id="search-input" class="showcase-section">
        <app-section-card
          title="app-search-input"
          subtitle="Input con icono, clear button y debounce."
          icon="search"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-search-input
                placeholder="Search invoices..."
                [debounceMs]="300"
                (searchChange)="onSearch($event)"
              />
              <p class="demo-hint">Último término debounceado: <strong>{{ lastSearch() || '—' }}</strong></p>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.searchInput }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 2. app-section-card ─────────── -->
      <section id="section-card" class="showcase-section">
        <app-section-card
          title="app-section-card"
          subtitle="Card con header, subtítulo, icon, slot [actions] y body. Soporta modo colapsable."
          icon="dashboard"
        >
          <div class="demo">
            <div class="demo-preview" style="display:flex; flex-direction:column; gap:12px">
              <app-section-card title="Profile" subtitle="Personal data" icon="person">
                <ng-container actions>
                  <button mat-icon-button matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                </ng-container>
                <p>Contenido libre del card.</p>
              </app-section-card>

              <app-section-card
                title="Advanced filters"
                subtitle="Click en el header o en el chevron para plegar"
                icon="tune"
                [collapsible]="true"
                [expanded]="false"
              >
                <p>Aquí irían filtros avanzados, logs, detalles opcionales, etc.</p>
              </app-section-card>

              <app-section-card
                title="Controlado con [(expanded)]"
                icon="code"
                [collapsible]="true"
                [(expanded)]="cardExpanded"
              >
                <ng-container actions>
                  <button mat-stroked-button (click)="cardExpanded = !cardExpanded; $event.stopPropagation()">
                    Toggle externo ({{ cardExpanded ? 'abierto' : 'cerrado' }})
                  </button>
                </ng-container>
                <p>El estado es sincronizado con <code>cardExpanded</code>.</p>
              </app-section-card>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.sectionCard }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 12. app-smart-select ─────────── -->
      <section id="smart-select" class="showcase-section">
        <app-section-card
          title="app-smart-select"
          subtitle="mat-select o autocomplete automático según cantidad de opciones."
          icon="arrow_drop_down_circle"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-smart-select
                placeholder="Pick an option"
                [options]="smartOptions"
                [formControl]="smartCtrl"
              />
              <p class="demo-hint">Valor: <code>{{ smartCtrl.value || '—' }}</code></p>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.smartSelect }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 23. app-stat-card ─────────── -->
      <section id="stat-card" class="showcase-section">
        <app-section-card
          title="app-stat-card"
          subtitle="KPI: tokens --fvx-stat-card-radius, density normal|compact, variantes split/split-solid (banda), solid, barra de progreso, StatCardConfig."
          icon="dashboard"
        >
          <div class="demo">
            <div class="demo-preview">
              <!-- Grid como en la inspiración, 4 columnas responsive -->
              <div class="stat-grid">
                <app-stat-card
                  icon="payments"
                  label="Current price (€)"
                  value="44.51"
                  tone="primary"
                  trend="up"
                  trendValue="+2.1%"
                  trendLabel="vs. last close"
                />
                <app-stat-card
                  icon="description"
                  label="Related articles"
                  value="132"
                  tone="info"
                  [clickable]="true"
                  (activate)="onStatClick('articles')"
                />
                <app-stat-card
                  icon="groups"
                  label="Key executives"
                  value="18"
                  tone="success"
                />
                <app-stat-card
                  icon="forum"
                  label="Conversations"
                  value="24"
                  tone="warning"
                  trend="down"
                  trendValue="-4"
                  trendLabel="this week"
                />
              </div>

              <p class="demo-hint" style="margin-top:18px">
                <code>density=&quot;compact&quot;</code> — fila horizontal compacta y poca altura (resumen junto a tabla / footer)
              </p>
              <div class="stat-grid stat-grid--compact">
                <app-stat-card
                  icon="payments"
                  label="Total (€)"
                  value="12.4k"
                  density="compact"
                  tone="primary"
                  trend="up"
                  trendValue="+3%"
                  trendLabel="mes"
                />
                <app-stat-card
                  icon="shopping_cart"
                  label="Pedidos"
                  value="86"
                  density="compact"
                  variant="split"
                  tone="info"
                  [clickable]="true"
                  (activate)="onStatClick('compact-orders')"
                />
                <app-stat-card
                  icon="speed"
                  label="Capacidad"
                  value="72"
                  suffix="%"
                  density="compact"
                  variant="solid"
                  tone="success"
                  [progress]="72"
                  iconPosition="end"
                />
                <app-stat-card icon="groups" label="Activos" value="42" density="compact" variant="minimal" tone="neutral" />
              </div>

              <p class="demo-hint" style="margin-top:18px">Split — banda lateral (tarjeta clara / sólida dos tonos)</p>
              <div class="stat-grid">
                <app-stat-card icon="edit" label="New posts" value="278" variant="split" tone="info" />
                <app-stat-card
                  icon="analytics"
                  label="Bounce rate"
                  value="64.89"
                  suffix="%"
                  variant="split"
                  tone="warning"
                  iconPosition="end"
                  [progress]="65"
                />
                <app-stat-card
                  icon="attach_money"
                  label="Revenue"
                  prefix="$"
                  value="18,420"
                  variant="split-solid"
                  tone="success"
                  trend="up"
                  trendValue="+12%"
                />
                <app-stat-card
                  icon="shopping_cart"
                  label="Orders"
                  value="1,204"
                  variant="split-solid"
                  tone="primary"
                  iconPosition="end"
                />
              </div>

              <p class="demo-hint" style="margin-top:18px">Solid + barra de progreso + icono (start / end)</p>
              <div class="stat-grid">
                <app-stat-card
                  icon="dns"
                  label="Capacity"
                  value="64"
                  suffix="%"
                  variant="solid"
                  tone="info"
                  [progress]="64"
                  iconPosition="end"
                  iconSurface="filled"
                />
                <app-stat-card
                  icon="bolt"
                  label="Power draw"
                  value="2.4"
                  suffix=" kW"
                  variant="solid"
                  tone="warning"
                  [progress]="42"
                  iconPosition="start"
                  iconSurface="soft"
                  trend="down"
                  trendValue="-6%"
                  trendLabel="vs target"
                />
              </div>

              <p class="demo-hint" style="margin-top:18px">Objeto <code>StatCardConfig</code> con <code>[card]</code> (los inputs sueltos pueden sobrescribir campos)</p>
              <div class="stat-grid">
                <app-stat-card [card]="demoStatCardConfig" />
                <app-stat-card [card]="demoStatCardConfig" icon="memory" label="Label overrides card" />
              </div>

              <p class="demo-hint" style="margin-top:18px">Variantes</p>
              <div class="stat-grid">
                <app-stat-card
                  icon="attach_money"
                  label="Revenue"
                  prefix="$"
                  value="18,420"
                  suffix=" USD"
                  description="Last 30 days"
                  variant="default"
                  tone="success"
                />
                <app-stat-card
                  icon="shopping_cart"
                  label="Orders"
                  value="1,204"
                  variant="filled"
                  tone="primary"
                  trend="up"
                  trendValue="+8.2%"
                />
                <app-stat-card
                  icon="warning"
                  label="Open tickets"
                  value="37"
                  variant="outline"
                  tone="danger"
                />
                <app-stat-card
                  icon="timer"
                  label="Avg response"
                  value="42"
                  suffix=" min"
                  variant="minimal"
                  tone="neutral"
                />
              </div>

              <p class="demo-hint" style="margin-top:18px">Loading state</p>
              <div class="stat-grid">
                <app-stat-card icon="insights" label="Loading metric" value="—" [loading]="true" />
                <app-stat-card icon="bar_chart" label="Loading metric" value="—" [loading]="true" tone="success" />
                <app-stat-card
                  icon="palette"
                  label="Spinner color"
                  value="—"
                  [loading]="true"
                  loadingSpinnerColor="#f59e0b"
                />
              </div>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.statCard }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 5. app-status-chip ─────────── -->
      <section id="status-chip" class="showcase-section">
        <app-section-card
          title="app-status-chip"
          subtitle="Chip tipado con variantes y mapa value → variant."
          icon="label"
        >
          <div class="demo">
            <div class="demo-preview demo-preview--chips">
              <app-status-chip variant="success" label="Active" icon="check_circle" />
              <app-status-chip variant="warn" label="Pending" icon="schedule" />
              <app-status-chip variant="danger" label="Rejected" icon="cancel" />
              <app-status-chip variant="info" label="Draft" />
              <app-status-chip variant="muted" label="Archived" />
              <app-status-chip variant="neutral" label="Other" />
              <app-status-chip [value]="'active'" [map]="chipMap" />
              <app-status-chip [value]="'pending'" [map]="chipMap" />
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.statusChip }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 18. app-tabs ─────────── -->
      <section id="tabs" class="showcase-section">
        <app-section-card
          title="app-tabs"
          subtitle="Tabs declarativas (label + icon + badge + disabled) con templates por clave."
          icon="tab"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-tabs
                [tabs]="demoTabs"
                [(activeKey)]="activeTabKey"
                [stretch]="false"
              >
                <ng-template appTabContent="overview">
                  <p>Contenido de <strong>Overview</strong>. Aquí iría un resumen.</p>
                </ng-template>
                <ng-template appTabContent="details">
                  <app-json-viewer [data]="samplePayload" />
                </ng-template>
                <ng-template appTabContent="notes">
                  <app-empty-state
                    icon="sticky_note_2"
                    title="No notes"
                    description="Puedes embeber cualquier componente aquí."
                    [compact]="true"
                  />
                </ng-template>
              </app-tabs>
              <p class="demo-hint">Active key: <code>{{ activeTabKey }}</code></p>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.tabs }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 8. app-tag-input ─────────── -->
      <section id="tag-input" class="showcase-section">
        <app-section-card
          title="app-tag-input"
          subtitle="Chips de tags (Enter, coma o espacio). ControlValueAccessor."
          icon="sell"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-tag-input
                [(ngModel)]="tags"
                placeholder="Add tag..."
                [maxItems]="8"
              />
              <p class="demo-hint">Valor: <code>{{ tags | json }}</code></p>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.tagInput }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 19. app-workflow (horizontal) ─────────── -->
      <section id="workflow-h" class="showcase-section">
        <app-section-card
          title="app-workflow (horizontal)"
          subtitle="Wizard linear con 3 pasos — demo: crear un pedido (datos del cliente → método de pago → confirmación)."
          icon="linear_scale"
        >
          <div class="demo">
            <div class="demo-preview">
              <p class="demo-hint" style="margin:0 0 12px">
                <strong>Escenario:</strong> crear un pedido. Cada paso habilita el botón
                <strong>Next</strong> llamando a <code>markCompleted(stepKey, valid)</code>
                solo cuando el usuario rellena el campo requerido. Este patrón es el que
                deberías replicar en tus wizards reales (alta de usuario, checkout, onboarding…).
              </p>
              <app-workflow
                #wfH
                [steps]="wfSteps"
                orientation="horizontal"
                [linear]="true"
                (workflow)="onWorkflow($event)"
                (finished)="onWorkflowFinish('horizontal')"
              >
                <ng-template appWorkflowStep="customer">
                  <p class="demo-hint" style="margin:0 0 10px">
                    <strong>Paso 1 — Datos del cliente.</strong> Escribe el nombre del cliente
                    que realiza el pedido. El botón <strong>Next</strong> se habilita
                    automáticamente cuando el campo no está vacío.
                  </p>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:100%; max-width:320px">
                    <mat-label>Customer full name</mat-label>
                    <input
                      matInput
                      [ngModel]="wfForm.customer"
                      (ngModelChange)="onWfField('customer', $event, wfH)"
                      placeholder="e.g. Ada Lovelace"
                    />
                  </mat-form-field>
                </ng-template>

                <ng-template appWorkflowStep="payment">
                  <p class="demo-hint" style="margin:0 0 10px">
                    <strong>Paso 2 — Método de pago.</strong> Selecciona cómo pagará el cliente.
                    Next se habilita al elegir una opción.
                  </p>
                  <mat-radio-group
                    class="wf-radios"
                    [value]="wfForm.payment"
                    (change)="onWfField('payment', $event.value, wfH)"
                  >
                    <mat-radio-button value="card">Credit card</mat-radio-button>
                    <mat-radio-button value="transfer">Bank transfer</mat-radio-button>
                    <mat-radio-button value="cash">Cash</mat-radio-button>
                  </mat-radio-group>
                </ng-template>

                <ng-template appWorkflowStep="confirm">
                  <p class="demo-hint" style="margin:0 0 10px">
                    <strong>Paso 3 — Confirmación.</strong> Revisa los datos del pedido
                    y pulsa <strong>Finish</strong> para completarlo.
                  </p>
                  <ul class="wf-review">
                    <li><strong>Customer:</strong> {{ wfForm.customer || '—' }}</li>
                    <li><strong>Payment:</strong> {{ wfForm.payment || '—' }}</li>
                  </ul>
                  <button
                    mat-stroked-button
                    type="button"
                    color="primary"
                    (click)="wfH.markCompleted('confirm', true)"
                  >
                    <mat-icon>check</mat-icon>
                    I confirm
                  </button>
                </ng-template>
              </app-workflow>
              @if (wfLog().length) {
                <p class="demo-hint">Eventos emitidos por <code>(workflow)</code>:</p>
                <ul class="uploaded-list">
                  @for (l of wfLog(); track $index) {
                    <li><code>{{ l }}</code></li>
                  }
                </ul>
              }
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.workflowH }" />
          </div>
        </app-section-card>
      </section>

      <!-- ─────────── 20. app-workflow (vertical) ─────────── -->
      <section id="workflow-v" class="showcase-section">
        <app-section-card
          title="app-workflow (vertical)"
          subtitle="Mismo componente, orientación vertical. Útil para checklists o wizards largos."
          icon="format_list_numbered"
        >
          <div class="demo">
            <div class="demo-preview">
              <app-workflow
                #wfV
                [steps]="wfSteps"
                orientation="vertical"
                [linear]="false"
                [showActions]="false"
              >
                <ng-template appWorkflowStep="customer">
                  <p>Vertical, navegación libre. Sin botonera interna.</p>
                </ng-template>
                <ng-template appWorkflowStep="payment">
                  <p>Este step se puede saltar sin completar el anterior.</p>
                </ng-template>
                <ng-template appWorkflowStep="confirm">
                  <p>Final.</p>
                </ng-template>
              </app-workflow>
            </div>
            <ng-container *ngTemplateOutlet="codeBlock; context: { code: snippets.workflowV }" />
          </div>
        </app-section-card>
      </section>

          <p class="showcase-footer">
            Documentación: <code>fvx-frontend/docs/design-fvx.md</code> (catálogo, botones, file uploader).
          </p>
        </div>
      </div>
    </div>

    <!-- ─────────── Template reutilizable para code blocks ─────────── -->
    <ng-template #codeBlock let-code="code">
      <details class="demo-code">
        <summary>
          <mat-icon>code</mat-icon>
          Ver código
        </summary>
        <div class="demo-code__body">
          <div class="demo-code__toolbar">
            <app-copy-button [value]="code" tooltip="Copy snippet" [notify]="true" notifyMessage="Código copiado" />
          </div>
          <pre class="demo-code__pre"><code>{{ code }}</code></pre>
        </div>
      </details>
    </ng-template>
  `,
  styles: [`
    /* El host llena el alto del '.main-content' del shell (que ahora esta
       acotado al viewport — ver layout.component.scss .main-wrapper). 'height:
       100%' es fiable y NO genera doble scroll: el wrapper del shell ya no
       crece mas alla del viewport. El UNICO scroll real vive en
       '.showcase-content'; el indice (sidebar) NO scrollea con el contenido
       porque es hermano del scroller dentro del grid de alto acotado. */
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .page-container {
      padding: 16px 32px 0;
      max-width: var(--fvx-page-container-max-width, 1440px);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      color: var(--fvx-text-primary, #1e293b);
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    /* Layout 2 columnas: sidebar FIJO (no scrollea) + contenido scrollable.
       El grid ocupa el alto restante (flex:1 + min-height:0). */
    .showcase-layout {
      flex: 1 1 auto;
      min-height: 0;
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 20px;
      margin-top: 16px;
    }
    .showcase-sidebar {
      /* Indice fijo: el grid le da el alto completo y, si el indice es mas
         largo que ese alto, scrollea internamente. NO se mueve con el
         contenido porque el scroll real vive en '.showcase-content'. */
      min-height: 0;
      overflow-y: auto;
      padding-right: 4px;
    }
    .showcase-content {
      /* UNICO scroll real: las secciones. */
      min-height: 0;
      overflow-y: auto;
      padding: 0 8px 32px 0;
    }
    @media (max-width: 768px) {
      :host { height: auto; }
      .page-container { display: block; padding: 16px 16px 48px; }
      .showcase-layout { display: block; margin-top: 12px; }
      .showcase-sidebar {
        max-height: 200px;
        margin-bottom: 12px;
        border-bottom: 1px solid var(--fvx-border, #e2e8f0);
        padding-bottom: 8px;
      }
      .showcase-content { overflow: visible; padding: 0; }
    }

    .showcase-toc {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px;
      background: var(--fvx-bg-card, #fff);
      border: 1px solid var(--fvx-border, #e2e8f0);
      border-radius: 8px;
      font-size: 0.8125rem;
    }
    .showcase-toc__item {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: none;
      text-align: left;
      width: 100%;
      padding: 6px 10px;
      border-radius: 6px;
      color: var(--fvx-text-secondary, #475569);
      cursor: pointer;
      font: inherit;
      transition: background 0.1s ease, color 0.1s ease;
    }
    .showcase-toc__item:hover {
      color: var(--fvx-link, #2563eb);
      background: color-mix(in srgb, var(--fvx-link, #2563eb) 8%, transparent);
    }
    .showcase-toc__item.is-active {
      color: var(--fvx-link, #2563eb);
      background: color-mix(in srgb, var(--fvx-link, #2563eb) 12%, transparent);
      font-weight: 600;
    }

    .showcase-section {
      margin-bottom: 20px;
      scroll-margin-top: 12px;
    }

    .demo {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .demo-preview {
      padding: 16px;
      background: var(--fvx-bg-page, #f7fafc);
      border: 1px dashed var(--fvx-border, #e2e8f0);
      border-radius: 6px;
    }
    .demo-preview--stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .demo-preview--chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .demo-preview--inline {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-showcase-grid {
      display: grid;
      grid-template-columns: minmax(100px, auto) 1fr;
      gap: 14px 16px;
      align-items: center;
    }
    @media (max-width: 520px) {
      .btn-showcase-grid {
        grid-template-columns: 1fr;
      }
      .btn-showcase-label { margin-top: 4px; }
    }
    .btn-showcase-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--fvx-text-muted, #94a3b8);
    }
    .btn-showcase-btns {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .chart-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      align-items: start;
    }
    .chart-row--3 {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .chart-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .demo-hint {
      margin: 10px 0 0;
      font-size: 0.75rem;
      color: var(--fvx-text-muted, #94a3b8);
    }
    .mono {
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 0.8125rem;
      background: rgba(148, 163, 184, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--fvx-text-primary);
    }

    .overlay-target {
      position: relative;
      min-height: 120px;
      padding: 16px;
      background: var(--fvx-bg-card, #fff);
      border-radius: 6px;
      border: 1px solid var(--fvx-border, #e2e8f0);
    }

    .uploaded-list {
      list-style: none;
      padding: 0;
      margin: 6px 0 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .uploaded-list li {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8125rem;
    }
    .uploaded-list a {
      color: var(--fvx-link, #2563eb);
      text-decoration: none;
    }
    .uploaded-list a:hover { text-decoration: underline; }

    /* Code block */
    .demo-code {
      background: var(--fvx-bg-card, #fff);
      border: 1px solid var(--fvx-border, #e2e8f0);
      border-radius: 6px;
      overflow: hidden;
    }
    .demo-code > summary {
      list-style: none;
      cursor: pointer;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--fvx-text-secondary, #475569);
      background: var(--fvx-bg-page, #f7fafc);
      user-select: none;
    }
    .demo-code > summary::-webkit-details-marker { display: none; }
    .demo-code > summary mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--fvx-text-muted, #94a3b8);
    }
    .demo-code[open] > summary { border-bottom: 1px solid var(--fvx-border, #e2e8f0); }
    .demo-code__body { position: relative; }
    .demo-code__toolbar {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 1;
    }
    .demo-code__pre {
      margin: 0;
      padding: 14px 16px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      max-height: 420px;
      overflow: auto;
      white-space: pre;
    }

    .showcase-footer {
      margin-top: 24px;
      font-size: 0.8125rem;
      color: var(--fvx-text-muted, #94a3b8);
      text-align: center;
    }
    .showcase-footer code {
      background: rgba(148, 163, 184, 0.18);
      padding: 1px 4px;
      border-radius: 3px;
    }

    /* DatePicker demo grid */
    .dp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px 16px;
      align-items: start;
    }

    /* Mail tester */
    .mail-tester { display: flex; flex-direction: column; gap: 14px; }
    .mail-tester__form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px 16px;
    }
    .mail-tester__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .mail-tester__detail {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 4px 12px;
      margin: 4px 0 0;
      font-size: 0.8125rem;
    }
    .mail-tester__detail dt {
      color: var(--fvx-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.6875rem;
      padding-top: 2px;
    }
    .mail-tester__detail dd {
      margin: 0;
      color: var(--fvx-text-primary);
      word-break: break-all;
    }
    .mail-tester__detail code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.75rem;
      background: color-mix(in srgb, var(--fvx-text-primary) 6%, transparent);
      padding: 1px 5px;
      border-radius: 4px;
    }

    /* Stat card grid */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-grid--compact {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
    }

    .composition-demo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
    }

    /* Tabla de ejemplos para numeric-label */
    .num-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .num-table th,
    .num-table td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--fvx-border, #e2e8f0);
      vertical-align: middle;
    }
    .num-table thead th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--fvx-text-secondary, #475569);
      text-align: left;
    }
    .num-table code {
      font-size: 0.75rem;
      background: var(--fvx-hover-bg, rgba(148, 163, 184, 0.15));
      padding: 1px 5px;
      border-radius: 3px;
    }

    /* Workflow demo */
    .wf-radios {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .wf-review {
      list-style: none;
      padding: 0;
      margin: 0 0 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.875rem;
      color: var(--fvx-text-primary, #1e293b);
    }
  `],
})
export class ComponentsShowcaseComponent implements AfterViewInit, OnDestroy {
  private dialog = inject(MatDialog);
  private previewExport = inject(PreviewExportService);
  private drawer = inject(EntityDrawerService);
  private notifier = inject(NotificationService);
  private dateAdapter = inject<DateAdapter<Date>>(DateAdapter);

  /** Formatea con el DateAdapter (date-fns, sincronizado con el idioma en
   *  runtime) en vez del DatePipe (LOCALE_ID estático). Reactivo al toggle de
   *  idioma porque el CD del componente corre al cambiar de lang. Tokens
   *  date-fns: PPP = fecha larga localizada, PPp = fecha larga + hora. */
  fmtDate(d: Date | null, format: string): string {
    return d ? this.dateAdapter.format(d, format) : '—';
  }
  // Mail tester
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = inject(APP_CONFIG).apiUrl;

  /** Índice navegable en la parte superior. Orden alfabético por label. */
  sections: Section[] = [
    { id: 'alert-message', label: 'AlertMessage' },
    { id: 'avatar', label: 'Avatar' },
    { id: 'material-buttons', label: 'Botones Material' },
    { id: 'calculator', label: 'Calculator' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'text-fields', label: 'Campos de texto (patrón)' },
    { id: 'chart', label: 'Chart' },
    { id: 'composition-card', label: 'CompositionCard' },
    { id: 'confirm-dialog', label: 'ConfirmDialog' },
    { id: 'content-dialog', label: 'ContentDialog' },
    { id: 'copy-button', label: 'CopyButton' },
    { id: 'date-picker', label: 'DatePicker' },
    { id: 'date-range-picker', label: 'DateRangePicker' },
    { id: 'empty-state', label: 'EmptyState' },
    { id: 'entity-drawer', label: 'EntityDrawer' },
    { id: 'file-uploader', label: 'FileUploader' },
    { id: 'file-viewer-dialog', label: 'FileViewerDialog' },
    { id: 'info-help', label: 'InfoHelp' },
    { id: 'json-viewer', label: 'JsonViewer' },
    { id: 'loading-overlay', label: 'LoadingOverlay' },
    { id: 'mail-tester', label: 'Mail tester (Mailpit)' },
    { id: 'mapbox', label: 'Mapbox (search + map)' },
    { id: 'numeric-label', label: 'NumericLabel' },
    { id: 'page-header', label: 'PageHeader' },
    { id: 'preview-export', label: 'PreviewExport' },
    { id: 'search-input', label: 'SearchInput' },
    { id: 'section-card', label: 'SectionCard' },
    { id: 'smart-select', label: 'SmartSelect' },
    { id: 'stat-card', label: 'StatCard' },
    { id: 'status-chip', label: 'StatusChip' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'tag-input', label: 'TagInput' },
    { id: 'workflow-h', label: 'Workflow (H)' },
    { id: 'workflow-v', label: 'Workflow (V)' },
  ];

  // ── Demo state ──
  chipMap = {
    active: { variant: 'success' as const, label: 'Active', icon: 'check_circle' },
    pending: { variant: 'warn' as const, label: 'Pending', icon: 'schedule' },
    archived: { variant: 'muted' as const, label: 'Archived' },
  };

  // Demo: section-card con [(expanded)] controlado.
  cardExpanded = true;

  overlayOn = signal(false);
  toggleOverlay(): void {
    this.overlayOn.update((v) => !v);
    if (this.overlayOn()) {
      setTimeout(() => this.overlayOn.set(false), 2000);
    }
  }

  lastSearch = signal('');
  onSearch(v: string): void {
    this.lastSearch.set(v);
  }

  tags: string[] = ['angular', 'material'];

  /** Demo ``app-chart`` (cartesianos + pie). */
  chartLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  chartSeries = [
    { name: 'Ingresos', data: [120, 200, 150, 80, 70, 210] },
    { name: 'Costos', data: [90, 160, 120, 95, 110, 140] },
  ];
  chartPieSlices = [
    { name: 'Web', value: 42 },
    { name: 'API', value: 28 },
    { name: 'Mobile', value: 18 },
  ];
  chartBarLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
  chartBarSeries = [{ name: 'Tickets', data: [320, 280, 390, 410] }];

  chartAreaSeries = [{ name: 'Completados', data: [12, 19, 15, 22, 18, 24] }];

  chartPieSlicesFull = [
    { name: 'Clínica', value: 38 },
    { name: 'Farmacia', value: 27 },
    { name: 'Lab', value: 22 },
    { name: 'Imagen', value: 13 },
  ];

  /** Datos para la fila con ``styleOptions`` (pie / donut / barras). */
  chartCustomPieSlices = [
    { name: 'Infra', value: 35 },
    { name: 'Licencias', value: 28 },
    { name: 'Soporte', value: 22 },
    { name: 'Formación', value: 15 },
  ];
  chartCustomDonutSlices = [
    { name: 'Nuevo', value: 22 },
    { name: 'En curso', value: 45 },
    { name: 'Resuelto', value: 33 },
  ];
  chartCustomBarLabels = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  chartCustomBarSeries = [{ name: 'NPS', data: [42, 48, 52, 51, 58, 61] }];

  readonly chartStylePieWarm: AppChartStyleOptions = {
    palette: ['#3498db', '#34495e', '#5dade2', '#2980b9'],
    textPrimary: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
    tooltipBg: '#f8fafc',
    surface: '#ffffff',
    containerBorder: '#cbd5e1',
    containerRadius: '12px',
    titleFontSize: 13,
    axisLabelFontSize: 10,
  };

  readonly chartStyleDonutCool: AppChartStyleOptions = {
    palette: ['#3498db', '#34495e', '#5dade2', '#7f8c8d'],
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    border: '#d5d8dc',
    tooltipBg: '#f4f6f6',
    surface: '#fbfcfc',
    containerBorder: '#bdc3c7',
    containerRadius: '12px',
    titleFontSize: 13,
    axisLabelFontSize: 10,
  };

  readonly chartStyleBarCorp: AppChartStyleOptions = {
    palette: ['#3498db', '#34495e', '#5dade2'],
    textPrimary: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
    tooltipBg: '#f8fafc',
    surface: '#ffffff',
    containerBorder: '#94a3b8',
    containerRadius: '10px',
    titleFontSize: 13,
    axisLabelFontSize: 10,
    areaFillOpacity: 0.2,
  };

  chartWeekLabels = ['L', 'M', 'X', 'J', 'V'];
  chartWeekSeries = [{ name: 'Citas', data: [14, 18, 12, 20, 16] }];

  chartSparkLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
  chartSparkSeries = [{ name: 'Latencia ms', data: [42, 38, 45, 33, 40, 36, 39, 35] }];

  chartLoading = signal(false);
  toggleChartLoading(): void {
    this.chartLoading.update((v) => !v);
  }

  /** Demo ``mode="raw"``: opción ECharts pasada tal cual. */
  readonly chartRawDemoOption: EChartsOption = {
    title: {
      text: 'Serie mínima (raw)',
      left: 'center',
      top: 8,
      textStyle: { color: '#94a3b8', fontSize: 14, fontWeight: 600 },
    },
    grid: { left: 48, right: 24, top: 44, bottom: 32 },
    xAxis: { type: 'category', data: ['Paso 1', 'Paso 2', 'Paso 3', 'Paso 4'] },
    yAxis: { type: 'value', min: 0 },
    series: [
      {
        type: 'line',
        name: 'Avance %',
        smooth: true,
        data: [20, 45, 62, 88],
        areaStyle: { opacity: 0.08 },
      },
    ],
  };

  range = signal<DateRangeValue>({ start: null, end: null });
  onRangeChange(v: DateRangeValue): void {
    this.range.set(v);
  }

  // ── Mail tester (Mailpit) demo state ──
  mailTester: {
    to: string;
    userName: string;
    actionUrl: string;
    sending: boolean;
    result: {
      success: boolean;
      message: string;
      detail?: {
        status: string;
        subject: string;
        provider: string;
        provider_message_id: string;
      };
    } | null;
  } = {
    to: this.auth.user()?.email ?? '',
    userName: this.auth.user()?.first_name || 'Tester',
    actionUrl: 'http://localhost:4200/',
    sending: false,
    result: null,
  };

  sendTestMail(): void {
    if (!this.mailTester.to || this.mailTester.sending) return;
    this.mailTester.sending = true;
    this.mailTester.result = null;
    this.http
      .post<{
        status: string;
        provider: string;
        provider_message_id: string;
        subject: string;
        sent_at: string | null;
        error_message: string | null;
        mailpit_url: string;
      }>(`${this.apiUrl}/mail-test/`, {
        to: this.mailTester.to,
        user_name: this.mailTester.userName,
        action_url: this.mailTester.actionUrl,
      })
      .subscribe({
        next: (res) => {
          this.mailTester.sending = false;
          const ok = res.status === 'SENT';
          this.mailTester.result = {
            success: ok,
            message: ok
              ? `Llegó a ${res.provider}. Abre Mailpit para verlo.`
              : res.error_message || `Status inesperado: ${res.status}`,
            detail: {
              status: res.status,
              subject: res.subject,
              provider: res.provider,
              provider_message_id: res.provider_message_id,
            },
          };
        },
        error: (err) => {
          this.mailTester.sending = false;
          this.mailTester.result = {
            success: false,
            message:
              err?.error?.detail ||
              err?.message ||
              'Error desconocido al llamar /mail-test/.',
          };
        },
      });
  }

  // ── Text fields pattern demo ──
  textFieldsDemo = {
    name: '',
    email: '',
    phone: '',
    password: '',
    hidePwd: true,
    notes: '',
  };

  // ── DatePicker demo ──
  readonly today = new Date();
  singleDate: Date | null = null;
  weekdayDate: Date | null = null;
  denseDate: Date | null = null;
  dateTimeValue: Date | null = null;
  businessHourValue: Date | null = null;
  /** Límites de hora del ejemplo "horario laboral" (07:00–17:00). Solo se usa la
   *  hora/minuto; la fecha base es irrelevante para minTime/maxTime. */
  readonly time7 = ((): Date => { const d = new Date(); d.setHours(7, 0, 0, 0); return d; })();
  readonly time17 = ((): Date => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; })();

  /** Deshabilita sábados y domingos. */
  isWeekday = (d: Date | null): boolean => {
    if (!d) return false;
    const day = d.getDay();
    return day !== 0 && day !== 6;
  };

  onSingleDateChange(d: Date | null): void {
    this.notifier.info(d ? `Fecha: ${d.toLocaleDateString()}` : 'Fecha limpiada');
  }

  samplePayload = {
    user: { id: 42, name: 'Ada Lovelace', role: 'ADMIN', active: true },
    tags: ['admin', 'active'],
    meta: { created_at: '2026-04-24T12:00:00Z', theme: 'tmp-light' },
    count: 128,
  };

  smartOptions = [
    { value: 'low', label: 'Low priority' },
    { value: 'med', label: 'Medium priority' },
    { value: 'high', label: 'High priority' },
    { value: 'urgent', label: 'Urgent' },
  ];
  smartCtrl = new FormControl<string | null>(null);

  uploadedFiles = signal<FileUploadResult[]>([]);
  onUploaded(files: FileUploadResult[]): void {
    this.uploadedFiles.set(files);
  }

  // ── Tabs ──
  demoTabs: TabItem[] = [
    { key: 'overview', label: 'Overview', icon: 'info' },
    { key: 'details', label: 'Details', icon: 'data_object', badge: 4 },
    { key: 'notes', label: 'Notes', icon: 'sticky_note_2', disabled: false },
  ];
  activeTabKey = 'overview';

  // ── Workflow ──
  wfSteps: WorkflowStep[] = [
    { key: 'customer', label: 'Customer', hint: 'Step 1' },
    { key: 'payment', label: 'Payment', hint: 'Step 2' },
    { key: 'confirm', label: 'Confirm', hint: 'Step 3' },
  ];
  wfForm: { customer: string; payment: string } = { customer: '', payment: '' };
  wfLog = signal<string[]>([]);

  /**
   * Maneja cambios de campo en el wizard: guarda el valor y marca el step
   * como completado solo si hay valor — es el patrón normal (`markCompleted`
   * refleja la validez del form del step).
   */
  onWfField(field: 'customer' | 'payment', value: string, wf: WorkflowComponent): void {
    this.wfForm[field] = value ?? '';
    const valid = !!(value && String(value).trim());
    wf.markCompleted(field, valid);
  }

  onWorkflow(e: WorkflowEvent): void {
    const msg = e.type === 'next' || e.type === 'previous'
      ? `${e.type} → ${e.toIndex} (${e.key})`
      : e.type;
    this.wfLog.update((l) => [...l, msg].slice(-6));
  }
  onWorkflowFinish(which: 'horizontal' | 'vertical'): void {
    this.notifier.success(`Workflow ${which} finished`);
  }

  // ── Mapbox demo state + handlers ────────────────────────────────────────────
  /** Último place elegido en el buscador. Se usa para mostrar metadata abajo. */
  readonly selectedPlace = signal<MapboxPlace | null>(null);

  /** Markers que el padre controla. El componente hace diff por id. */
  private readonly mapMarkers = signal<MapMarker[]>([
    { id: 'home', coord: [-70.6483, -33.4569], color: '#4f5bd5', popupHtml: '<b>Santiago centro</b>' },
  ]);

  /** Opciones reactivas — todo cambio acá se aplica al mapa sin recrearlo. */
  readonly mapOpts = computed<MapOptions>(() => ({
    center: this._mapCenter(),
    zoom: this._mapZoom(),
    controls: this._mapControls(),
    interactions: this._mapInteractions(),
    markers: this.mapMarkers(),
  }));

  private readonly _mapCenter = signal<MapCoord>([-70.6483, -33.4569]);
  private readonly _mapZoom = signal(12);
  // Controles NATIVOS de Mapbox activos en la demo (van sobre el mapa con
  // ícono + tooltip y funcionan: geolocate pide permiso, fullscreen abre, etc.).
  private readonly _mapControls = signal<NonNullable<MapOptions['controls']>>({
    navigation: true,
    geolocate: true,
    fullscreen: true,
    scale: true,
  });
  private readonly _mapInteractions = signal<NonNullable<MapOptions['interactions']>>({
    // Sin scrollZoom explícito: lo gobierna [scrollZoomMode]='click-to-activate'
    // (patrón Google Maps). Un scrollZoom explícito aquí ganaría sobre el modo.
    dragPan: true,
  });

  onMapPlacePicked(place: MapboxPlace): void {
    // app-place-map ya centra el mapa y pone el marker 'picked' internamente;
    // aquí solo guardamos el lugar para mostrar la info (lng/lat/CP) en la demo.
    this.selectedPlace.set(place);
  }

  onMapClick(coord: MapCoord): void {
    // Agrega un marker arrastrable en el click. Cada nuevo marker reemplaza
    // al anterior "click" para no saturar el mapa en la demo.
    const others = this.mapMarkers().filter((m) => m.id !== 'click');
    this.mapMarkers.set([
      ...others,
      { id: 'click', coord, color: '#12996b', draggable: true, popupHtml: 'Marker creado por click' },
    ]);
  }

  onMarkerClick(marker: MapMarker): void {
    this.notifier.info(`Marker click: ${marker.id} (${marker.coord[0].toFixed(3)}, ${marker.coord[1].toFixed(3)})`);
  }

  onMarkerDragEnd(marker: MapMarker): void {
    // Actualizar el marker en el state — el componente hace diff por id.
    const updated = this.mapMarkers().map((m) => (m.id === marker.id ? marker : m));
    this.mapMarkers.set(updated);
  }

  onStatClick(stat: string): void {
    this.notifier.info(`Stat clicked: ${stat}`);
  }

  /** KPI de muestra para enlazar con el input [card] (tipo StatCardConfig). */
  readonly demoStatCardConfig: StatCardConfig = {
    icon: 'speed',
    label: 'Throughput',
    value: '92',
    suffix: '%',
    variant: 'solid',
    tone: 'success',
    progress: 78,
    iconPosition: 'end',
    iconSurface: 'muted',
    trend: 'up',
    trendValue: '+4%',
    trendLabel: 'QoQ',
  };

  readonly demoCompositionRows: CompositionCardRow[] = [
    { label: 'Efectivo y equivalentes', percent: 32, value: '8,43M', barColor: '#166534' },
    { label: 'Cuentas por cobrar', percent: 54, value: '14,21M', barColor: '#2563eb' },
    { label: 'Inventario', percent: 14, value: '3,68M', barColor: '#c2410c' },
  ];

  readonly demoCompositionRowsMany: CompositionCardRow[] = [
    ...this.demoCompositionRows,
    { label: 'Inversiones corto plazo', percent: 18, value: '4,7M' },
    { label: 'Propiedad planta y equipo', percent: 22, value: '5,8M' },
    { label: 'Activos intangibles', percent: 9, value: '2,4M' },
    { label: 'Otros activos', percent: 7, value: '1,8M' },
  ];

  // ── Calendar ──
  pickedDate: Date | null = null;
  pickedDateTime: Date | null = null;
  onCalendarPick(d: Date | null): void {
    if (d) this.notifier.info(`Selected: ${d.toLocaleDateString()}`);
  }

  // ── Calculator ──
  calcDisplay = signal<string>('');
  calcResult = signal<number | null>(null);
  onCalcChange(c: CalculatorChange): void {
    this.calcDisplay.set(c.display);
  }
  onCalcResult(v: number): void {
    this.calcResult.set(v);
  }

  // ── Actions ──
  @ViewChild('showcaseScroll') private showcaseScroll?: ElementRef<HTMLElement>;
  readonly activeSection = signal<string>('material-buttons');

  /** IntersectionObserver para el scroll-spy. Independiente de QUÉ elemento
   *  scrollea (ahora es ``.main-content`` del shell, no este componente). */
  private sectionObserver?: IntersectionObserver;

  /** Sube al inicio del contenido. ``scrollIntoView`` trepa al ancestro
   *  scrollable real (el shell), sin necesitar su referencia. */
  scrollToTop(): void {
    const first = this.showcaseScroll?.nativeElement.querySelector<HTMLElement>(
      `#${this.sections[0]?.id}`,
    );
    first?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Lleva la sección a la vista. ``scrollIntoView`` funciona con cualquier
   *  contenedor scrollable ancestro — no dependemos del scroller propio. */
  scrollToSection(id: string): void {
    const target = this.showcaseScroll?.nativeElement.querySelector<HTMLElement>(`#${id}`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeSection.set(id);
  }

  /** Inicializa el scroll-spy con IntersectionObserver: marca activa la
   *  sección cuya parte superior cruza el tercio superior del viewport.
   *  Robusto frente a cambios de altura del shell o de qué elemento scrollea. */
  private initScrollSpy(): void {
    const root = this.showcaseScroll?.nativeElement;
    if (!root) return;
    // rootMargin negativo abajo: una sección se considera "activa" cuando su
    // top entra en el 30% superior del viewport. ``threshold: 0`` = apenas
    // toca esa banda.
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).id;
            if (id && id !== this.activeSection()) this.activeSection.set(id);
          }
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );
    for (const s of this.sections) {
      const el = root.querySelector<HTMLElement>(`#${s.id}`);
      if (el) this.sectionObserver.observe(el);
    }
  }

  ngAfterViewInit(): void {
    this.initScrollSpy();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
  }

  openConfirm(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete item?',
        message: 'This action cannot be undone.',
        confirmText: 'Delete',
        color: 'warn',
      },
    });
    ref.afterClosed().subscribe((result) => {
      if (result === true) this.notifier.success('Confirmed (demo)');
    });
  }

  openResumenPreview(): void {
    this.previewExport.open(TmpResumenComponent, {
      title: 'Resumen mensual',
      filename: 'resumen-2026-05',
      data: { mes: 5, anio: 2026, org: 'FVX' },
    });
  }

  openResumenPreviewLandscape(): void {
    this.previewExport.open(TmpResumenComponent, {
      title: 'Resumen mensual (horizontal)',
      filename: 'resumen-2026-05-landscape',
      data: { mes: 5, anio: 2026, org: 'FVX' },
      orientation: 'landscape',
    });
  }

  openContent(): void {
    ContentDialogComponent.openWith(this.dialog, {
      title: 'Sample embed',
      component: SampleEmbeddedComponent,
      inputs: { name: 'Ada' },
      size: 'md',
      actions: [
        { label: 'Save', variant: 'flat', color: 'primary', resultKey: 'save' },
      ],
    }).afterClosed().subscribe((r) => {
      if (r === 'save') this.notifier.success('Saved (demo)');
    });
  }

  openContent2(): void {
    const ref = ContentDialogComponent.openWith<string>(this.dialog, {
      title: 'Multiple actions',
      component: SampleEmbeddedComponent,
      inputs: { name: 'demo' },
      size: 'md',
      actions: [
        {
          label: 'Preview',
          variant: 'stroked',
          closes: false,
          handler: () => this.notifier.info('Preview only (does not close).'),
        },
        {
          label: 'Delete',
          variant: 'flat',
          color: 'warn',
          resultKey: 'delete',
        },
        {
          label: 'Save',
          variant: 'flat',
          color: 'primary',
          resultKey: 'save',
        },
      ],
    });
    ref.afterClosed().subscribe((r) => {
      if (r === 'save') this.notifier.success('Saved');
      if (r === 'delete') this.notifier.error('Deleted');
    });
  }

  openViewerImage(): void {
    FileViewerDialogComponent.openWith(this.dialog, {
      url: 'https://picsum.photos/900/600',
      filename: 'sample.jpg',
      mimeType: 'image/jpeg',
    });
  }

  openViewerPdf(): void {
    FileViewerDialogComponent.openWith(this.dialog, {
      url: 'https://www.africau.edu/images/default/sample.pdf',
      filename: 'sample.pdf',
      mimeType: 'application/pdf',
    });
  }

  openViewerJson(): void {
    const blob = new Blob([JSON.stringify(this.samplePayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    FileViewerDialogComponent.openWith(this.dialog, {
      url,
      filename: 'payload.json',
      mimeType: 'application/json',
    });
  }

  openDrawerEmbed(): void {
    this.drawer.open({
      title: 'Custom panel',
      embedComponent: SampleEmbeddedComponent,
      embedInputs: { name: 'drawer', dismissible: true },
    });
  }

  // ── Snippets (copiables) ──
  snippets = {
    materialButtons: `<!-- Formularios / diálogos CRUD -->
<button mat-button type="button">Cancelar</button>
<button mat-stroked-button type="button">Secundario</button>
<button mat-flat-button color="primary" type="button">
  <mat-icon>save</mat-icon>
  Guardar
</button>
<!-- Peligro / borrar: siempre color="warn" (rojo en plantilla; en theme-tmp-dark forzado en _material-overrides) -->
<button mat-flat-button color="warn" type="button">
  <mat-icon>delete</mat-icon>
  Eliminar
</button>
<button mat-icon-button type="button" matTooltip="Más"><mat-icon>more_vert</mat-icon></button>
<button mat-mini-fab color="primary" type="button" matTooltip="Añadir"><mat-icon>add</mat-icon></button>

<!-- Limpiar filtros o reset suave del formulario: mat-button + icono (no compite con Guardar) -->
<button mat-button type="button">
  <mat-icon>clear_all</mat-icon>
  Limpiar filtros
</button>

<!-- Advertencia / revisión (ámbar): clase plantilla .fvx-btn-caution + --fvx-button-caution-* -->
<button mat-flat-button type="button" class="fvx-btn-caution">
  <mat-icon>warning</mat-icon>
  Revisar antes de publicar
</button>

<!-- Cabecera: utilidad -->
<button mat-button type="button">
  <mat-icon>vertical_align_top</mat-icon>
  Top
</button>

<!-- Borde acento (tmp-dark: cian); disabled muy atenuado vía overrides -->
<button mat-stroked-button color="primary" type="button">Export destacado</button>

<!-- Deshabilitado -->
<button mat-button disabled>Cancelar</button>
<button mat-flat-button color="primary" disabled>Guardar</button>

// imports: [MatButtonModule, MatIconModule, MatTooltipModule]
// Guía: fvx-frontend/docs/design-fvx.md (botones)`,

    pageHeader: `<app-page-header
  title="Upload center"
  subtitle="Manage documents"
  [breadcrumbs]="[
    { label: 'Admin', link: '/' },
    { label: 'Uploads' }
  ]"
>
  <ng-container actions>
    <button mat-stroked-button>Export</button>
    <button mat-flat-button color="primary">New</button>
  </ng-container>
</app-page-header>

// imports: [PageHeaderComponent]`,

    sectionCard: `<!-- Card estándar con slot [actions] -->
<app-section-card title="Profile" subtitle="Personal data" icon="person">
  <ng-container actions>
    <button mat-icon-button><mat-icon>edit</mat-icon></button>
  </ng-container>
  <p>Contenido libre del card.</p>
</app-section-card>

<!-- Colapsable (header actúa como botón + chevron en el actions) -->
<app-section-card
  title="Advanced filters"
  icon="tune"
  [collapsible]="true"
  [expanded]="false"
>
  <!-- filtros avanzados -->
</app-section-card>

<!-- Controlado: two-way binding del estado -->
<app-section-card title="Logs" [collapsible]="true" [(expanded)]="showLogs">
  <app-json-viewer [data]="logs" />
</app-section-card>

// imports: [SectionCardComponent]
// cardExpanded = true;    // two-way con [(expanded)]`,

    emptyState: `<app-empty-state
  icon="inbox"
  title="No items yet"
  description="Create the first item to get started."
>
  <button mat-flat-button color="primary">
    <mat-icon>add</mat-icon>
    Create item
  </button>
</app-empty-state>

// imports: [EmptyStateComponent]`,

    alertMessage: `<!-- Tipos: info | success | warning | error — colores vía --fvx-chip-* -->
<app-alert-message
  type="warning"
  role="status"
  message="Tu cuenta está pendiente de validación por un administrador."
/>

<app-alert-message
  type="error"
  message="Tu cuenta está inactiva."
/>

<app-alert-message
  type="success"
  title="Listo"
  message="Operación completada."
  role="status"
/>

// imports: [AlertMessageComponent]`,

    statusChip: `<!-- Modo directo -->
<app-status-chip variant="success" label="Active" icon="check_circle" />
<app-status-chip variant="warn"    label="Pending" />
<app-status-chip variant="danger"  label="Rejected" />

<!-- Con mapa value → variant -->
<app-status-chip
  [value]="row.status"
  [map]="{
    active:   { variant: 'success', label: 'Active', icon: 'check_circle' },
    pending:  { variant: 'warn',    label: 'Pending' },
    archived: { variant: 'muted',   label: 'Archived' }
  }"
/>`,

    copyButton: `<app-copy-button
  [value]="row.uuid"
  tooltip="Copy UUID"
  [notify]="true"
  notifyMessage="UUID copiado"
/>`,

    loadingOverlay: `<section class="container" style="position: relative">
  <app-loading-overlay [show]="isLoading()" message="Loading data..." />
  <!-- contenido real -->
</section>`,

    textFields: `<!-- Patrón canónico FVX para inputs de formulario.
     Label EXTERNO con .field-label (no usa <mat-label> flotante). -->
<div class="field-wrapper">
  <label class="field-label" for="tf-name">Nombre<span class="required">*</span></label>
  <mat-form-field appearance="outline" subscriptSizing="dynamic">
    <input id="tf-name" matInput placeholder="Tu nombre" [(ngModel)]="name" required>
  </mat-form-field>
</div>

<!-- Con prefijo / sufijo -->
<div class="field-wrapper">
  <label class="field-label" for="tf-phone">Teléfono</label>
  <mat-form-field appearance="outline" subscriptSizing="dynamic">
    <mat-icon matPrefix>call</mat-icon>
    <input id="tf-phone" matInput placeholder="+56 9 …" [(ngModel)]="phone">
  </mat-form-field>
</div>

<!-- Textarea -->
<div class="field-wrapper">
  <label class="field-label" for="tf-notes">Notas</label>
  <mat-form-field appearance="outline" subscriptSizing="dynamic">
    <textarea id="tf-notes" matInput rows="3" [(ngModel)]="notes"></textarea>
  </mat-form-field>
</div>

<!-- Convenciones:
     • appearance="outline" + subscriptSizing="dynamic" en TODOS los inputs.
     • NUNCA usar <mat-label> dentro: rompe la convención (label flotante).
     • .field-wrapper / .field-label / .required ya están en styles.scss.
     • Required marker = span.required dentro del label, no [required] de Material. -->`,

    searchInput: `<app-search-input
  placeholder="Search invoices..."
  [debounceMs]="300"
  (searchChange)="onSearch($event)"
/>

// En el componente:
onSearch(q: string) { this.loadRows(q); }`,

    previewExport: `// 1) Inyecta el servicio
constructor(private previewExport: PreviewExportService) {}

// 2) Abre el dialog pasándole el componente a renderizar y sus datos.
//    Los keys de \`data\` se mapean a los @Input()s del componente por nombre.
openResumen() {
  this.previewExport.open(ResumenComponent, {
    title: 'Resumen mensual',
    filename: 'resumen-2026-05',
    data: { mes: 5, anio: 2026, org: 'FVX' },
    // opcionales:
    // pageSize: 'A4' | 'letter',
    // orientation: 'portrait' | 'landscape',
    // actions: ['print', 'pdf', 'png', 'close'],
  });
}

// El dialog ocupa 80vh y muestra una "hoja" tipo carta con tu componente
// adentro. Toolbar: Imprimir · Descargar PDF · Descargar PNG · Cerrar.
// PDF: html2canvas → jsPDF (1+ páginas según alto del contenido).
// PNG: html2canvas → toDataURL.
// Print: window.print() con stylesheet @media print que oculta el chrome.`,

    tagInput: `<app-tag-input
  [(ngModel)]="tags"
  placeholder="Add tag..."
  [maxItems]="8"
  [allowDuplicates]="false"
/>

// tags: string[] = ['angular', 'material'];`,

    datePicker: `<!-- Básico con ngModel -->
<app-date-picker
  label="Birthdate"
  [(ngModel)]="birthdate"
  placeholder="dd-mm-yyyy"
  hint="Elige una fecha"
/>

<!-- Con límites, filtro de días hábiles, required -->
<app-date-picker
  label="Appointment"
  [(ngModel)]="appointment"
  [minDate]="today"
  [dateFilter]="isWeekday"
  [required]="true"
  (dateChange)="onPick($event)"
/>

<!-- Denso (filtros / tablas) -->
<app-date-picker [(ngModel)]="from" [dense]="true" placeholder="From" />

<!-- Con hora: campo de hora junto a la fecha; emite un Date combinado -->
<app-date-picker
  label="Con hora"
  [(ngModel)]="dateTime"
  [withTime]="true"
  [timeInterval]="'30min'"
/>

<!-- Hora configurable: intervalo de 1h, acotada a 07:00-17:00.
     timeInterval acepta '15min' | '30min' | '1h' | '2h'…
     minTime/maxTime: solo se usa la hora (la fecha base da igual). -->
<app-date-picker
  label="Horario laboral"
  [(ngModel)]="dateTime"
  [withTime]="true"
  [timeInterval]="'1h'"
  [minTime]="time7"
  [maxTime]="time17"
/>

// En el componente:
today = new Date();
birthdate: Date | null = null;
appointment: Date | null = null;
dateTime: Date | null = null;
// Límites de hora (solo hora/minuto importan):
time7  = (() => { const d = new Date(); d.setHours(7, 0, 0, 0); return d; })();
time17 = (() => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; })();

isWeekday = (d: Date | null) => {
  if (!d) return false;
  const day = d.getDay();
  return day !== 0 && day !== 6;
};

onPick(d: Date | null) { /* ... */ }

// Reactive Forms:
form = new FormGroup({
  startAt: new FormControl<Date | null>(null, Validators.required),
});
// <app-date-picker formControlName="startAt" label="Start" />`,

    dateRange: `<app-date-range-picker
  label="Report range"
  (rangeChange)="onRangeChange($event)"
/>

onRangeChange({ start, end }: DateRangeValue) {
  this.applyFilter({ start, end });
}`,

    jsonViewer: `<app-json-viewer [data]="payload" />

// Inputs: data (any), copyable=true, wrap=true`,

    avatar: `<app-avatar name="Ada Lovelace" [size]="48" />
<app-avatar
  name="With image"
  imageUrl="https://i.pravatar.cc/96?img=12"
  [size]="48"
/>`,

    smartSelect: `<app-smart-select
  placeholder="Pick an option"
  [options]="options"
  [formControl]="smartCtrl"
/>

// options: { value: any; label: string }[]
// >10 opciones → autocomplete; <=10 → mat-select.`,

    confirmDialog: `import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '.../confirm-dialog/confirm-dialog.component';

const ref = this.dialog.open(ConfirmDialogComponent, {
  data: {
    title: 'Delete item?',
    message: 'This action cannot be undone.',
    confirmText: 'Delete',
    color: 'warn',
  },
});
ref.afterClosed().subscribe(confirmed => {
  if (confirmed) this.deleteRow();
});`,

    contentDialog: `import { ContentDialogComponent } from '.../content-dialog/content-dialog.component';

ContentDialogComponent.openWith(this.dialog, {
  title: 'Sample embed',
  component: MyPanelComponent,      // standalone
  inputs: { userId: 42 },
  size: 'md',
  actions: [
    {
      label: 'Preview',
      variant: 'stroked',
      closes: false,                 // ejecuta handler pero no cierra
      handler: () => this.preview(),
    },
    { label: 'Delete', variant: 'flat', color: 'warn', resultKey: 'delete' },
    { label: 'Save',   variant: 'flat', color: 'primary', resultKey: 'save' },
  ],
}).afterClosed().subscribe(result => { /* 'save' | 'delete' | undefined */ });`,

    fileViewer: `import { FileViewerDialogComponent } from '.../file-viewer-dialog/file-viewer-dialog.component';

FileViewerDialogComponent.openWith(this.dialog, {
  url: 'https://bucket.example.com/contract.pdf',
  filename: 'contract.pdf',
  mimeType: 'application/pdf',
  downloadable: true,
});

// Soporta image / pdf / video / audio / json / text / office (Google viewer).`,

    entityDrawer: `import { EntityDrawerService } from '.../core/services/entity-drawer.service';

constructor(private drawer: EntityDrawerService) {}

// Modo 1: detalle de usuario vía API (GET users/:id)
this.drawer.open({ entityType: 'user', entityId: row.id });

// Modo 2: embeber cualquier componente standalone
this.drawer.open({
  title: 'Custom panel',
  embedComponent: MyPanelComponent,
  embedInputs: { id: row.id, readonly: true },
});`,

    fileUploader: `// app.config.ts
import { FILE_UPLOAD_PROVIDER } from '.../file-uploader/providers/file-upload-provider';
import { SignedUrlUploadProvider } from '.../providers/signed-url-upload.provider';

providers: [
  { provide: FILE_UPLOAD_PROVIDER, useClass: SignedUrlUploadProvider },
],

// Variante grande (página dedicada)
<app-file-uploader
  accept="image/*,application/pdf"
  [multiple]="true"
  [maxFileSizeMb]="5"
  pathPrefix="uploads/avatars"
  (uploaded)="onUploaded($event)"
/>

// Variante compacta (form)
<app-file-uploader
  variant="mini"
  buttonLabel="Attach PDF"
  hint="Only PDF · max 5 MB"
  accept="application/pdf"
  [multiple]="false"
  [maxFileSizeMb]="5"
  (uploaded)="form.patchValue({ fileUrl: $event[0]?.url })"
/>

onUploaded(files: FileUploadResult[]) {
  this.files.set(files);
}

// Guía: fvx-frontend/docs/design-fvx.md (app-file-uploader)`,

    mailTester: `// Backend: POST /api/v1/mail-test/  (staff + DEBUG)
//   payload: { to, user_name, action_url }
//   respuesta: { status, provider, provider_message_id, subject, mailpit_url }
//
// Internamente llama a:
//   notifications.services.email.send(
//     to=<destino>,
//     template="_example",
//     context={"user_name": ..., "action_url": ...},
//     sync=True,
//   )
//
// En local el adapter es SMTP → captura los emails Mailpit (http://localhost:8025).
// En staging/prod cambiar NOTIFICATIONS_EMAIL_ADAPTER=ses en .env (ver docs/email.md).

this.http.post(\`\${apiUrl}/mail-test/\`, {
  to: 'tu@email.test',
  user_name: 'Tester',
  action_url: 'http://localhost:4200/',
}).subscribe(res => console.log(res.status, res.provider_message_id));`,

    tabs: `// Config
tabs: TabItem[] = [
  { key: 'overview', label: 'Overview', icon: 'info' },
  { key: 'details', label: 'Details', icon: 'data_object', badge: 4 },
  { key: 'notes',   label: 'Notes',   icon: 'sticky_note_2' },
];
activeKey = 'overview';

// Template
<app-tabs [tabs]="tabs" [(activeKey)]="activeKey" [stretch]="false">
  <ng-template appTabContent="overview">
    <p>Overview content</p>
  </ng-template>
  <ng-template appTabContent="details">
    <app-json-viewer [data]="payload" />
  </ng-template>
  <ng-template appTabContent="notes">...</ng-template>
</app-tabs>

// imports: [TabsComponent, TabContentDirective]`,

    workflowH: `// Config
steps: WorkflowStep[] = [
  { key: 'customer', label: 'Customer', hint: 'Step 1' },
  { key: 'payment',  label: 'Payment',  hint: 'Step 2' },
  { key: 'confirm',  label: 'Confirm',  hint: 'Step 3' },
];

form = { customer: '', payment: '' };

onField(field: 'customer' | 'payment', value: string, wf: WorkflowComponent) {
  this.form[field] = value;
  // Patrón recomendado: markCompleted refleja la VALIDEZ del step.
  wf.markCompleted(field, !!value?.trim());
}

// Template — horizontal, linear, con botonera integrada.
// El Next se desbloquea automáticamente cuando el step queda "completed".
<app-workflow
  #wf
  [steps]="steps"
  orientation="horizontal"
  [linear]="true"
  (workflow)="onWorkflow($event)"
  (finished)="submit()"
>
  <ng-template appWorkflowStep="customer">
    <mat-form-field>
      <input
        matInput
        [ngModel]="form.customer"
        (ngModelChange)="onField('customer', $event, wf)"
      />
    </mat-form-field>
  </ng-template>

  <ng-template appWorkflowStep="payment">
    <mat-radio-group
      [value]="form.payment"
      (change)="onField('payment', $event.value, wf)"
    >
      <mat-radio-button value="card">Credit card</mat-radio-button>
      <mat-radio-button value="transfer">Transfer</mat-radio-button>
    </mat-radio-group>
  </ng-template>

  <ng-template appWorkflowStep="confirm">
    <button (click)="wf.markCompleted('confirm', true)">I confirm</button>
  </ng-template>
</app-workflow>

// imports: [
//   WorkflowComponent, WorkflowStepDirective,
//   MatFormFieldModule, MatInputModule, MatRadioModule, FormsModule
// ]`,

    workflowV: `<app-workflow
  [steps]="steps"
  orientation="vertical"
  [linear]="false"
  [showActions]="false"
>
  <ng-template appWorkflowStep="customer">...</ng-template>
  <ng-template appWorkflowStep="payment">...</ng-template>
  <ng-template appWorkflowStep="confirm">...</ng-template>
</app-workflow>

// Eventos:
//   (workflow)  → next | previous | reset | complete
//   (finished)  → al pulsar el botón final
//   (activeIndexChange)
// Métodos públicos: markCompleted(key, value?), reset()`,

    calendar: `<app-calendar
  title="Pick a date"
  [(ngModel)]="date"
  [minDate]="minDate"
  [maxDate]="maxDate"
  [dateFilter]="disableWeekends"
  (selectedChange)="onSelect($event)"
/>

<!-- Con hora: emite un único Date con fecha+hora combinadas -->
<app-calendar
  title="Con hora"
  [(ngModel)]="dateTime"
  [withTime]="true"
  [timeInterval]="'30min'"
/>

disableWeekends = (d: Date | null) => {
  if (!d) return true;
  const day = d.getDay();
  return day !== 0 && day !== 6;
};

// imports: [CalendarComponent]
// Para rangos: usa app-date-range-picker.`,

    calculator: `<app-calculator
  [initial]="0"
  [compact]="false"
  [showCopy]="true"
  (valueChange)="onChange($event)"
  (result)="onResult($event)"
/>

onChange(c: CalculatorChange) {
  console.log(c.display, c.value);
}
onResult(v: number) {
  this.total.set(v);
}

// Teclado: foco + 0-9, + - * /, =, Enter, Backspace, Escape, %
// imports: [CalculatorComponent]`,

    statCard: `<!-- Simple -->
<app-stat-card
  icon="payments"
  label="Current price (€)"
  value="44.51"
  tone="primary"
/>

<!-- Split: tarjeta clara + banda de acento -->
<app-stat-card icon="edit" label="New posts" value="278" variant="split" tone="info" />

<!-- Split + barra + icono a la derecha -->
<app-stat-card
  icon="analytics" label="Bounce rate" value="64.89" suffix="%"
  variant="split" tone="warning" iconPosition="end" [progress]="65"
/>

<!-- Split-solid: fondo acento + banda más oscura -->
<app-stat-card
  icon="attach_money" label="Revenue" prefix="$" value="18,420"
  variant="split-solid" tone="success"
/>
<app-stat-card
  icon="dns"
  label="Capacity"
  value="64"
  suffix="%"
  variant="solid"
  tone="info"
  [progress]="64"
  iconPosition="end"
  iconSurface="filled"
/>

<!-- Lista/API: StatCardConfig con [card] (inputs sueltos pueden sobrescribir) -->
<app-stat-card [card]="kpiRow" />
<app-stat-card [card]="kpiRow" label="Override label" />

<!-- Con trend y prefix/suffix -->
<app-stat-card
  icon="attach_money"
  label="Revenue"
  prefix="$"
  value="18,420"
  suffix=" USD"
  trend="up"
  trendValue="+12.4%"
  trendLabel="vs last month"
  tone="success"
/>

<!-- Clickable (botón ARIA) -->
<app-stat-card
  icon="description"
  label="Articles"
  value="132"
  [clickable]="true"
  (activate)="openArticles()"
/>

<!-- Loading (color por tone); override opcional -->
<app-stat-card icon="groups" label="Users" value="—" [loading]="true" />
<app-stat-card icon="groups" label="Users" value="—" [loading]="true" loadingSpinnerColor="#64748b" />

<!-- Compacta / horizontal (tablas, footers) -->
<app-stat-card icon="payments" label="Total (€)" value="12.4k" density="compact" tone="primary" />

<!-- Grid responsive -->
<div class="stat-grid">
  <app-stat-card ... />
</div>

<!-- Grid más estrecho para filas density=compact -->
<div class="stat-grid stat-grid--compact">
  <app-stat-card density="compact" ... />
</div>

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.stat-grid--compact {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

// Tipos: StatCardConfig, StatCardDensity — shared/components/stat-card/stat-card.model.ts
// Inputs: card?, icon, label, value, prefix, suffix, description,
//         trend, trendValue, trendLabel,
//         variant (+ 'solid', 'split', 'split-solid'), tone, loading, clickable, valueTitle,
//         iconPosition ('start'|'end'), iconSurface ('soft'|'filled'|'muted'),
//         progress (0–100 o null), density ('normal'|'compact'), loadingSpinnerColor?
// Output: (activate) cuando clickable=true`,

    compositionCard: `<!-- Inputs sueltos -->
<app-composition-card
  title="Composición de activos"
  subtitle="Bs 26.315.000 al 23 abr"
  tone="success"
  maxWidth="560px"
  [rows]="breakdownRows"
/>

<!-- Ancho / alto máximo: scroll vertical solo en la lista -->
<app-composition-card
  title="Distribución"
  tone="info"
  maxWidth="520px"
  maxHeight="240px"
  [rows]="manyRows"
/>

<!-- Objeto [card] (API / lista) -->
<app-composition-card [card]="compositionFromApi" />

// breakdownRows: CompositionCardRow[] — label, percent (0–100), value, percentLabel?, barColor?
// Sin barColor → relleno con --fvx-chart-color-1 … 6 por fila.
// tone: misma escala que StatCardTone (primary | success | warning | danger | info | neutral).

// Tipos: CompositionCardConfig, CompositionCardRow — shared/components/composition-card/composition-card.model.ts
// Inputs: card?, title, subtitle, rows, tone, maxWidth, maxHeight, minHeight`,

    chart: `<!-- Línea / barras / área: labels + series (cartesianas) -->
<app-chart
  chartType="line"
  title="Ventas vs costos"
  [height]="320"
  [labels]="chartLabels"
  [series]="chartSeries"
/>

<app-chart
  chartType="area"
  title="Tickets completados"
  [height]="260"
  [labels]="chartLabels"
  [series]="chartAreaSeries"
/>

<!-- Pastel / donut: pieSlices -->
<app-chart chartType="pie" title="Mix" [height]="280" [pieSlices]="chartPieSlicesFull" />
<app-chart chartType="donut" title="Tráfico" [height]="280" [pieSlices]="chartPieSlices" />

<!-- Pie / donut / barras con paleta y contenedor propios (AppChartStyleOptions) -->
<app-chart
  chartType="pie"
  title="Costos por rubro"
  [height]="280"
  [pieSlices]="chartCustomPieSlices"
  [styleOptions]="chartStylePieWarm"
/>
<app-chart
  chartType="donut"
  title="Tickets por estado"
  [height]="280"
  [pieSlices]="chartCustomDonutSlices"
  [styleOptions]="chartStyleDonutCool"
/>
<app-chart
  chartType="bar"
  title="NPS semestral"
  [height]="280"
  [labels]="chartCustomBarLabels"
  [series]="chartCustomBarSeries"
  [styleOptions]="chartStyleBarCorp"
/>

<!-- Sin leyenda ni rejilla -->
<app-chart
  chartType="bar"
  [legend]="false"
  [grid]="false"
  [height]="200"
  [labels]="chartWeekLabels"
  [series]="chartWeekSeries"
/>

<!-- Loading -->
<app-chart chartType="line" [loading]="chartLoading()" [labels]="..." [series]="..." />

<!-- Opción ECharts cruda (modo raw) -->
<app-chart mode="raw" [height]="400" [extraOption]="chartRawDemoOption" />

// Preset: chartType 'line'|'bar'|'area'|'pie'|'donut'
// Inputs: title, height, labels, series, pieSlices, legend, grid, loading, extraOption, styleOptions
// Tema: lee --fvx-* / --fvx-chart-* del host; styleOptions pisa por instancia (ver chart.model.ts).
// provideEchartsCore({ echarts }) en app.config + echarts-register.ts`,

    numericLabel: `<!-- Simple -->
<app-numeric-label [value]="1234567.89" [decimals]="2" />

<!-- Moneda CLP sin decimales -->
<app-numeric-label
  [value]="48500"
  currency="CLP"
  locale="es-CL"
  [decimals]="0"
/>

<!-- Moneda USD -->
<app-numeric-label [value]="1234.5" currency="USD" locale="en-US" />

<!-- Prefijo / sufijo personalizados (sin currency) -->
<app-numeric-label [value]="42.7" prefix="$" suffix=" USD" [decimals]="2" />

<!-- Negativos en rojo (positivos neutros) -->
<app-numeric-label
  [value]="-1250.5"
  currency="USD"
  colorMode="negative-red"
/>

<!-- Verde/rojo por signo + flecha -->
<app-numeric-label
  [value]="-4.2"
  suffix="%"
  colorMode="pos-neg"
  [showSignIcon]="true"
/>

<!-- Color fijo y peso en negrita -->
<app-numeric-label [value]="42" color="#b45309" weight="bold" />
<app-numeric-label [value]="tax" [color]="'var(--fvx-warn, #d97706)'" />

<!-- Notación compacta (1.25M, 950k) para KPIs -->
<app-numeric-label [value]="1250000" notation="compact" />

<!-- Null / NaN → emptyText -->
<app-numeric-label [value]="null" emptyText="—" />

<!-- Uso en columna de tabla: recomendable con monospace -->
<app-numeric-label
  [value]="row.balance"
  currency="USD"
  [decimals]="2"
  colorMode="negative-red"
  [monospace]="true"
/>

// Inputs:
//   value: number | string | null | undefined
//   locale?, decimals?, minDecimals?, maxDecimals?
//   currency?, currencyDisplay ('symbol'|'narrowSymbol'|'code'|'name')
//   notation ('standard'|'compact'|'scientific'|'engineering')
//   prefix?, suffix?, emptyText ('—' default)
//   colorMode ('none'|'negative-red'|'pos-neg')
//   color? (CSS), showSignIcon, weight, monospace, tooltip?
// imports: [NumericLabelComponent]`,

    mapbox: `<!-- 1) Configurar token en config.json (runtime, fuera del git):
//     { "mapboxToken": "pk.eyJ1IjoiY..." }

// ─── Opción RECOMENDADA: app-place-map (buscador + mapa combinados) ───
// [mode] = 'both' | 'map' | 'search'. En 'both', al elegir dirección en el
// buscador centra el mapa y pone un marker 'picked' automáticamente.
import { PlaceMapComponent } from 'src/app/shared/components/place-map/place-map.component';
import type { MapOptions, MapMarker, MapCoord } from 'src/app/shared/components/map/map.component';
import type { MapboxPlace } from 'src/app/core/services/mapbox.service';

@Component({
  imports: [PlaceMapComponent],
  template: \`
    <app-place-map
      [mode]="'both'"
      searchPlaceholder="Buscar ubicación"
      [countries]="['cl']"
      [types]="['address', 'street', 'place']"
      [options]="mapOpts()"
      [scrollZoomMode]="'click-to-activate'"
      (placeSelected)="onAddressPicked($event)"
      (mapClick)="onMapClick($event)"
      (markerClick)="onMarkerClick($event)"
      style="height: 360px; display: block;"
    />
  \`
})
export class MyAddressForm {
  private readonly markers = signal<MapMarker[]>([
    { id: 'home', coord: [-70.6483, -33.4569], color: '#4f5bd5' },
  ]);

  readonly mapOpts = computed<MapOptions>(() => ({
    // Controles NATIVOS de Mapbox (van sobre el mapa, ícono + tooltip, funcionan):
    controls: { navigation: true, geolocate: true, scale: true, fullscreen: true },
    // SIN scrollZoom explícito: lo gobierna [scrollZoomMode] (si lo pones acá, gana
    // sobre el modo). [scrollZoomMode]='click-to-activate' = patrón Google Maps.
    interactions: { dragPan: true },
    markers: this.markers(),
  }));

  onAddressPicked(place: MapboxPlace) { /* place.coordinates, place.fullAddress... */ }
  onMapClick(coord: MapCoord) { /* agregar marker en la coord */ }
  onMarkerClick(m: MapMarker) { /* abrir detalle */ }
}

// ─── Opción AVANZADA: app-place-search + app-map por separado ───
// Si necesitas más control, usa los componentes individuales. app-place-search
// es además un ControlValueAccessor (formControlName) y emite (placeSelected).
//   <app-place-search formControlName="address" (placeSelected)="..." />
//   <app-map [options]="mapOpts()" (mapClick)="..." (markerDragEnd)="..." />
//
// MapboxPlace incluye: fullAddress, name, street, houseNumber, city, region,
// postalCode, country, countryCode, featureType, coordinates {lng,lat}, raw.
//
// MapOptions: center, zoom, pitch, bearing, style, controls (navigation /
// geolocate / fullscreen / scale), interactions (scrollZoom [default OFF],
// dragPan, dragRotate, boxZoom, doubleClickZoom, keyboard, touchZoomRotate), markers.
//
// [scrollZoomMode]: 'off' (default) | 'on' | 'click-to-activate' (patrón Google
// Maps: click activa el zoom con rueda, salir del mapa lo desactiva). Si pasas
// interactions.scrollZoom explícito, ese gana sobre scrollZoomMode.
//
// Lazy loading: mapbox-gl (~200 KB) se importa SOLO cuando el primer mapa monta.
// Sin token: los componentes muestran un placeholder (no rompen la app).`,
  };
}
