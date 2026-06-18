import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  user,
} from '@angular/fire/auth';

/**
 * Autenticación de MIEMBROS (zona pública) con Firebase Auth.
 *
 * Es independiente del `AuthService` del scaffold (que usa JWT/Django para el
 * panel /admin). Aquí los usuarios finales se registran e inician sesión con
 * correo y contraseña en el proyecto Firebase `gen-suscription`.
 */
@Injectable({ providedIn: 'root' })
export class MemberAuthService {
  private auth = inject(Auth);

  /** Usuario actual como signal (null si no hay sesión). Se actualiza solo. */
  readonly currentUser = signal<User | null>(null);

  constructor() {
    // Mantiene el signal sincronizado con el estado de Firebase Auth.
    user(this.auth).subscribe(u => this.currentUser.set(u));
  }

  get isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  /** Registra un nuevo miembro con correo/contraseña y nombre visible. */
  async register(email: string, password: string, displayName?: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  }

  /** Inicia sesión de un miembro existente. */
  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return cred.user;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
