import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs/operators';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import {
  bindBeforeUnloadWarning,
  type HasUnsavedChanges,
} from '../../../core/guards/unsaved-changes.guard';
import { AuthService } from '../../../core/services/auth.service';
import { EntityDrawerService } from '../../../core/services/entity-drawer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import {
  FILE_UPLOAD_PROVIDER,
  type FileUploadResult,
} from '../file-uploader/providers/file-upload-provider';
import { DjangoUploadProvider } from '../file-uploader/providers/django-upload.provider';
import { SectionCardComponent } from '../section-card/section-card.component';
import { StatusChipComponent } from '../status-chip/status-chip.component';

/**
 * Editor del perfil del **usuario autenticado**.
 *
 * Pensado para embeberse en el `EntityDrawer`:
 *
 * ```ts
 * this.drawer.open({
 *   title: this.transloco.translate('layout.profileDrawerTitle'),
 *   embedComponent: ProfileEditorComponent,
 * });
 * ```
 *
 * Consume `GET /users/me/` y hace `PATCH /users/me/` solo con los campos
 * modificables (nombre, apellido, teléfono, URL del avatar). El backend
 * bloquea los campos de identidad (`username`, `email`) y los flags de
 * autorización (`is_staff`, `is_active`, `role`).
 *
 * **Subida de foto:** inyecta ``DjangoUploadProvider`` — sube al endpoint
 * ``POST /api/v1/uploads/`` que delega en ``default_storage`` (S3-compatible
 * según ``STORAGE_BACKEND`` del backend; en este proyecto = Backblaze B2).
 * Si se quiere swap a Firebase / signed URL, sobreescribir el provider a
 * nivel de app o ruta consumidora.
 */
