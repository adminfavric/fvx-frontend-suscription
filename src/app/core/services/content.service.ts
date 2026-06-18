import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Firestore,
  addDoc,
  collection,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Membership } from '../../public/data/catalog';
import { environment } from '../../../environments/environment';

export interface SubscriptionIntent {
  membershipSlug: string;
  membershipName: string;
  name: string;
  email: string;
  country: string;
  cycle: string;
}

/** Evento especial (compra única) que viene del backend Django. */
export interface PublicEvent {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  date: string | null;
  price: number | null;
  icon: string;
  image_url?: string;
}

/**
 * Lee el contenido público desde Firestore (colecciones `memberships` y
 * `events`). Si Firestore está vacío o falla (p. ej. reglas aún sin
 * configurar), cae al catálogo en memoria de `catalog.ts` para que el sitio
 * siga funcionando.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private db = inject(Firestore);
  private http = inject(HttpClient);

  /**
   * Lee las membresías del backend Django (`/public/memberships/`, sin auth),
   * que las gestiona en el admin y las sincroniza con Flow. Si el backend falla
   * o no devuelve nada, cae al catálogo en memoria para que el sitio no quede
   * vacío.
   */
  async getMemberships(): Promise<Membership[]> {
    // Flow es la fuente de verdad: el backend devuelve los planes activos en Flow
    // (enriquecidos con la info local del admin). Sin respaldo en memoria: si no
    // hay planes en Flow, el sitio muestra el estado vacío (no planes "fantasma").
    try {
      const list = await firstValueFrom(
        this.http.get<Membership[]>(`${environment.apiUrl}/public/memberships/`),
      );
      return list ?? [];
    } catch {
      return [];
    }
  }

  /** Una membresía por slug (desde el backend, con fallback al catálogo). */
  async getMembership(slug: string): Promise<Membership | undefined> {
    const list = await this.getMemberships();
    return list.find(m => m.slug === slug);
  }

  /**
   * Inicia el checkout de Flow: el backend crea el cliente e inicia el registro
   * de tarjeta y devuelve la URL de Flow a la que hay que redirigir al visitante
   * (allí ingresa los datos de su tarjeta de forma segura en Flow).
   */
  async startCheckout(payload: { plan_slug: string; name: string; email: string }): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ redirect_url: string }>(
        `${environment.apiUrl}/public/checkout/start/`,
        payload,
      ),
    );
    return res.redirect_url;
  }

  /** Eventos especiales (compra única) desde el backend Django. */
  async getEvents(): Promise<PublicEvent[]> {
    try {
      const list = await firstValueFrom(
        this.http.get<PublicEvent[]>(`${environment.apiUrl}/public/events/`),
      );
      return list ?? [];
    } catch {
      return [];
    }
  }

  /** Inicia el pago ÚNICO de un evento en Flow; devuelve la URL de redirección. */
  async startEventCheckout(payload: { event_slug: string; name: string; email: string }): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ redirect_url: string }>(
        `${environment.apiUrl}/public/events/checkout/`,
        payload,
      ),
    );
    return res.redirect_url;
  }

  /**
   * Registra la intención de inscripción de un visitante. Devuelve true si se
   * guardó en Firestore. Requiere que las Security Rules permitan crear en
   * `subscriptionIntents` (ver instrucciones del proyecto).
   */
  async createSubscriptionIntent(intent: SubscriptionIntent): Promise<boolean> {
    try {
      await addDoc(collection(this.db, 'subscriptionIntents'), {
        ...intent,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn('[ContentService] No se pudo guardar la intención en Firestore:', err);
      return false;
    }
  }
}
