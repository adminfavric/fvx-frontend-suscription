import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PopupService } from '../../services/popup.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.scss'
})
export class NewsletterComponent implements AfterViewInit {
  name = '';
  email = '';
  country = '';
  phone = '';
  isSubmitting = false;

  private popupService = inject(PopupService);
  private firebaseService = inject(FirebaseService);

  ngAfterViewInit(): void {
    this.observeElements();
  }

  observeElements(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.newsletter-animate').forEach(el => observer.observe(el));
  }

  onSubmit(): void {
    if (!this.email.trim()) {
      this.popupService.open({
        title: 'Error',
        content: 'Por favor ingresa tu email.',
        type: 'info'
      });
      return;
    }

    this.isSubmitting = true;

    this.firebaseService.saveNewsletter({
      name: this.name,
      email: this.email,
      country: this.country,
      phone: this.phone
    }, 'home').subscribe({
      next: () => {
        this.popupService.open({
          title: '¡Gracias por unirte!',
          content: `Hola ${this.name || 'amigo/a'}, has sido registrado exitosamente en nuestro newsletter. Pronto recibirás contenido exclusivo en tu correo.`,
          type: 'info'
        });
        this.name = '';
        this.email = '';
        this.country = '';
        this.phone = '';
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.popupService.open({
          title: 'Error',
          content: 'Hubo un problema al guardar tu información. Por favor intenta de nuevo.',
          type: 'info'
        });
        this.isSubmitting = false;
      }
    });
  }
}
