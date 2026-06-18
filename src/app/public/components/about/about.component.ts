import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements AfterViewInit {
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
    }, { threshold: 0.15 });

    document.querySelectorAll('.about-animate').forEach(el => observer.observe(el));
  }

  openAbout(): void {
    this.popupService.openAboutLita();
  }
}
