import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { AuthService } from '../services/auth.service';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';

/**
 * Servicio del shell que gestiona la apertura del Command Palette y el atajo
 * global ``Cmd/Ctrl+K``. `init()` se llama una vez (desde `AppComponent`); el
 * listener escucha todo el documento, pero `open()` rechaza si el usuario no
 * está autenticado (los comandos asumen sesión).
 */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  private ref?: MatDialogRef<CommandPaletteComponent>;
  private installed = false;

  init(): void {
    if (this.installed) return;
    this.installed = true;
    document.addEventListener('keydown', this.onKey, { capture: true });
  }

  destroy(): void {
    if (!this.installed) return;
    this.installed = false;
    document.removeEventListener('keydown', this.onKey, { capture: true });
    this.ref?.close();
  }

  open(): void {
    if (this.ref) return;
    if (!this.auth.hasToken()) return; // sin sesión, sin paleta
    this.ref = this.dialog.open(CommandPaletteComponent, {
      width: '640px',
      maxWidth: '92vw',
      panelClass: 'command-palette-dialog',
      autoFocus: false,
      restoreFocus: true,
      // Sin backdrop oscuro pesado — palette flota como spotlight.
      backdropClass: 'command-palette-backdrop',
    });
    this.ref.afterClosed().subscribe(() => {
      this.ref = undefined;
    });
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    // Cmd+K (macOS) o Ctrl+K (Linux/Windows). Sin Alt ni Shift para no chocar.
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        event.stopPropagation();
        if (this.ref) {
          this.ref.close();
        } else {
          this.open();
        }
      }
    }
  };
}
