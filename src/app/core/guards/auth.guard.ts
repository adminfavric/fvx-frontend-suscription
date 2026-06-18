import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasToken()) {
    return true;
  }

  // Guarda la URL que intentaba abrir; el login la lee como `returnUrl` y
  // navega allí tras autenticarse (en lugar del default `/`).
  const returnUrl = state.url && state.url !== '/login' ? state.url : null;
  router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : {});
  return false;
};

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) {
    return true;
  }

  router.navigate(['/admin']);
  return false;
};
