import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChapterCardComponent } from '../chapter-card/chapter-card.component';

interface Chapter {
  number: number;
  title: string;
  date: string;
}

@Component({
  selector: 'app-docuserie',
  standalone: true,
  imports: [CommonModule, ChapterCardComponent],
  templateUrl: './docuserie.component.html',
  styleUrl: './docuserie.component.scss'
})
export class DocuserieComponent implements AfterViewInit {
  chapters: Chapter[] = [
    { number: 1, title: 'La Reina Silenciada', date: '4 de abril' },
    { number: 2, title: 'El Éxodo Sagrado', date: '11 de abril' },
    { number: 3, title: 'El Verdadero Grial', date: '18 de abril' },
    { number: 4, title: 'El Legado de María Magdalena', date: '25 de abril' }
  ];

  chapterCards = [
    {
      image: 'assets/caps/cap1.png',
      title: 'La Reina Silenciada',
      body: '¿Quién fue realmente María Magdalena? ¿Una pecadora redimida, una mujer poseída por demonios… o la esposa secreta de Jesús de Nazaret? Durante siglos, la Iglesia moldeó una imagen ambigua y sumisa de la figura femenina más cercana a Cristo.',
      chapterNumber: 1
    },
    {
      image: 'assets/caps/cap2.png',
      title: 'El éxodo sagrado',
      body: 'Tras la crucifixión de Jesús de Nazaret, María Magdalena emprende una huida silenciosa que cambiará el curso oculto de la historia. Protegida por José de Arimatea.',
      chapterNumber: 2
    },
    {
      image: 'assets/caps/cap3.png',
      title: 'El verdadero Grial',
      body: 'Lita Donoso explora las pistas del Santo Grial entre manuscritos, castillos y claves ocultas en la iconografía europea, mientras dialoga con investigadoras del sagrado femenino.',
      chapterNumber: 3
    },
    {
      image: 'assets/caps/cap4.png',
      title: 'El legado de María Magdalena',
      body: 'El mensaje de María Magdalena no solo sobrevivió a la persecución medieval: fue protegido durante siglos por manos invisibles, custodios silenciosos de una verdad que podía cambiar el destino del mundo.',
      chapterNumber: 4
    }
  ];

  constructor(private router: Router) {}

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
    }, { threshold: 0.1 });

    document.querySelectorAll('.docuserie-animate').forEach(el => observer.observe(el));
  }

  openDocuserie(): void {
    // Navega a la docuserie y siempre la abre desde el inicio (arriba del todo).
    this.router.navigate(['/maria-magdalena']).then(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }
}
