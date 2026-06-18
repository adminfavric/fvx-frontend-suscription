/**
 * Helpers de diálogos CRUD extraídos de `BaseCrudComponent`: el dimensionado
 * mobile/desktop (que se repetía idéntico en el form y el relationship dialog) y
 * la derivación del nombre visible de una entidad. Puros y testeables; la
 * apertura real (`dialog.open(...)` + subscripciones) se queda en el componente.
 */
import type { MatDialogConfig } from '@angular/material/dialog';

/** Umbral mobile (coincide con el resto de la plantilla). */
const MOBILE_MAX_WIDTH = 768;

export function isMobileViewport(): boolean {
  return window.innerWidth <= MOBILE_MAX_WIDTH;
}

/**
 * Opciones de tamaño/posición de un diálogo CRUD según viewport: a pantalla
 * completa en mobile (`fullscreen-dialog`), centrado con ancho fijo en desktop.
 * `desktopWidth`/`desktopMaxHeight` varían por diálogo (form 650px/90vh,
 * relationship 550px/85vh).
 */
export function crudDialogSizing(
  desktopWidth: string,
  desktopMaxHeight = '90vh',
): Pick<MatDialogConfig, 'width' | 'maxWidth' | 'height' | 'maxHeight' | 'panelClass'> {
  const mobile = isMobileViewport();
  return {
    width: mobile ? '100vw' : desktopWidth,
    maxWidth: mobile ? '100vw' : '90vw',
    height: mobile ? '100vh' : 'auto',
    maxHeight: mobile ? '100vh' : desktopMaxHeight,
    // `fvx-crud-dialog` (desktop): la clase va al `.cdk-overlay-pane` y permite
    // centrarlo de forma fiable con `margin:auto` (ver styles.scss), sin
    // depender del `align-items` del wrapper global del overlay.
    panelClass: mobile ? 'fullscreen-dialog' : 'fvx-crud-dialog',
  };
}

/**
 * Nombre visible de una entidad para títulos de diálogo/drawer: prueba campos
 * comunes en orden de preferencia y cae a `#id`.
 */
export function entityDisplayName(entity: { id: number | string } & Record<string, unknown>): string {
  const e = entity as Record<string, unknown> & { id: number | string };
  const firstName = typeof e['first_name'] === 'string' ? e['first_name'] : '';
  const lastName = typeof e['last_name'] === 'string' ? e['last_name'] : '';
  const composed = firstName ? `${firstName} ${lastName}`.trim() : '';
  return (
    (e['name'] as string) ||
    (e['full_name'] as string) ||
    composed ||
    (e['username'] as string) ||
    `#${e.id}`
  );
}
