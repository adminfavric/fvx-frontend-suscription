import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PopupDialogComponent, PopupData } from '../components/popup-dialog/popup-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  constructor(private dialog: MatDialog) {}

  open(data: PopupData): void {
    this.dialog.open(PopupDialogComponent, {
      data,
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'popup-dialog-panel',
      autoFocus: false,
      restoreFocus: false
    });
  }

  openPrograms(): void {
    this.open({
      title: 'Nuestros Programas',
      content: `Descubre nuestras experiencias de transformación:

• Retiros Virtuales de Alkymia Solar
• Talleres de Sanación Energética
• Meditaciones Guiadas en Vivo
• Cursos de Autoconocimiento
• Membresías Exclusivas

Próximas fechas disponibles. ¡Reserva tu lugar!`,
      type: 'info'
    });
  }

  openAboutLita(): void {
    this.open({
      title: 'Sobre Lita Donoso',
      content: `Lita Donoso Ocampo es psicóloga transpersonal, escritora best seller y conferencista internacional con más de 25 años de trayectoria.

Autora del Método Alkymia Solar, ha publicado 13 libros —10 de ellos best sellers y 2 long sellers— que han acompañado el despertar de miles de almas en Latinoamérica y el mundo.

Su trabajo integra la psicología, la espiritualidad y las artes sanadoras para ofrecer herramientas prácticas de transformación personal.`,
      type: 'info'
    });
  }

  openContact(): void {
    this.open({
      title: 'Contacto',
      content: 'Déjanos tu mensaje y te responderemos a la brevedad.',
      type: 'form'
    });
  }

  openLogin(): void {
    this.open({
      title: 'Iniciar Sesión',
      content: 'Accede a tu cuenta para disfrutar de todo el contenido exclusivo.',
      type: 'form'
    });
  }

  openDocuserie(): void {
    this.open({
      title: 'Docuserie María Magdalena',
      content: `Una serie audiovisual de 4 capítulos sobre uno de los personajes más poderosos, incomprendidos y luminosos de la historia sagrada.

Dirigida por Pedro Carvajal, con la participación especial de Lita Donoso Ocampo.

🎬 Capítulo 1 — La Reina Silenciada
🎬 Capítulo 2 — El Éxodo Sagrado
🎬 Capítulo 3 — El Verdadero Grial
🎬 Capítulo 4 — El Legado de María Magdalena

Precio: Desde $10.000 CLP`,
      type: 'info'
    });
  }

  openRetiros(): void {
    this.open({
      title: 'Retiros y Experiencias',
      content: `Sumérgete en experiencias transformadoras diseñadas para tu expansión de consciencia.

✨ Retiros virtuales guiados por Lita Donoso
✨ Talleres inéditos de Alkymia Solar
✨ Sesiones de sanación grupal
✨ Encuentros mensuales en vivo

Visita litadonoso.cl para conocer las próximas fechas.`,
      type: 'info'
    });
  }

  openLibros(): void {
    this.open({
      title: 'Libros de Lita Donoso',
      content: `Encuentra todos los libros de Lita Donoso para tu expansión personal.

📖 El Método (Best Seller)
📖 Alkymia Solar
📖 Sanación a través del Perdón
📖 El Poder de la Intención
📖 Y 9 títulos más...

Disponibles en formato físico y digital.`,
      type: 'info'
    });
  }

  openSeries(): void {
    this.open({
      title: 'Series y Documentales',
      content: `Conoce todos los videos, series y documentales producidos por Lita Donoso.

🎬 Docuserie María Magdalena
🎬 Serie Alkymia en Práctica
🎬 Documentales de Sanación
🎬 Clases magistrales grabadas
🎬 Podcasts semanales

Nuevo contenido cada mes.`,
      type: 'info'
    });
  }

  openHealing(): void {
    this.open({
      title: 'Ejercicio de Sanación',
      content: 'Disfruta de este ejercicio guiado de sanación con Lita Donoso.',
      type: 'video',
      videoUrl: 'https://www.youtube.com/embed/EVLIkzsdgaw'
    });
  }
}
