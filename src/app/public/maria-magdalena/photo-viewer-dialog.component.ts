import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface PhotoViewerData {
  photo: string;
  index: number;
  total: number;
}

@Component({
  selector: 'app-photo-viewer-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="photo-viewer">
      <button class="close-btn" (click)="close()" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <div class="photo-container">
        <img [src]="data.photo" [alt]="'Foto ' + (data.index + 1)" />
      </div>
      
      <div class="photo-counter">
        {{ data.index + 1 }} / {{ data.total }}
      </div>
    </div>
  `,
  styles: [`
    .photo-viewer {
      position: relative;
      background: rgba(0, 0, 0, 0.95);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s ease;
      padding: 0;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      svg {
        display: block;
      }
    }

    .photo-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 40px 40px;
      max-width: 90vw;
      max-height: 80vh;

      img {
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        border-radius: 4px;
      }
    }

    .photo-counter {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
      padding: 12px 24px 20px;
      font-weight: 500;
    }
  `]
})
export class PhotoViewerDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PhotoViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhotoViewerData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
