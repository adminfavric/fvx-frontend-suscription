import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SmartSelectComponent } from '../smart-select/smart-select.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
// NO importar MatNativeDateModule (ver nota en calendar.component): proveería un
// DateAdapter local que anula el global con el locale de la app. Usa el global.
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { FieldConfig } from '../../../core/models/api.model';
import { isHttpError } from '../../../core/http/http-error';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import type { FileUploadResult } from '../file-uploader/providers/file-upload-provider';
import { CalendarComponent } from '../calendar/calendar.component';

export interface EntityFormDialogData {
  title: string;
  fields: FieldConfig[];
  entity?: any;
  mode: 'create' | 'edit';
  /**
   * Si se provee, el dialog llama AQUÍ al guardar (en vez de cerrarse con el
   * valor). Mantiene el dialog abierto y muestra el error inline si la API falla
   * (p. ej. validación de contraseña), sin perder lo escrito; cierra solo en
   * éxito (con la entidad guardada). Sin él, el dialog cierra con el valor
   * (comportamiento legacy).
   */
  submitHandler?: (value: Record<string, any>) => Observable<unknown>;
}

function getAtPath(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!obj || !path) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}


@Component({
  selector: 'app-entity-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    SmartSelectComponent,
    MatCheckboxModule,
    MatButtonModule,
    MatDatepickerModule,
    MatIconModule,
    MatTooltipModule,
    FileUploaderComponent,
    CalendarComponent,
    TranslocoPipe,
  ],
  template: `
    <h2 mat-dialog-title [ngStyle]="isMobile ? mobileStyles.title : {}">
      <div class="dialog-title-content">
        <mat-icon class="dialog-title-icon">{{ data.mode === 'create' ? 'add_circle' : 'edit' }}</mat-icon>
        <span>{{ data.title }}</span>
      </div>
      @if (isMobile) {
        <button mat-icon-button class="dialog-close-btn" (click)="dialogRef.close()" [attr.aria-label]="'entityDialog.close' | transloco">
          <mat-icon>close</mat-icon>
        </button>
      }
    </h2>

    <mat-dialog-content [ngStyle]="isMobile ? mobileStyles.content : {}">
      <form [formGroup]="form" class="dialog-form"
            [ngStyle]="isMobile ? mobileStyles.form : desktopStyles.form">
        @for (field of data.fields; track field.key) {
          @if (isVisible(field)) {
          @switch (field.type) {
            @case ('select') {
              <div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                <app-smart-select
                  [options]="field.options || []"
                  [placeholder]="field.placeholder || ('entityDialog.selectPlaceholder' | transloco)"
                  [formControlName]="field.key">
                </app-smart-select>
                @if (field.hint) { <span class="field-hint">{{ field.hint }}</span> }
              </div>
            }
            @case ('boolean') {
              <div class="checkbox-field">
                <mat-checkbox [formControlName]="field.key">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }</mat-checkbox>
                @if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }
                @if (field.hint) {
                  <span class="field-hint field-hint--checkbox">{{ field.hint }}</span>
                }
              </div>
            }
            @case ('textarea') {
              <div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <textarea matInput [formControlName]="field.key" rows="3"
                            [placeholder]="field.placeholder || ''"></textarea>
                </mat-form-field>
              </div>
            }
            @case ('date') {
              <div class="field-wrapper">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <input matInput [matDatepicker]="picker" [formControlName]="field.key"
                         [placeholder]="field.placeholder || ('entityDialog.datePlaceholder' | transloco)">
                  <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                </mat-form-field>
              </div>
            }
            @case ('multiselect') {
              <div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-select [formControlName]="field.key" multiple [placeholder]="field.placeholder || ''">
                    @for (opt of field.options || []; track opt.value) {
                      <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @if (field.hint) { <span class="field-hint">{{ field.hint }}</span> }
              </div>
            }
            @case ('datetime') {
              <div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                <app-calendar [withTime]="true" timeInterval="15min" [formControlName]="field.key"></app-calendar>
                @if (field.hint) { <span class="field-hint">{{ field.hint }}</span> }
              </div>
            }
            @case ('image') {
              <div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                @if (form.get(field.key)?.value) {
                  <div class="image-preview">
                    <img [src]="form.get(field.key)?.value" alt="preview" />
                    <button type="button" mat-button color="warn" (click)="form.get(field.key)?.setValue('')">
                      <mat-icon>delete</mat-icon> Quitar
                    </button>
                  </div>
                }
                <app-file-uploader
                  variant="mini"
                  [accept]="field.accept || 'image/*'"
                  pathPrefix="plans"
                  [maxFileSizeMb]="5"
                  [multiple]="false"
                  buttonLabel="Subir imagen"
                  (uploaded)="onImageUploaded(field.key, $event)">
                </app-file-uploader>
                @if (field.hint) { <span class="field-hint">{{ field.hint }}</span> }
              </div>
            }
            @case ('file') {
              <div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                @if (form.get(field.key)?.value) {
                  <div class="file-current">
                    <mat-icon>insert_drive_file</mat-icon>
                    <a [href]="form.get(field.key)?.value" target="_blank" rel="noopener">Archivo subido</a>
                    <button type="button" mat-button color="warn" (click)="form.get(field.key)?.setValue('')">
                      <mat-icon>delete</mat-icon> Quitar
                    </button>
                  </div>
                }
                <app-file-uploader
                  variant="mini"
                  [accept]="field.accept || ''"
                  pathPrefix="content"
                  [maxFileSizeMb]="500"
                  [multiple]="false"
                  buttonLabel="Subir archivo"
                  (uploaded)="onImageUploaded(field.key, $event)">
                </app-file-uploader>
                @if (field.hint) { <span class="field-hint">{{ field.hint }}</span> }
              </div>
            }
            @default {
              <div class="field-wrapper" [style.grid-column]="isMobile ? '' : (field.colspan ? 'span ' + field.colspan : '')">
                <span class="field-label">@if (field.labelKey) { {{ field.labelKey | transloco }} } @else { {{ field.label }} }@if (field.required) { <span class="required">*</span> }@if (field.info) { <mat-icon class="field-info" [matTooltip]="field.info" matTooltipPosition="above" matTooltipClass="field-info-tip">info_outline</mat-icon> }</span>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <input matInput [type]="field.type" [formControlName]="field.key"
                         [placeholder]="field.placeholder || ''">
                </mat-form-field>
                @if (field.hint) { <span class="field-hint">{{ field.hint }}</span> }
              </div>
            }
          }
          }
        }
      </form>
    </mat-dialog-content>

    @if (submitError) {
      <div class="dialog-error" role="alert">
        <mat-icon>error_outline</mat-icon>
        <span>{{ submitError }}</span>
      </div>
    }

    <mat-dialog-actions [ngStyle]="isMobile ? mobileStyles.actions : {}" [attr.align]="isMobile ? null : 'end'">
      <button mat-button [disabled]="submitting" (click)="dialogRef.close()" [ngStyle]="isMobile ? mobileStyles.actionBtn : {}">{{ 'entityDialog.cancel' | transloco }}</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || submitting"
              (click)="onSubmit()" [ngStyle]="isMobile ? mobileStyles.actionBtn : {}">
        @if (submitting) {
          {{ 'entityDialog.saving' | transloco }}
        } @else {
          {{ data.mode === 'create' ? ('entityDialog.create' | transloco) : ('entityDialog.saveChanges' | transloco) }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    @use 'variables' as v;

    /* Banner de error del servidor (el dialog se queda abierto). */
    .dialog-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 24px 4px;
      padding: 9px 12px;
      border-radius: var(--fvx-radius, 9px);
      background: var(--fvx-danger-soft, color-mix(in srgb, var(--fvx-danger, #b91c1c) 14%, transparent));
      color: var(--fvx-danger, #b91c1c);
      font-size: var(--fvx-text-sm);

      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    h2 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: v.$font-size-md;
    }

    .dialog-title-content {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .dialog-title-icon {
      flex-shrink: 0;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .dialog-close-btn {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        line-height: 20px;
      }
    }

    .dialog-form {
      display: grid;
      box-sizing: border-box;
    }

    /* .field-wrapper / .field-label / .field-hint: see styles.scss (design-fvx.md formularios) */

    /* Checkbox + ícono de info en UNA línea (fila). Si hay hint, baja a su
       propia línea con flex-basis 100%. */
    .checkbox-field {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px 6px;
      padding: 6px 0 2px;
    }
    .checkbox-field .field-info { margin-left: 0; }

    .field-hint--checkbox {
      flex-basis: 100%;
      margin-left: 28px;
      font-size: 0.8125rem;
      line-height: 1.35;
      color: var(--fvx-text-muted, #64748b);
      max-width: 42ch;
    }

    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Desktop: TOPE DE ALTURA DIRECTO en el contenido → SIEMPRE scrollea, sin
       depender de que el host tenga altura resuelta (el bug anterior: el panel
       crecía más que el viewport y quedaba pegado arriba sin poder centrarse).
       Con el contenido acotado, el diálogo entero cabe y el overlay lo centra.
       En mobile el scroll lo aplica mobileStyles.content inline (fullscreen). */
    @media (min-width: 769px) {
      mat-dialog-content {
        max-height: 62vh !important;
        overflow-y: auto !important;
      }
    }

    .image-preview { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .image-preview img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid var(--fvx-border, #e6e6ef); }
    .file-current { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: .85rem; }
    .file-current a { color: var(--fvx-primary, #5b3a8a); }

    /* Ícono de ayuda (tooltip) junto a la etiqueta del campo. */
    .field-info {
      font-size: 16px; width: 16px; height: 16px; line-height: 16px;
      color: var(--fvx-text-muted, #8a85a0); cursor: help; vertical-align: middle; margin-left: 4px;
      flex: 0 0 auto;
    }
  `]
})
export class EntityFormDialogComponent implements OnInit {
  form!: FormGroup;
  isMobile = window.innerWidth <= 768;

