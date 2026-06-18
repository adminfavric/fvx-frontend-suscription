import { Component, DestroyRef, Inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { FormControl } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RelationshipConfig } from '../../../core/models/api.model';

export interface RelationshipDialogData {
  config: RelationshipConfig;
  entityId: number;
  entityName: string;
}

@Component({
  selector: 'app-relationship-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TranslocoModule
],
  template: `
    <h2 mat-dialog-title>
      <div class="title-content">
        <mat-icon>{{ data.config.icon }}</mat-icon>
        <span>{{ data.config.label }} — {{ data.entityName }}</span>
      </div>
      <button mat-icon-button (click)="dialogRef.close()" [attr.aria-label]="'common.close' | transloco">
        <mat-icon>close</mat-icon>
      </button>
    </h2>

    <mat-dialog-content>
      <!-- Existing relationships -->
      <div class="relationships-list">
        @if (loading()) {
          <div class="loading-box">
            <mat-spinner diameter="32"></mat-spinner>
            <span>{{ 'relationshipDialog.loading' | transloco }}</span>
          </div>
        } @else if (relationships().length === 0) {
          <div class="empty-box">
            <mat-icon>link_off</mat-icon>
            <span>{{ 'relationshipDialog.emptyLinked' | transloco: { label: data.config.label.toLowerCase() } }}</span>
          </div>
        } @else {
          @for (rel of relationships(); track rel.id) {
            <div class="rel-item">
              <div class="rel-info">
                <span class="rel-name">{{ rel._displayName }}</span>
                @if (rel._extraInfo) {
                  <span class="rel-meta">{{ rel._extraInfo }}</span>
                }
              </div>
              <button mat-icon-button color="warn" [matTooltip]="'relationshipDialog.remove' | transloco"
                      (click)="removeRelationship(rel.id)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          }
        }
      </div>

      <!-- Add new relationship -->
      <div class="add-section">
        <h4 class="add-title">
          <mat-icon>add_link</mat-icon>
          {{ 'relationshipDialog.addTitle' | transloco: { label: data.config.label } }}
        </h4>

        <!-- Search -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'relationshipDialog.searchLabel' | transloco: { label: data.config.label } }}</mat-label>
          <input matInput [formControl]="searchCtrl" [placeholder]="'relationshipDialog.searchPlaceholder' | transloco" autocomplete="off">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <!-- Search results -->
        @if (searching()) {
          <div class="loading-box small">
            <mat-spinner diameter="20"></mat-spinner>
          </div>
        }

        @if (searchResults().length > 0) {
          <div class="search-results">
            @for (item of searchResults(); track item.id) {
              <button type="button" class="result-item" (click)="selectRemote(item)">
                <mat-icon>add_circle_outline</mat-icon>
                <span>{{ item._displayName }}</span>
              </button>
            }
          </div>
        }

        <!-- Extra fields form (shown when an entity is selected) -->
        @if (selectedRemote()) {
          <div class="selected-entity">
            <div class="selected-badge">
              <mat-icon>check_circle</mat-icon>
              <span>{{ selectedRemote()!._displayName }}</span>
              <button mat-icon-button (click)="clearSelection()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (data.config.extraFields && data.config.extraFields.length > 0) {
              <form [formGroup]="extraForm" class="extra-fields">
                @for (field of data.config.extraFields; track field.key) {
                  @if (field.type === 'select') {
                    <mat-form-field appearance="outline">
                      <mat-label>{{ field.label }}</mat-label>
                      <mat-select [formControlName]="field.key">
                        @for (opt of field.options || []; track opt.value) {
                          <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  } @else if (field.type === 'date') {
                    <mat-form-field appearance="outline">
                      <mat-label>{{ field.label }}</mat-label>
                      <input matInput type="date" [formControlName]="field.key">
                    </mat-form-field>
                  } @else {
                    <mat-form-field appearance="outline">
                      <mat-label>{{ field.label }}</mat-label>
                      <input matInput [type]="field.type" [formControlName]="field.key">
                    </mat-form-field>
                  }
                }
              </form>
            }

            @if (saving()) {
              <button mat-flat-button color="primary" disabled>
                <mat-spinner diameter="18"></mat-spinner>
              </button>
            } @else {
              <button mat-flat-button color="primary" (click)="addRelationship()">
                <mat-icon>link</mat-icon>
                {{ 'relationshipDialog.linkAction' | transloco: { label: data.config.label } }}
              </button>
            }
          </div>
        }
      </div>
    </mat-dialog-content>
  `,
  styles: [`
    @use 'variables' as v;

    h2 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 1.1rem;
      gap: 8px;
    }

    .title-content {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;

      mat-icon:first-of-type {
        flex-shrink: 0;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    mat-dialog-content {
      min-width: 450px;
      max-height: 70vh;
    }

    .relationships-list {
      margin-bottom: 16px;
    }

    .rel-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border: 1px solid v.$color-border;
      border-radius: v.$radius-md;
      margin-bottom: 6px;
      transition: background 0.15s;

      &:hover { background: v.$color-bg-hover; }
    }

    .rel-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .rel-name {
      font-weight: v.$font-weight-medium;
      font-size: v.$font-size-base;
      color: v.$color-text-primary;
    }

    .rel-meta {
      font-size: v.$font-size-xs;
      color: v.$color-text-muted;
    }

    .loading-box, .empty-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      color: v.$color-text-muted;
      font-size: v.$font-size-sm;

      mat-icon { font-size: 20px; }
    }

    .loading-box.small { padding: 8px; }

    .add-section {
      border-top: 1px solid v.$color-border;
      padding-top: 16px;
    }

    .add-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: v.$font-size-sm;
      font-weight: v.$font-weight-semibold;
      color: v.$color-text-secondary;
      margin: 0 0 12px 0;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: v.$color-primary; }
    }

    .full-width { width: 100%; }

    .search-results {
      max-height: 180px;
      overflow-y: auto;
      border: 1px solid v.$color-border;
      border-radius: v.$radius-md;
      margin-bottom: 12px;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: v.$font-size-sm;
      transition: background 0.15s;
      // resets de <button> (era <div>): que se vea como una fila, no un botón.
      width: 100%;
      text-align: left;
      appearance: none;
      background: none;
      border: none;
      font-family: inherit;
      color: inherit;

      &:hover { background: v.$color-bg-selected; }
      &:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px var(--fvx-accent-soft, color-mix(in srgb, var(--fvx-link) 30%, transparent));
      }

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: v.$color-primary; }
    }

    .selected-entity {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .selected-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: v.$color-primary-50;
      border: 1px solid v.$color-primary-100;
      border-radius: v.$radius-md;
      font-size: v.$font-size-sm;
      font-weight: v.$font-weight-medium;
      color: v.$color-primary-dark;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      span { flex: 1; }
    }

    .extra-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
    }

    @media (max-width: 768px) {
      mat-dialog-content { min-width: unset; }
      .extra-fields { grid-template-columns: 1fr; }
    }
  `]
})
export class RelationshipDialogComponent implements OnInit {
  relationships = signal<any[]>([]);
  searchResults = signal<any[]>([]);
  selectedRemote = signal<any | null>(null);
  loading = signal(false);
  searching = signal(false);
  saving = signal(false);

