import { Injectable } from '@angular/core';

/**
 * Definición de un tema de ayuda. El TEXTO no vive aquí: vive en i18n
 * (`en.json`/`es.json`) bajo el namespace `help.<topic>.*`, para respetar la
 * regla del template (todo texto visible por Transloco) y soportar EN/ES.
 *
 * Este registro solo declara QUÉ temas existen y su forma (si tienen ejemplo),
 * más las claves i18n a usar. Cada proyecto descendiente agrega sus temas aquí
 * y las traducciones en los JSON.
 */
export interface HelpTopic {
  /** Clave del tema (la que pasa `<app-info-help topic="...">`). */
  topic: string;
  /** Clave i18n del título mostrado en el header del popover. */
  titleKey: string;
  /** Clave i18n del cuerpo (admite `**negritas**`). */
  bodyKey: string;
  /** Clave i18n del ejemplo (bloque resaltado). Opcional. */
  exampleKey?: string;
}

@Injectable({ providedIn: 'root' })
export class HelpContentService {
  /**
   * Registro central de temas. Las claves apuntan a i18n (`help.<topic>.*`).
   *
   * Contenido DEMO genérico del template (roles/staff): sirve de ejemplo de
   * cómo se cura el contenido. Sustitúyelo/extiéndelo con los términos de tu
   * dominio — 1 frase de definición + 1 ejemplo concreto, tono cercano.
   */
  private readonly topics: Record<string, HelpTopic> = {
    role: {
      topic: 'role',
      titleKey: 'help.role.title',
      bodyKey: 'help.role.body',
      exampleKey: 'help.role.example',
    },
    staff: {
      topic: 'staff',
      titleKey: 'help.staff.title',
      bodyKey: 'help.staff.body',
      exampleKey: 'help.staff.example',
    },
  };

  /** Devuelve el tema o un fallback que apunta a claves inexistentes (el
   *  componente mostrará la clave cruda, señal de "falta contenido"). */
  get(topic: string): HelpTopic {
    return (
      this.topics[topic] ?? {
        topic,
        titleKey: `help.${topic}.title`,
        bodyKey: `help.${topic}.body`,
        exampleKey: `help.${topic}.example`,
      }
    );
  }

  /** ¿El tema declara ejemplo? (para no renderizar el bloque vacío). */
  has(topic: string): boolean {
    return topic in this.topics;
  }
}
