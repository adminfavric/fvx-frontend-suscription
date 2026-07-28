import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** Marca visible de cara al cliente (pestaña del navegador). */
export const BRAND_TITLE = 'Experiencias Lita Donoso';

/**
 * Título de pestaña por página: «Página · Experiencias Lita Donoso», usando el
 * `title` declarado en cada ruta (app.routes.ts). Sin título → solo la marca.
 * Reemplaza el título "quemado" de proyecto (FVX) que venía del backend.
 */
@Injectable({ providedIn: 'root' })
export class BrandTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${BRAND_TITLE}` : BRAND_TITLE);
  }
}