  searchCtrl = new FormControl('');
  extraForm!: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<RelationshipDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RelationshipDialogData,
    private api: ApiService,
    private notify: NotificationService,
    private fb: FormBuilder,
    private destroyRef: DestroyRef,
    private transloco: TranslocoService,
  ) {}

  ngOnInit(): void {
    this.buildExtraForm();
    this.loadRelationships();
    this.setupSearch();
  }

  private buildExtraForm(): void {
    const group: Record<string, any> = {};
    for (const field of this.data.config.extraFields || []) {
      group[field.key] = [''];
    }
    this.extraForm = this.fb.group(group);
  }

  private loadRelationships(): void {
    this.loading.set(true);
    const params: Record<string, any> = {
      [this.data.config.localKey]: this.data.entityId,
      page_size: 100,
      ...(this.data.config.filters || {}),
    };

    this.api.list<any>(this.data.config.endpoint, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const items = res.results.map((r: any) => ({
            ...r,
            _displayName: r[this.data.config.remoteDisplayField] || `#${r[this.data.config.remoteKey]}`,
            _extraInfo: this.buildExtraInfo(r),
          }));
          this.relationships.set(items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private buildExtraInfo(rel: any): string {
    const parts: string[] = [];
    for (const field of this.data.config.extraFields || []) {
      if (rel[field.key]) {
        const opt = field.options?.find(o => o.value === rel[field.key]);
        parts.push(`${field.label}: ${opt?.label || rel[field.key]}`);
      }
    }
    return parts.join(' · ');
  }

  private setupSearch(): void {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(val => !!val && val.length >= 2),
      switchMap(query => {
        this.searching.set(true);
        return this.api.list<any>(this.data.config.remoteEndpoint, {
          search: query!,
          page_size: 20,
          is_active: true,
        });
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: res => {
        const existingIds = new Set(this.relationships().map(r => r[this.data.config.remoteKey]));
        const results = res.results
          .filter((item: any) => !existingIds.has(item.id))
          .map((item: any) => ({
            ...item,
            _displayName: this.getRemoteDisplayName(item),
          }));
        this.searchResults.set(results);
        this.searching.set(false);
      },
      error: () => this.searching.set(false),
    });
  }

  private getRemoteDisplayName(item: any): string {
    if (item.name) return item.name;
    if (item.full_name) return item.full_name;
    if (item.first_name) return `${item.first_name} ${item.last_name || ''}`.trim();
    if (item.username) return item.username;
    return `#${item.id}`;
  }

  selectRemote(item: any): void {
    this.selectedRemote.set(item);
    this.searchResults.set([]);
    this.searchCtrl.setValue('', { emitEvent: false });
  }

  clearSelection(): void {
    this.selectedRemote.set(null);
    this.extraForm.reset();
  }

  addRelationship(): void {
    const remote = this.selectedRemote();
    if (!remote) return;

    this.saving.set(true);

    const payload: Record<string, any> = {
      [this.data.config.localKey]: this.data.entityId,
      [this.data.config.remoteKey]: remote.id,
    };

    // Merge extra fields
    if (this.data.config.extraFields) {
      const extras = this.extraForm.value;
      for (const key of Object.keys(extras)) {
        if (extras[key] !== '' && extras[key] !== null && extras[key] !== undefined) {
          payload[key] = extras[key];
        }
      }
    }

    this.api.create<any>(this.data.config.endpoint, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notify.success(
            this.transloco.translate('relationshipDialog.linkedSuccess', { label: this.data.config.label }),
          );
          this.clearSelection();
          this.loadRelationships();
          this.saving.set(false);
        },
        error: (err) => {
          this.notify.handleError(err);
          this.saving.set(false);
        },
      });
  }

  removeRelationship(relId: number): void {
    this.api.delete(this.data.config.endpoint, relId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notify.success(this.transloco.translate('relationshipDialog.removedSuccess'));
          this.relationships.update(list => list.filter(r => r.id !== relId));
        },
        error: (err) => this.notify.handleError(err),
      });
  }
}
