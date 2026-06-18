import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MemberAuthService } from './member-auth.service';

/** Protege las rutas del área de miembros: sin sesión → al login de acceso. */
export const memberGuard: CanActivateFn = () => {
  const member = inject(MemberAuthService);
  const router = inject(Router);
  return member.isLoggedIn() ? true : router.createUrlTree(['/acceso']);
};
