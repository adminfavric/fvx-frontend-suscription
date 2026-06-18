import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-maraton-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="maraton-dialog">
      <button class="close-btn" (click)="close()" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <div class="dialog-header">
        <h2>Inscripción al Maratón</h2>
        <p class="subtitle">Docuserie María Magdalena</p>
      </div>

      <div class="dialog-body" *ngIf="!submitSuccess">
        <div class="form-section">
          <form class="maraton-form" (ngSubmit)="submitForm()">
            <div class="form-group">
              <label>Nombre completo <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="fullName"
                name="fullName"
                placeholder="Ingresa tu nombre completo"
                required />
            </div>

            <div class="form-group">
              <label>Email <span class="required">*</span></label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="tu@email.com"
                required />
            </div>

            <div class="notice-box">
              <p>📌 <strong>Importante:</strong> Después de inscribirte, te contactaremos por email para coordinar el pago y entregarte los detalles de acceso al evento.</p>
            </div>

            <div class="error-message" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              class="submit-btn"
              [disabled]="isSubmitting || !isFormValid()">
              <span *ngIf="!isSubmitting">Completar inscripción</span>
              <span *ngIf="isSubmitting">
                <span class="spinner"></span>
                Procesando...
              </span>
            </button>
          </form>
        </div>
      </div>

      <div class="success-view" *ngIf="submitSuccess">
        <div class="success-icon">✓</div>
        <h3>¡Inscripción exitosa!</h3>
        <p>Tu inscripción al Maratón ha sido registrada. Te contactaremos pronto por email para coordinar el pago y entregarte los detalles de acceso.</p>
        <button class="submit-btn" (click)="close()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .maraton-dialog {
      position: relative;
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.15);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: all 0.2s ease;

      svg {
        width: 24px;
        height: 24px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.8);
        transform: scale(1.05);
      }
    }

    .dialog-header {
      padding: 2rem 2rem 1rem;
      text-align: center;
      background: linear-gradient(135deg, #6B4C8C 0%, #4A3563 100%);
      color: white;

      h2 {
        font-family: 'Playfair Display', serif;
        font-size: 1.75rem;
        margin: 0 0 0.5rem;
      }

      .subtitle {
        font-size: 1rem;
        opacity: 0.9;
        margin: 0;
      }
    }

    .dialog-body {
      padding: 1.5rem 2rem 2rem;
    }

    .form-section {
      max-width: 100%;
    }

    .maraton-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      label {
        font-size: 0.95rem;
        font-weight: 600;
        color: #333;

        .required {
          color: #dc3545;
        }
      }

      input {
        padding: 0.875rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.2s;

        &:focus {
          outline: none;
          border-color: #6B4C8C;
        }
      }
    }

    .notice-box {
      background: #e3f2fd;
      border-left: 4px solid #2196F3;
      padding: 1rem;
      border-radius: 0 8px 8px 0;
      margin: 0.5rem 0;

      p {
        margin: 0;
        font-size: 0.9rem;
        color: #1565C0;
        line-height: 1.5;
      }
    }

    .error-message {
      color: #dc3545;
      font-size: 0.9rem;
      text-align: center;
      padding: 0.75rem;
      background: #ffebee;
      border-radius: 6px;
    }

    .submit-btn {
      background: linear-gradient(135deg, #6B4C8C 0%, #4A3563 100%);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 0.5rem;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(107, 76, 140, 0.3);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success-view {
      padding: 3rem 2rem;
      text-align: center;

      .success-icon {
        width: 60px;
        height: 60px;
        background: #28a745;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        margin: 0 auto 1.5rem;
      }

      h3 {
        color: #28a745;
        font-family: 'Playfair Display', serif;
        margin-bottom: 1rem;
      }

      p {
        color: #666;
        margin-bottom: 1.5rem;
        line-height: 1.6;
      }
    }

    @media (max-width: 600px) {
      .maraton-dialog {
        max-width: 95vw;
      }
    }
  `]
})
export class MaratonDialogComponent {
  private leads = inject(FirebaseService);
  private dialogRef = inject(MatDialogRef<MaratonDialogComponent>);

  fullName = '';
  email = '';

  isSubmitting = false;
  submitSuccess = false;
  errorMessage = '';

  isFormValid(): boolean {
    return !!(
      this.fullName.trim() &&
      this.email.trim()
    );
  }

  async submitForm(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(
        this.leads.saveMaratonInscription({
          fullName: this.fullName.trim(),
          email: this.email.trim().toLowerCase(),
        }),
      );

      this.submitSuccess = true;
      this.isSubmitting = false;
    } catch (error) {
      console.error('Error:', error);
      this.errorMessage = 'Error al procesar la inscripción. Intenta de nuevo.';
      this.isSubmitting = false;
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
