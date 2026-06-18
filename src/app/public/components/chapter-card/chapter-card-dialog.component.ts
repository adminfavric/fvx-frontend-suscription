import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ChapterCardDialogData {
  image: string;
  title: string;
  body: string;
  chapterNumber?: number;
}

@Component({
  selector: 'app-chapter-card-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-content">
      <button class="close-btn" (click)="close()" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <div class="dialog-image">
        <img [src]="data.image" [alt]="data.title" />
        <div class="chapter-overlay" *ngIf="data.chapterNumber">
          <span class="chapter-badge">Capítulo {{ data.chapterNumber }}</span>
        </div>
      </div>
      
      <div class="dialog-body">
        <h2 class="dialog-title">{{ data.title }}</h2>
        <p class="dialog-text">{{ data.body }}</p>
      </div>
    </div>
  `,
  styles: [`
    .dialog-content {
      position: relative;
      background: white;
      border-radius: 16px;
      overflow: hidden;
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s ease;
      padding: 0;

      &:hover {
        background: rgba(0, 0, 0, 0.7);
      }

      svg {
        display: block;
      }
    }

    .dialog-image {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: left bottom;
      }
    }

    .chapter-overlay {
      position: absolute;
      top: 4px;
      right: 0;
    }

    .chapter-badge {
      background: var(--color-gold);
      color: white;
      padding: 4px 12px;
      border-radius: 20px 0 0 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .dialog-body {
      padding: 24px;
    }

    .dialog-title {
      font-family: 'Playfair Display', serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-slate);
      margin-bottom: 16px;
      line-height: 1.3;
    }

    .dialog-text {
      font-size: 1rem;
      line-height: 1.7;
      color: rgba(44, 62, 80, 0.85);
    }
  `]
})
export class ChapterCardDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ChapterCardDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ChapterCardDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