  /** Visibilidad condicional de un campo (``showWhen``). Sin condición → visible.
   * Reactivo: se reevalúa en cada ciclo de detección al cambiar el campo maestro
   * (p. ej. ocultar los campos de Zoom cuando el Tipo no es "Zoom"). */
  isVisible(field: FieldConfig): boolean {
    const cond = field.showWhen;
    if (!cond) return true;
    const current = this.form?.get(cond.field)?.value;
    return Array.isArray(cond.equals) ? cond.equals.includes(current) : current === cond.equals;
  }

  /** Campo tipo `image`: el uploader sube el archivo y aquí guardamos la URL
   * resultante en el control del formulario (se persiste como image_url). */
  onImageUploaded(key: string, results: FileUploadResult[]): void {
    const url = results?.[0]?.url;
    if (url) {
      this.form.get(key)?.setValue(url);
      this.form.get(key)?.markAsDirty();
    }
  }

  desktopStyles = {
    form: {
      'grid-template-columns': '1fr 1fr',
      'gap': '4px 14px',
      'min-width': '480px',
      'margin-top': '4px',
    },
  };

  mobileStyles = {
    form: {
      'grid-template-columns': '1fr',
      'gap': '6px',
      'min-width': '0',
      'width': '100%',
      'margin-top': '4px',
    },
    title: {
      padding: '10px 16px',
      margin: '0',
    },
    content: {
      padding: '12px 16px',
      maxHeight: 'none',
      flex: '1',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    },
    actions: {
      flexDirection: 'column',
      gap: '8px',
      padding: '10px 16px 12px',
      borderTop: '1px solid var(--fvx-border)',
    },
    actionBtn: {
      'width': '100%',
      'margin': '0',
    },
  };