@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    AvatarComponent,
    FileUploaderComponent,
    SectionCardComponent,
    StatusChipComponent
],
  providers: [
    { provide: FILE_UPLOAD_PROVIDER, useClass: DjangoUploadProvider },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="pe" [formGroup]="form" (ngSubmit)="save()">
      <!-- ───── Header: avatar + identidad ───── -->
      <section class="pe__header">
        <app-avatar
          class="pe__avatar"
          [name]="displayName()"
          [imageUrl]="previewPhoto()"
          [size]="96"
        />
        <div class="pe__identity">
          <h2 class="pe__name">{{ displayName() || ( 'common.dash' | transloco ) }}</h2>
          <p class="pe__username">&#64;{{ user()?.username || ( 'common.dash' | transloco ) }}</p>
          <div class="pe__badges">
            <app-status-chip
              [variant]="user()?.is_active ? 'success' : 'danger'"
              [label]="( (user()?.is_active ? 'profileEditor.active' : 'profileEditor.inactive') | transloco )"
            />
            @if (user()?.is_staff) {
              <app-status-chip variant="info" [label]="'profileEditor.staff' | transloco" />
            }
            @if (user()?.role) {
              <app-status-chip variant="neutral" [label]="user()!.role" />
            }
          </div>
        </div>
      </section>

      <!-- ───── Avatar (subida) ───── -->
      <app-section-card
        [title]="'profileEditor.avatar.title' | transloco"
        icon="account_circle"
        [subtitle]="'profileEditor.avatar.subtitle' | transloco"
      >
        <app-file-uploader
          class="pe__uploader"
          variant="mini"
          [buttonLabel]="'profileEditor.avatar.chooseImage' | transloco"
          [hint]="'profileEditor.avatar.fileHint' | transloco"
          accept="image/jpeg,image/png,image/webp,image/gif"
          [multiple]="false"
          [maxFileSizeMb]="5"
          [pathPrefix]="'profiles/avatars'"
          (uploaded)="onPhotoUploaded($event)"
        />
        @if (form.value.photo_url) {
          <div class="pe__photo-actions">
            <button mat-button type="button" class="pe__clear-photo" (click)="clearPhoto()">
              <mat-icon>hide_image</mat-icon>
              {{ 'profileEditor.avatar.removePhoto' | transloco }}
            </button>
          </div>
        }
        <input type="hidden" formControlName="photo_url" />
      </app-section-card>

      <!-- ───── Datos modificables (patrón design-fvx.md formularios: field-wrapper + dialog-form) ───── -->
      <app-section-card [title]="'profileEditor.personal.title' | transloco" icon="badge">
        <div class="dialog-form dialog-form--embed pe__form">
          <!-- Lock condicional: si el backend ya tiene el nombre, va readonly
               (igual que username/email). Si está vacío, editable para que
               el usuario lo pueda completar la primera vez. -->
          <div class="field-wrapper">
            <label class="field-label" for="pe-first_name">
              {{ 'profileEditor.personal.firstName' | transloco }}
            </label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input
                id="pe-first_name"
                matInput
                formControlName="first_name"
                maxlength="150"
              />
              @if (firstNameLocked()) {
                <mat-icon matSuffix [matTooltip]="'profileEditor.personal.nameLockedHint' | transloco"
                  >lock</mat-icon
                >
              }
            </mat-form-field>
          </div>
          <div class="field-wrapper">
            <label class="field-label" for="pe-last_name">
              {{ 'profileEditor.personal.lastName' | transloco }}
            </label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input
                id="pe-last_name"
                matInput
                formControlName="last_name"
                maxlength="150"
              />
              @if (lastNameLocked()) {
                <mat-icon matSuffix [matTooltip]="'profileEditor.personal.nameLockedHint' | transloco"
                  >lock</mat-icon
                >
              }
            </mat-form-field>
          </div>
          <div class="field-wrapper pe__field-span-full">
            <label class="field-label" for="pe-phone">
              {{ 'profileEditor.personal.phone' | transloco }}
            </label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input
                id="pe-phone"
                matInput
                formControlName="phone"
                maxlength="50"
                [placeholder]="'profileEditor.personal.phonePlaceholder' | transloco"
              />
            </mat-form-field>
          </div>
        </div>
      </app-section-card>

      <!-- ───── Datos inmutables (solo lectura) ───── -->
      <app-section-card
        [title]="'profileEditor.account.title' | transloco"
        [subtitle]="'profileEditor.account.subtitle' | transloco"
        icon="lock"
      >
        <div class="dialog-form dialog-form--embed pe__form">
          <div class="field-wrapper">
            <label class="field-label" for="pe-acct-username">
              {{ 'profileEditor.account.username' | transloco }}
            </label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input
                id="pe-acct-username"
                matInput
                [value]="user()?.username || ''"
                disabled
              />
              <mat-icon matSuffix [matTooltip]="'profileEditor.account.fieldLocked' | transloco"
                >lock</mat-icon
              >
            </mat-form-field>
          </div>
          <div class="field-wrapper">
            <label class="field-label" for="pe-acct-email">
              {{ 'profileEditor.account.email' | transloco }}
            </label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input
                id="pe-acct-email"
                matInput
                [value]="user()?.email || ''"
                disabled
              />
              <mat-icon matSuffix [matTooltip]="'profileEditor.account.fieldLocked' | transloco"
                >lock</mat-icon
              >
            </mat-form-field>
          </div>
          <div class="field-wrapper pe__field-span-full">
            <label class="field-label" for="pe-acct-role">
              {{ 'profileEditor.account.role' | transloco }}
            </label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input
                id="pe-acct-role"
                matInput
                [value]="user()?.role || lockedFieldEmpty()"
                disabled
              />
              <mat-icon matSuffix [matTooltip]="'profileEditor.account.roleLockedHint' | transloco"
                >lock</mat-icon
              >
            </mat-form-field>
          </div>
        </div>
        <p class="pe__hint pe__hint--muted">
          {{ 'profileEditor.account.footerHint' | transloco }}
        </p>
      </app-section-card>

      <!-- ───── Acciones ───── -->
      <footer class="pe__actions">
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || form.pristine || saving() || loading()"
        >
          @if (saving()) {
            <mat-spinner diameter="18" strokeWidth="2" />
          } @else {
            <mat-icon>save</mat-icon>
          }
          {{ 'entityDialog.saveChanges' | transloco }}
        </button>
      </footer>
    </form>
  `,
  styles: [`
    :host { display: block; }

    .pe {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: var(--fvx-text-primary);
    }

    /* Header — avatar + identidad (card sutil en hover-bg para separar) */
    .pe__header {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: var(--fvx-bg-card);
      border: 1px solid var(--fvx-border);
      border-radius: 12px;
    }
    .pe__avatar {
      flex: 0 0 auto;
    }
    .pe__identity {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .pe__name {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--fvx-text-primary);
    }
    .pe__username {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--fvx-text-muted);
    }
    .pe__badges {
      display: flex;
      gap: 6px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    /* Grid formularios (design-fvx.md): hereda .dialog-form global; estrecho sin min-width 480 */
    .pe__form.pe__form {
      box-sizing: border-box;
    }
    .pe__field-span-full {
      grid-column: 1 / -1;
    }
    @media (max-width: 560px) {
      .pe__header {
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }
    }

    .pe__uploader {
      display: block;
      width: 100%;
    }
    .pe__photo-actions {
      margin-top: 10px;
    }
    .pe__clear-photo mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: middle;
      color: var(--fvx-text-muted);
    }

    .pe__hint {
      margin: 10px 0 0;
      font-size: 0.8125rem;
      color: var(--fvx-text-secondary);
    }
    .pe__hint--muted { color: var(--fvx-text-muted); }
    .pe__hint code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.75rem;
      background: var(--fvx-hover-bg);
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* Misma superficie que el drawer: solo borde, sin capa de color distinta. */
    .pe__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
      margin-left: calc(-1 * var(--entity-drawer-content-padding, 0px));
      margin-right: calc(-1 * var(--entity-drawer-content-padding, 0px));
      margin-bottom: calc(-1 * var(--entity-drawer-content-padding, 0px));
      padding: 12px max(16px, var(--entity-drawer-content-padding, 16px))
        max(16px, env(safe-area-inset-bottom, 0px));
      border-top: 1px solid var(--fvx-border);
    }
    .pe__actions mat-spinner {
      display: inline-block;
      margin-right: 4px;
      vertical-align: middle;
    }
  `],
})
export class ProfileEditorComponent implements OnInit, HasUnsavedChanges {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private drawer = inject(EntityDrawerService);
  private notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly endpoint = `${inject(APP_CONFIG).apiUrl}/users/me/`;

  constructor() {
    // Recargar / cerrar pestaña con cambios pendientes muestra el aviso nativo
    // del navegador. La protección Angular (`unsavedChangesGuard`) no aplica aquí
    // porque el editor vive en el `EntityDrawer`, no en una ruta.
    bindBeforeUnloadWarning(this, this.destroyRef);
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

  readonly user = this.auth.user;
  readonly loading = signal(false);
  readonly saving = signal(false);
  private readonly photoPreview = signal<string | null>(null);

  readonly displayName = computed(() => {
    const u = this.user();
    if (!u) return '';
    const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    return full || u.username;
  });

  readonly previewPhoto = computed(
    () => this.photoPreview() ?? this.user()?.photo_url ?? null,
  );

  /** Valor de solo lectura vacío (guion) según idioma. */
  lockedFieldEmpty(): string {
    return this.transloco.translate('common.dash');
  }

  /**
   * Lock condicional para first_name/last_name. Política financiera: el
   * nombre es identidad — una vez completo no se edita desde profile (se
   * cambia con override admin). Si está vacío, queda editable para que el
   * usuario lo pueda completar la primera vez. El backend hace el enforcement
   * real (ver `MeSerializer.update`); aquí solo damos feedback visual.
   */
  readonly firstNameLocked = computed(() => !!(this.user()?.first_name ?? '').trim());
  readonly lastNameLocked = computed(() => !!(this.user()?.last_name ?? '').trim());

  form: FormGroup = this.fb.group({
    first_name: ['', [Validators.maxLength(150)]],
    last_name: ['', [Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(50)]],
    photo_url: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    if (!this.user()) {
      this.loading.set(true);
      this.auth.loadCurrentUser();
    }
    this.hydrateForm();
  }

  private hydrateForm(): void {
    const u = this.user();
    if (!u) return;
    this.form.reset(
      {
        first_name: u.first_name ?? '',
        last_name: u.last_name ?? '',
        phone: u.phone ?? '',
        photo_url: u.photo_url ?? '',
      },
      { emitEvent: false },
    );
    // Lock condicional de nombres: si ya tienen valor en backend, disable el
    // control para que ReactiveForms no envíe nada en el PATCH (defense in
    // depth con el lock del MeSerializer.update).
    if ((u.first_name ?? '').trim()) {
      this.form.controls['first_name'].disable({ emitEvent: false });
    } else {
      this.form.controls['first_name'].enable({ emitEvent: false });
    }
    if ((u.last_name ?? '').trim()) {
      this.form.controls['last_name'].disable({ emitEvent: false });
    } else {
      this.form.controls['last_name'].enable({ emitEvent: false });
    }
    this.photoPreview.set(u.photo_url ?? null);
    this.loading.set(false);
  }

  onPhotoUploaded(results: FileUploadResult[]): void {
    const url = results[0]?.url?.trim();
    if (!url) return;
    this.form.patchValue({ photo_url: url });
    this.photoPreview.set(url);
    this.form.markAsDirty();
    this.cdr.markForCheck();
  }

  clearPhoto(): void {
    this.form.patchValue({ photo_url: '' });
    this.photoPreview.set(null);
    this.form.markAsDirty();
  }

  save(): void {
    if (this.form.invalid || this.form.pristine) return;
    const raw = this.form.getRawValue();
    const payload = {
      first_name: (raw.first_name ?? '').trim(),
      last_name: (raw.last_name ?? '').trim(),
      profile: {
        phone: (raw.phone ?? '').trim(),
        photo_url: (raw.photo_url ?? '').trim(),
      },
    };

    this.saving.set(true);
    this.http
      .patch(this.endpoint, payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notify.success(this.transloco.translate('profileEditor.notify.saved'));
          this.auth.loadCurrentUser();
          // setTimeout con clearTimeout en destroy: si el drawer se cierra antes
          // de 150ms, no ejecutamos hydrateForm() sobre un componente muerto.
          const id = setTimeout(() => this.hydrateForm(), 150);
          this.destroyRef.onDestroy(() => clearTimeout(id));
        },
        error: (err) => {
          const detail =
            err?.error?.detail ||
            (typeof err?.error === 'object'
              ? Object.values(err.error).flat().join(' ')
              : null) ||
            this.transloco.translate('profileEditor.notify.saveError');
          this.notify.error(detail);
        },
      });
  }

  /** Cierra el drawer (atajo para botones externos, no expuesto en UI). */
  close(): void {
    this.drawer.close();
  }
}
