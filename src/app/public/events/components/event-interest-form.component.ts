import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PublicEvent } from '../../../core/services/content.service';
import { formatPrice } from '../../data/catalog';
import { FirebaseService } from '../../services/firebase.service';

export interface EventInterestSent {
  name: string;
  email: string;
  lodging: boolean | null;
}

const FINISHED_ERROR = 'evento_finalizado';

/** El backend responde `400 {error: "evento_finalizado"}` si el evento ya ocurrió. */
function isFinishedEventError(err: unknown): boolean {
  const e = err as { raw?: { error?: { error?: string } }; error?: { error?: string } };
  return (e?.raw?.error?.error ?? e?.error?.error) === FINISHED_ERROR;
}

/**
 * «Quiero ir»: nombre + correo (+ alojamiento si el evento lo ofrece). No se
 * paga nada aquí: queda como mensaje en la bandeja del admin y el equipo
 * escribe para coordinar la transferencia.
 */
@Component({
  selector: 'app-event-interest-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './event-interest-form.component.html',
})
export class EventInterestFormComponent {
  private leads = inject(FirebaseService);

  event = input.required<PublicEvent>();
  offersLodging = input(false);
  sent = output<EventInterestSent>();

  name = '';
  email = '';
  lodging = false;
  submitting = signal(false);
  error = signal('');
  done = signal(false);

  fieldId = computed(() => `interest-${this.event().slug}`);
  lodgingLabel = computed(() => {
    const place = this.event().location ? ` en ${this.event().location}` : '';
    // La primera frase de la nota («por persona en habitación doble») completa la casilla.
    const terms = (this.event().lodging_note ?? '').split(/[.\n]/)[0].trim() || 'por persona';
    return `Quiero alojar${place} (+${formatPrice(this.event().lodging_price ?? null)} ${terms})`;
  });

  async submit(): Promise<void> {
    if (!this.name.trim() || !this.email.includes('@')) {
      this.error.set('Completa tu nombre y un correo válido.');
      return;
    }
    const payload: EventInterestSent = {
      name: this.name.trim(),
      email: this.email.trim(),
      lodging: this.offersLodging() ? this.lodging : null,
    };
    this.submitting.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.leads.saveEventInterest({
        ...payload, eventName: this.event().name, eventSlug: this.event().slug, price: this.event().price,
      }));
      this.done.set(true);
      this.sent.emit(payload);
    } catch (err) {
      this.error.set(isFinishedEventError(err)
        ? 'Este encuentro ya ocurrió. Revisa los próximos en la página de eventos.'
        : 'No pudimos enviar tus datos. Intenta nuevamente.');
    } finally {
      this.submitting.set(false);
    }
  }
}
