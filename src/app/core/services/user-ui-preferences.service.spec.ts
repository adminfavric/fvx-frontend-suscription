import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoService } from '@jsverse/transloco';

import { UserUiPreferencesService } from './user-ui-preferences.service';
import { ThemeService } from './theme.service';
import { PageContentWidthService } from './page-content-width.service';
import { APP_CONFIG } from '../config/app-config.token';

/**
 * Unit tests de la lógica de FAVORITOS del servicio (la que tocamos esta sesión).
 *
 * No ejercita el guardado al backend: `hasSession()` es false en test (sin
 * cookie) y el debounce (450ms) no transcurre, así que ningún PATCH se dispara.
 * Las deps (theme/width/transloco) se stubean — solo se usan al construir el
 * payload de guardado, que aquí nunca corre.
 */
describe('UserUiPreferencesService — favorites', () => {
  let service: UserUiPreferencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserUiPreferencesService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ThemeService, useValue: { currentId: () => 'tmp-dark' } },
        { provide: PageContentWidthService, useValue: { currentMode: () => 'compact' } },
        { provide: TranslocoService, useValue: { getActiveLang: () => 'es' } },
        { provide: APP_CONFIG, useValue: { apiUrl: 'http://test/api/v1' } as never },
      ],
    });
    service = TestBed.inject(UserUiPreferencesService);
  });

  it('starts with no favorites', () => {
    expect(service.favoriteMenuItems()).toEqual([]);
    expect(service.canAddMoreFavorites()).toBeTrue();
  });

  it('toggleFavorite adds then removes (idempotent toggle)', () => {
    service.toggleFavorite('menu-users');
    expect(service.favoriteMenuItems()).toEqual(['menu-users']);
    expect(service.isFavorite('menu-users')).toBeTrue();

    service.toggleFavorite('menu-users');
    expect(service.favoriteMenuItems()).toEqual([]);
    expect(service.isFavorite('menu-users')).toBeFalse();
  });

  it('accumulates distinct favorites in insertion order', () => {
    service.toggleFavorite('a');
    service.toggleFavorite('b');
    service.toggleFavorite('c');
    expect(service.favoriteMenuItems()).toEqual(['a', 'b', 'c']);
  });

  it('ignores an empty slug', () => {
    service.toggleFavorite('');
    expect(service.favoriteMenuItems()).toEqual([]);
  });

  it('enforces the maximum number of favorites', () => {
    const max = service.maxFavorites;
    for (let i = 0; i < max; i++) {
      service.toggleFavorite(`item-${i}`);
    }
    expect(service.favoriteMenuItems().length).toBe(max);
    expect(service.canAddMoreFavorites()).toBeFalse();

    service.toggleFavorite('one-too-many');
    expect(service.favoriteMenuItems().length).toBe(max);
    expect(service.isFavorite('one-too-many')).toBeFalse();
  });

  it('reorderFavorites applies a valid permutation', () => {
    service.toggleFavorite('a');
    service.toggleFavorite('b');
    service.toggleFavorite('c');
    service.reorderFavorites(['c', 'a', 'b']);
    expect(service.favoriteMenuItems()).toEqual(['c', 'a', 'b']);
  });

  it('reorderFavorites is a no-op when the set does not match (anti-injection)', () => {
    service.toggleFavorite('a');
    service.toggleFavorite('b');
    service.toggleFavorite('c');

    // Falta un elemento → longitudes no cuadran → no cambia.
    service.reorderFavorites(['a', 'b']);
    expect(service.favoriteMenuItems()).toEqual(['a', 'b', 'c']);

    // Slug foráneo que rompe el largo → no cambia (no se inyecta el favorito).
    service.reorderFavorites(['a', 'b', 'intruder']);
    expect(service.favoriteMenuItems()).toEqual(['a', 'b', 'c']);
  });
});