  /** Guardando (submitHandler en vuelo) → deshabilita el botón. */
  submitting = false;
  /** Error del servidor a mostrar inline (dialog se queda abierto). */
  submitError: string | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EntityFormDialogComponent>,
    private transloco: TranslocoService,
    @Inject(MAT_DIALOG_DATA) public data: EntityFormDialogData,
  ) {}

  ngOnInit(): void {
    const group: Record<string, any> = {};

    for (const field of this.data.fields) {
      let value: unknown;
      if (field.initialFrom) {
        value = getAtPath(this.data.entity as Record<string, unknown> | undefined, field.initialFrom);
      } else {
        value = this.data.entity?.[field.key];
      }
      if (
        (value === undefined || value === null || value === '') &&
        field.defaultValue !== undefined
      ) {
        value = field.defaultValue;
      }
      if (value === undefined || value === null || value === '') {
        value = field.type === 'boolean' ? false : '';
      }
      // datetime (app-calendar): trabaja con objetos Date. El backend manda ISO;
      // lo convertimos a Date para que el calendario muestre fecha + hora.
      if (field.type === 'datetime') {
        value = typeof value === 'string' && value ? new Date(value) : null;
      }
      // multiselect: el valor es un array. Al editar, envolvemos el valor único
      // (p. ej. ``plan`` vía initialFrom) en un array.
      if (field.type === 'multiselect') {
        value = Array.isArray(value) ? value : (value !== '' && value != null ? [value] : []);
      }
      const validators = [];
      if (field.required) validators.push(Validators.required);
      if (field.type === 'email') validators.push(Validators.email);
      const disabled = !!field.disabled;
      group[field.key] = [{ value, disabled }, validators];
    }

    this.form = this.fb.group(group);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const result = { ...this.form.getRawValue() };

    // Clean up values before sending to API
    for (const field of this.data.fields) {
      const val = result[field.key];

      // Convert Date objects to YYYY-MM-DD string for the backend
      if (field.type === 'date' && val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        result[field.key] = `${y}-${m}-${d}`;
      }

      // datetime (app-calendar): Date → ISO 8601 (con zona) para el backend.
      // Solo si es un Date VÁLIDO; si no, null (evita el RangeError de toISOString).
      if (field.type === 'datetime') {
        result[field.key] = val instanceof Date && !isNaN(val.getTime())
          ? val.toISOString()
          : null;
      }

      // Null out empty optional FK / number fields
      if (val === '' || val === undefined) {
        if (field.type === 'select' || field.type === 'number') {
          result[field.key] = null;
        }
      }

      // Null out empty date / datetime fields
      if ((field.type === 'date' || field.type === 'datetime') && !val) {
        result[field.key] = null;
      }
    }

    // Sin submitHandler: comportamiento legacy (cerrar con el valor).
    if (!this.data.submitHandler) {
      this.dialogRef.close(result);
      return;
    }

    // Con submitHandler: llamar la API con el dialog ABIERTO. Solo cerramos en
    // éxito; en error mostramos el mensaje inline y NO perdemos lo escrito.
    this.submitting = true;
    this.submitError = null;
    this.data.submitHandler(result).subscribe({
      next: (saved) => this.dialogRef.close(saved ?? result),
      error: (err) => {
        this.submitting = false;
        this.submitError = isHttpError(err)
          ? err.message
          : this.transloco.translate('errors.unexpected');
      },
    });
  }
}
