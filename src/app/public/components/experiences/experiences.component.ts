import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupService } from '../../services/popup.service';

interface ExperienceCard {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  popupType: string;
}

@Component({
  selector: 'app-experiences',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiences.component.html',
  styleUrl: './experiences.component.scss'
})
export class ExperiencesComponent implements AfterViewInit {
  cards: ExperienceCard[] = [
    {
      image: 'assets/talleres.png',
      title: 'Retiros virtuales y experiencias en vivo',
      subtitle: 'Talleres',
      description: 'Retiros virtuales y talleres inéditos de Lita Donoso: Alkymia y otros',
      buttonText: 'Sitio web',
      popupType: 'retiros'
    },
    {
      image: 'assets/libros.png',
      title: 'Libros',
      subtitle: 'Libros',
      description: 'Encuentra todos los libros de Lita Donoso para tu expansión',
      buttonText: 'Conoce mis libros',
      popupType: 'libros'
    },
    {
      image: 'assets/documentales.png',
      title: 'Series y Documentales',
      subtitle: 'Documental',
      description: 'Conoce todos los videos, series y documentales.',
      buttonText: 'Series',
      popupType: 'series'
    }
  ];

  constructor(private popupService: PopupService) {}

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

    document.querySelectorAll('.exp-animate').forEach(el => observer.observe(el));
  }

  openPopup(type: string): void {
    switch (type) {
      case 'retiros':
        this.popupService.openRetiros();
        break;
      case 'libros':
        this.popupService.openLibros();
        break;
      case 'series':
        this.popupService.openSeries();
        break;
    }
  }
}
