import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FirebaseService } from '../../services/firebase.service';

export interface PopupData {
  title: string;
  content: string;
  type?: 'info' | 'form' | 'video' | 'image';
  imageUrl?: string;
  videoUrl?: string;
}

@Component({
  selector: 'app-popup-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './popup-dialog.component.html',
  styleUrl: './popup-dialog.component.scss'
})
export class PopupDialogComponent {
  private firebaseService = inject(FirebaseService);
  
  // Form fields
  name = '';
  email = '';
  subject = '';
  message = '';
  isSubmitting = false;
  submitSuccess = false;

  constructor(
    public dialogRef: MatDialogRef<PopupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PopupData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  submitContact(): void {
    if (!this.name.trim() || !this.email.trim() || !this.message.trim()) {
      return;
    }

    this.isSubmitting = true;

    this.firebaseService.saveContact({
      name: this.name,
      email: this.email,
      subject: this.subject || 'Sin asunto',
      message: this.message
    }).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.isSubmitting = false;
        setTimeout(() => this.close(), 2000);
      },
      error: (err) => {
        console.error('Error:', err);
        this.isSubmitting = false;
      }
    });
  }
}
