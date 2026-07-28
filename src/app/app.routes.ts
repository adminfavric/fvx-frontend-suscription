import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';
import { menuAccessGuard } from './core/guards/menu-access.guard';
import { memberGuard } from './public/services/member.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { PublicLayoutComponent } from './public/public-layout/public-layout.component';
import { LoginComponent } from './core/auth/login/login.component';
import { FILE_UPLOAD_PROVIDER } from './shared/components/file-uploader/providers/file-upload-provider';
import { DjangoUploadProvider } from './shared/components/file-uploader/providers/django-upload.provider';
import { environment } from '../environments/environment';

export const routes: Routes = [
  {
    path: 'login',
        title: 'Iniciar sesión',
    component: LoginComponent,
    canActivate: [loginGuard],
  },

  // Sala Zoom en vivo (embebida). Fuera del layout público: el SDK ocupa toda
  // la pantalla. Requiere sesión de miembro; el backend valida plan + horario.
  {
    path: 'sala/:id',
        title: 'Sala en vivo',
    canActivate: [memberGuard],
    loadComponent: () =>
      import('./public/zoom-room/zoom-room.component').then(m => m.ZoomRoomComponent),
  },

  // ── Administración (scaffold) — movido a /admin para liberar la raíz al sitio público ──
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [menuAccessGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        title: 'Panel',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'plans',
        title: 'Planes',
        loadComponent: () => import('./features/plans/plans.component').then(m => m.PlansComponent),
      },
      {
        path: 'customers',
        title: 'Clientes',
        loadComponent: () =>
          import('./features/customers/customers.component').then(m => m.CustomersComponent),
      },
      {
        path: 'subscriptions',
        title: 'Suscripciones',
        loadComponent: () =>
          import('./features/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent),
      },
      {
        path: 'content',
        title: 'Contenido',
        loadComponent: () =>
          import('./features/content/content.component').then(m => m.ContentComponent),
      },
      {
        path: 'programacion',
        title: 'Programación',
        loadComponent: () =>
          import('./features/programacion/programacion.component').then(m => m.ProgramacionComponent),
      },
      {
        path: 'links-pago',
        title: 'Links de pago',
        loadComponent: () =>
          import('./features/payment-links/payment-links.component').then(
            m => m.PaymentLinksComponent,
          ),
      },
      {
        path: 'events',
        title: 'Eventos',
        loadComponent: () =>
          import('./features/events/events.component').then(m => m.AdminEventsComponent),
      },
      {
        path: 'messages',
        title: 'Mensajes',
        loadComponent: () =>
          import('./features/messages/messages.component').then(m => m.MessagesComponent),
      },
      {
        path: 'correos',
        title: 'Correos masivos',
        loadComponent: () =>
          import('./features/broadcast/broadcast.component').then(m => m.BroadcastComponent),
      },
      {
        path: 'acceso-cortesia',
        title: 'Accesos de cortesía',
        loadComponent: () =>
          import('./features/comp-access/comp-access.component').then(m => m.CompAccessComponent),
      },
      {
        path: 'usuarios',
        title: 'Usuarios',
        loadComponent: () =>
          import('./features/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'historial-correos',
        title: 'Historial de correos',
        loadComponent: () =>
          import('./features/email-history/email-history.component').then(
            m => m.EmailHistoryComponent,
          ),
      },
      // Showcase de componentes: SOLO en dev. En producción no se registra la
      // ruta (ni se importa el chunk), así las 12 demos no viajan al bundle prod.
      ...(environment.production
        ? []
        : [
            {
              path: 'components',
              loadComponent: () =>
                import('./features/components-showcase/components-showcase.component').then(
                  m => m.ComponentsShowcaseComponent,
                ),
              providers: [
                { provide: FILE_UPLOAD_PROVIDER, useClass: DjangoUploadProvider },
              ],
            },
          ]),
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./features/errors/forbidden.component').then(m => m.ForbiddenComponent),
      },
      {
        path: 'not-found',
        loadComponent: () =>
          import('./features/errors/not-found.component').then(m => m.NotFoundComponent),
      },
      {
        path: 'server-error',
        loadComponent: () =>
          import('./features/errors/server-error.component').then(m => m.ServerErrorComponent),
      },
    ],
  },

  // ── Sitio público (membresías Lita Donoso) — raíz, sin auth ──
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./public/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'membresias',
        title: 'Membresías',
        loadComponent: () =>
          import('./public/memberships/memberships.component').then(m => m.MembershipsComponent),
      },
      {
        path: 'membresias/:slug',
        title: 'Membresía',
        loadComponent: () =>
          import('./public/checkout/checkout.component').then(m => m.CheckoutComponent),
      },
      {
        path: 'avance',
        title: 'Avance',
        loadComponent: () =>
          import('./public/upcoming/upcoming.component').then(m => m.UpcomingComponent),
      },
      {
        path: 'eventos',
        title: 'Eventos',
        loadComponent: () => import('./public/events/events.component').then(m => m.EventsComponent),
      },
      {
        path: 'viajes',
        title: 'Viajes',
        loadComponent: () => import('./public/travel/travel.component').then(m => m.TravelComponent),
      },
      {
        path: 'noticias',
        title: 'Noticias',
        loadComponent: () => import('./public/news/news.component').then(m => m.NewsComponent),
      },
      {
        path: 'maria-magdalena',
        title: 'María Magdalena',
        loadComponent: () =>
          import('./public/maria-magdalena/maria-magdalena.component').then(
            m => m.MariaMagdalenaComponent,
          ),
      },
      {
        path: 'acceso',
        title: 'Acceso miembros',
        loadComponent: () =>
          import('./public/member-login/member-login.component').then(m => m.MemberLoginComponent),
      },
      {
        path: 'mi-contenido',
        title: 'Mi contenido',
        canActivate: [memberGuard],
        loadComponent: () =>
          import('./public/member-content/member-content.component').then(m => m.MemberContentComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
