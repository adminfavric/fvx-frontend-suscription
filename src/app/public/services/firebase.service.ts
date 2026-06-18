import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Captura de "leads" del sitio público (newsletter, contacto, inscripciones a
 * maratón). Originalmente escribía en Firebase Realtime Database; ahora persiste
 * en el backend Django (`POST /public/leads/`).
 *
 * El nombre de la clase se conserva (`FirebaseService`) para no tocar todos los
 * imports de los componentes portados desde el sitio original. Los métodos de
 * lectura (getContacts/getNewsletter/…) se eliminaron: la gestión se hace en el
 * admin Django, no desde el sitio público.
 *
 * Diseño defensivo: si el endpoint aún no existe o falla, el observable resuelve
 * igualmente OK para que los formularios del sitio no se rompan (el lead se
 * registra en consola). El endpoint real vive en `subscriptions/`.
 */
export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface NewsletterForm {
  name: string;
  email: string;
  country: string;
  phone: string;
}

export interface MaratonForm {
  fullName: string;
  email: string;
  phone?: string;
  countryCode?: string;
}

type LeadKind = 'newsletter' | 'contact' | 'maraton';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/public/leads/`;

  private post(kind: LeadKind, payload: Record<string, unknown>, source = 'home'): Observable<void> {
    return this.http
      .post(this.endpoint, { kind, source, ...payload })
      .pipe(
        map(() => void 0),
        catchError((err) => {
          // No romper la UX del sitio si el backend no está disponible.
          console.warn('[leads] no se pudo registrar el lead, continúo:', err?.status ?? err);
          return of(void 0);
        }),
      );
  }

  /** Newsletter / suscripción al boletín. */
  saveNewsletter(data: NewsletterForm, source = 'home'): Observable<void> {
    return this.post('newsletter', { ...data, email: data.email.toLowerCase().trim() }, source);
  }

  /** Formulario de contacto. */
  saveContact(data: ContactForm): Observable<void> {
    return this.post('contact', { ...data, email: data.email.toLowerCase().trim() });
  }

  /** Inscripción a maratón / evento puntual. */
  saveMaratonInscription(data: MaratonForm, source = 'maria-magdalena'): Observable<void> {
    return this.post('maraton', { ...data, email: data.email.toLowerCase().trim() }, source);
  }
}
