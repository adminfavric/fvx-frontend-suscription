/**
 * Catálogo de contenido público (membresías, eventos, etc.).
 *
 * Por ahora son datos en memoria para poder construir y mostrar las vistas.
 * Más adelante esto se reemplaza por llamadas al backend Django
 * (endpoints `memberships`, `events`, `news`...).
 */

export interface Membership {
  /** Identificador para la URL: /membresias/:slug */
  slug: string;
  name: string;
  tagline: string;
  /** Descripción larga para la página de detalle / contratación. */
  description: string;
  /** Cadencia legible: "Sesión mensual", "1 módulo por mes", etc. */
  cadence: string;
  /** ¿Queda grabado para ver después? */
  recorded: boolean;
  /** Lista de beneficios / lo que incluye. */
  features: string[];
  /** Precio mensual en CLP. null = "por definir / consultar". */
  priceMonthly: number | null;
  /** Icono de Material para la tarjeta. */
  icon: string;
  /** Imagen opcional para la card (enriquecimiento gestionado en el admin). */
  image_url?: string;
  /** Frecuencia de cobro Flow: 1 diario · 2 semanal · 3 mensual · 4 anual. */
  interval?: number;
  /** ¿Se muestra como destacada? */
  featured?: boolean;
}

export interface SpecialEvent {
  slug: string;
  name: string;
  subtitle: string;
  /** Fecha legible. null = "Próximamente". */
  dateLabel: string | null;
  description: string;
  /** Precio CLP del evento (compra única). null = consultar. */
  price: number | null;
  icon: string;
}

/** Fecha en que abre la inscripción a las membresías. */
export const INSCRIPTION_OPENS = '15 de junio de 2026';

export const MEMBERSHIPS: Membership[] = [
  {
    slug: 'escuela-de-alkymistas',
    name: 'Escuela de Alkymistas',
    tagline: 'Sesión mensual · curso anual',
    description:
      'Un espacio destinado a la auto maestría y el avance personal, en base al estudio y ' +
      'prácticas de enseñanzas que combinan textos de grandes maestros (Ramtha y María ' +
      'Magdalena, entre otros) con el Método Alkymia Solar, creado por Lita Donoso.',
    cadence: 'Sesión mensual (curso anual)',
    recorded: false,
    features: [
      'Sesión en vivo cada mes',
      'Programa anual de auto maestría',
      'Estudio guiado de grandes maestros',
      'Prácticas del Método Alkymia Solar',
    ],
    priceMonthly: null,
    icon: 'auto_awesome',
    featured: true,
  },
  {
    slug: 'psicologia-transpersonal',
    name: 'Taller de Psicología Transpersonal',
    tagline: 'Uno por mes · online en vivo · queda grabado',
    description:
      'Talleres enfocados en la auto observación y la auto sanación, potenciales del ser ' +
      'humano que se activan con el Método Alkymia. Cada tema se desarrolla con una parte ' +
      'teórica y una parte experiencial, en base a ejercicios creados por la autora para ' +
      'cada módulo, de alto impacto transformacional.',
    cadence: 'Un taller por mes (online en vivo)',
    recorded: true,
    features: [
      'Estreno de un taller cada mes',
      'Presencial online en vivo',
      'Parte teórica + parte experiencial',
      'Queda grabado para volver a verlo',
    ],
    priceMonthly: null,
    icon: 'self_improvement',
  },
  {
    slug: 'podcast-encuentro-alkymistas',
    name: 'Podcast Encuentro de Alkymistas',
    tagline: 'Una vez por mes · queda grabado',
    description:
      'Encuentros donde se desarrollan temas de interés para las mentes pensantes de los ' +
      'Alkymistas: contenidos que no son tratados en los medios convencionales o que no ' +
      'tienen la difusión que merecen. Son interactivos: los participantes pueden compartir ' +
      'sus comentarios.',
    cadence: 'Un encuentro por mes',
    recorded: true,
    features: [
      'Un encuentro en vivo al mes',
      'Temas fuera de los medios convencionales',
      'Espacio interactivo y participativo',
      'Queda grabado',
    ],
    priceMonthly: null,
    icon: 'podcasts',
  },
  {
    slug: 'metodo-alkymia-paso-a-paso',
    name: 'Método Alkymia paso a paso',
    tagline: 'Un módulo por mes',
    description:
      'Contenidos que permiten a la persona transformarse en Alkymista Solar. Están basados ' +
      'en el libro de la autora "Alquimia para los tiempos que corren" (Editorial PRH). Cada ' +
      'módulo incluye un resumen de la maestría correspondiente más un audio de ejercicios ' +
      'para cada sesión.',
    cadence: 'Un módulo nuevo por mes',
    recorded: true,
    features: [
      'Un módulo nuevo cada mes',
      'Basado en el libro "Alquimia para los tiempos que corren"',
      'Resumen de cada maestría',
      'Audios de ejercicios por sesión',
    ],
    priceMonthly: null,
    icon: 'menu_book',
  },
];

export const SPECIAL_EVENTS: SpecialEvent[] = [
  {
    slug: 'taller-basico-alkymia-solar',
    name: 'Taller Básico de Alkymia Solar',
    subtitle: 'Activación de la Glándula Pineal y la Llama Violeta',
    dateLabel: 'Sábado 27 de junio · 10:00 AM (Chile)',
    description:
      'Primer taller de Alkymia Solar. Una jornada de activación para iniciar el camino ' +
      'del Alkymista Solar.',
    price: null,
    icon: 'wb_sunny',
  },
  {
    slug: 'taller-avanzado-alkymia-solar',
    name: 'Taller de Alkymia Solar Avanzado',
    subtitle: 'Profundización del Método Alkymia Solar',
    dateLabel: null,
    description: 'La continuación avanzada del camino de Alkymia Solar. Fecha por anunciar.',
    price: null,
    icon: 'flare',
  },
];

export function findMembership(slug: string): Membership | undefined {
  return MEMBERSHIPS.find(m => m.slug === slug);
}

/** Formatea un precio CLP, o devuelve el texto para "por definir". */
export function formatPrice(clp: number | null): string {
  if (clp === null) return 'Valor por confirmar';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(clp);
}
