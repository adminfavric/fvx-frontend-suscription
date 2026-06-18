import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OverlayRef } from '@angular/cdk/overlay';

function getOverlayRef(ref: MatDialogRef<unknown>): OverlayRef | null {
  const internal = ref as unknown as { _ref?: { overlayRef?: OverlayRef } };
  return internal._ref?.overlayRef ?? null;
}

/**
 * Hace arrastrables todos los `MatDialog` desde la cabecera (título / ``content-dialog``),
 * con indicador ⋯; botones y enlaces del header no inician arrastre.
 */
@Injectable({ providedIn: 'root' })
export class MatDialogDragService {
  private readonly matDialog = inject(MatDialog);
  private initialized = false;

  /**
   * Activa el arrastre en todos los diálogos. Idempotente.
   *
   * Se llama EXPLÍCITAMENTE desde `app.config.ts` (no en el constructor) porque
   * el optimizador de producción puede tree-shakear un `inject(MatDialogDragService)`
   * cuyo resultado se descarta (lo marca como "puro"), dejando el servicio sin
   * instanciar → ningún diálogo recibiría el handle/estilos. Una llamada a método
   * sobre la instancia NO se elimina, garantizando el arranque en prod.
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.matDialog.afterOpened.subscribe((ref) => this.register(ref));
  }

  private register(ref: MatDialogRef<unknown>): void {
    ref.afterOpened().subscribe(() => {
      // La clase declarativa dispara TODOS los estilos del handle. Se agrega
      // SIEMPRE y primero, con la API pública (`addPanelClass`), antes de tocar
      // internals de Material — así el diálogo se ve correcto aunque el acceso al
      // overlayRef interno falle en prod (cambios de versión / minificación).
      ref.addPanelClass('fvx-dialog-draggable');

      // Ubicar el pane: primero por la API interna; si no, por DOM (la clase
      // recién añadida lo identifica). Robusto en producción.
      const draggablePanes =
        document.querySelectorAll<HTMLElement>('.cdk-overlay-pane.fvx-dialog-draggable');
      const pane =
        getOverlayRef(ref)?.overlayElement ??
        draggablePanes[draggablePanes.length - 1] ??
        null;
      if (!pane) return;

      /** Arrastrar el contenedor interno para no pisar el ``translateY(-15vh)`` del pane en tema global. */
      const moveTarget =
        (pane.querySelector('.mat-mdc-dialog-container') as HTMLElement | null) ?? pane;

      const dragTarget = this.resolveDragHandle(pane);
      if (!dragTarget) return;

      dragTarget.classList.add('fvx-dialog-drag-handle');

      dragTarget.style.cursor = 'grab';
      dragTarget.style.touchAction = 'none';

      let offsetX = 0;
      let offsetY = 0;
      let dragging = false;
      let startPointerX = 0;
      let startPointerY = 0;
      let startOffsetX = 0;
      let startOffsetY = 0;

      const applyTransform = () => {
        moveTarget.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        offsetX = startOffsetX + (e.clientX - startPointerX);
        offsetY = startOffsetY + (e.clientY - startPointerY);
        applyTransform();
      };

      const endDrag = () => {
        pane.classList.remove('fvx-dialog-dragging');
        if (!dragging) return;
        dragging = false;
        dragTarget.style.cursor = 'grab';
        document.body.style.removeProperty('cursor');
        dragTarget.style.removeProperty('user-select');
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', endDrag);
        document.removeEventListener('pointercancel', endDrag);
      };

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (
          target.closest(
            'button, a, input, textarea, select, [mat-dialog-close], [matDialogClose]',
          )
        ) {
          return;
        }
        dragging = true;
        pane.classList.add('fvx-dialog-dragging');
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        startOffsetX = offsetX;
        startOffsetY = offsetY;
        dragTarget.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
        dragTarget.style.userSelect = 'none';
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', endDrag);
        document.addEventListener('pointercancel', endDrag);
        e.preventDefault();
      };

      const onDragStart = (e: Event) => e.preventDefault();

      dragTarget.addEventListener('pointerdown', onPointerDown);
      dragTarget.addEventListener('dragstart', onDragStart);

      ref.afterClosed().subscribe(() => {
        dragTarget.removeEventListener('pointerdown', onPointerDown);
        dragTarget.removeEventListener('dragstart', onDragStart);
        endDrag();
        moveTarget.style.removeProperty('transform');
        dragTarget.classList.remove('fvx-dialog-drag-handle');
        ref.removePanelClass('fvx-dialog-draggable');
      });
    });
  }

  /**
   * Asegura el indicador ⋯ en la cabecera y devuelve **toda** la cabecera como zona de arrastre.
   */
  private resolveDragHandle(pane: HTMLElement): HTMLElement | null {
    const header = this.findDialogHeader(pane);
    if (!header) return null;

    if (!header.querySelector('.fvx-dialog-drag-grip')) {
      const grip = document.createElement('span');
      grip.className = 'fvx-dialog-drag-grip';
      grip.setAttribute('aria-hidden', 'true');
      const dots = '<span class="fvx-dialog-drag-grip__dot"></span>'.repeat(3);
      grip.innerHTML = `<span class="fvx-dialog-drag-grip__track">${dots}</span>`;
      header.insertBefore(grip, header.firstChild);
    }

    return header;
  }

  private findDialogHeader(pane: HTMLElement): HTMLElement | null {
    const selectors = [
      '[mat-dialog-title]',
      '[matDialogTitle]',
      '.mat-mdc-dialog-title',
      '.content-dialog__header',
      '.fv__header',
    ];
    for (const sel of selectors) {
      const el = pane.querySelector(sel);
      if (el) return el as HTMLElement;
    }
    return null;
  }
}
