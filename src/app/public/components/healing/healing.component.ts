import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-healing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './healing.component.html',
  styleUrl: './healing.component.scss'
})
export class HealingComponent implements AfterViewInit {
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

    document.querySelectorAll('.healing-animate').forEach(el => observer.observe(el));
  }

  openHealing(): void {
    this.popupService.openHealing();
  }
}
