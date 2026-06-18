import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-trailer-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="trailer-dialog">
      <button class="close-btn" (click)="close()" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <div class="video-container">
        <video controls autoplay playsinline>
          <source src="assets/intromm.mp4" type="video/mp4">
          Tu navegador no soporta el formato de video.
        </video>
      </div>
      
      <div class="trailer-info">
        <h3>Trailer - María Magdalena Docuserie</h3>
      </div>
    </div>
  `,
  styles: [`
    .trailer-dialog {
      position: relative;
      background: #1a1a2e;
      border-radius: 12px;
      overflow: hidden;
      min-width: 300px;
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s ease;
      padding: 0;

      &:hover {
        background: rgba(0, 0, 0, 0.8);
      }

      svg {
        display: block;
      }
    }

    .video-container {
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;

      video {
        width: 100%;
        height: 100%;
        display: block;
      }
    }

    .trailer-info {
      padding: 1.25rem 1.5rem;
      text-align: center;

      h3 {
        color: white;
        font-family: 'Playfair Display', serif;
        font-size: 1.1rem;
        font-weight: 500;
        margin: 0;
      }
    }
  `]
})
export class TrailerDialogComponent {
  constructor(public dialogRef: MatDialogRef<TrailerDialogComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
