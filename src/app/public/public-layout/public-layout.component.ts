import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from '../components/header/header.component';
import { FooterComponent } from '../components/footer/footer.component';

/**
 * Marco del sitio público (Experiencias Lita Donoso). Header fijo/transparente
 * + contenido + footer, con el diseño portado desde el sitio original.
 *
 * El header es `position: fixed` y transparente: en la home el hero ocupa toda
 * la pantalla por debajo. En el resto de páginas (membresías, eventos, etc.) se
 * agrega un offset superior para que el contenido no quede tapado por el header.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <app-header />
    <main class="public-content" [class.public-content--offset]="!isHome()">
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`
    /* overflow-x: hidden contiene el sitio público en móvil (evita scroll
       horizontal por elementos a 100vw/videos). Scoped al layout público: no
       afecta el admin ni los overlays. */
    :host { display: block; min-height: 100vh; background: var(--color-bg); overflow-x: hidden; }
    .public-content--offset { padding-top: 88px; }
    @media (max-width: 768px) { .public-content--offset { padding-top: 70px; } }
  `],
})
export class PublicLayoutComponent {
  private router = inject(Router);
  isHome = signal(this.computeIsHome(this.router.url));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.isHome.set(this.computeIsHome(e.urlAfterRedirects)));
  }

  private computeIsHome(url: string): boolean {
    const path = (url.split('?')[0] || '').replace(/\/+$/, '');
    return path === '' || path === '/';
  }
}
