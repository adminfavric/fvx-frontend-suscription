import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CommandPaletteService } from './core/commands/command-palette.service';
import { SessionTimeoutService } from './core/services/session-timeout.service';
import { EntityDrawerComponent } from './shared/components/entity-drawer/entity-drawer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, EntityDrawerComponent],
  template: `
    <router-outlet></router-outlet>
    <app-entity-drawer></app-entity-drawer>
  `,
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private sessionTimeout = inject(SessionTimeoutService);
  private commandPalette = inject(CommandPaletteService);

  ngOnInit(): void {
    this.sessionTimeout.init();
    this.commandPalette.init();
    if (this.auth.hasToken()) {
      this.auth.loadCurrentUser();
    }
  }
}
