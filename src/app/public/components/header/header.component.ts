import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PopupService } from '../../services/popup.service';
import { MemberAuthService } from '../../services/member-auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  isScrolled = false;
  mobileMenuOpen = false;
  /** Solo la home tiene el hero a pantalla completa detrás del header. En el
   * resto de páginas el header se muestra siempre sólido (texto oscuro) para que
   * el menú sea legible sobre el fondo claro desde el inicio. */
  isHome = true;

  constructor(
    private popupService: PopupService,
    private router: Router,
    public member: MemberAuthService,
  ) {
    this.isHome = this.computeIsHome(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => (this.isHome = this.computeIsHome(e.urlAfterRedirects)));
  }

  private computeIsHome(url: string): boolean {
    const path = (url.split('?')[0] || '').replace(/\/+$/, '');
    return path === '' || path === '/';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  goHome(): void {
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }

  /** Cierra la sesión del miembro y vuelve a la página normal (sin sesión). */
  logout(): void {
    this.member.logout();
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }

  scrollTo(sectionId: string): void {
    this.closeMobileMenu();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  openPopup(type: string): void {
    this.closeMobileMenu();
    switch (type) {
      case 'experiencias':
        this.popupService.openPrograms();
        break;
      case 'about':
        this.popupService.openAboutLita();
        break;
      case 'contacto':
        this.popupService.openContact();
        break;
      case 'login':
        this.popupService.openLogin();
        break;
    }
  }
}
