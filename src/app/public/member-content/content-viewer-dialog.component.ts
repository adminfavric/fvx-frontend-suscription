import { ChangeDetectionStrategy, Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MemberAuthService, MemberContentItem } from '../services/member-auth.service';

/** Visor modal de una pieza de la biblioteca (reproduce/​muestra según el tipo). */
@Component({
  selector: 'app-content-viewer-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatIconModule],
  template: `
    <div class="viewer">
      <button class="close" (click)="ref.close()" aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      <div class="media" (contextmenu)="block($event)">
        @switch (item.kind) {
          @case ('video') {
            @if (embedUrl()) {
              <iframe class="embed" [src]="embedUrl()" title="{{ item.title }}"
                      frameborder="0" allow="autoplay; fullscreen; picture-in-picture"
                      allowfullscreen></iframe>
            } @else {
              <video controls autoplay preload="metadata" [src]="mediaUrl()"
                     controlsList="nodownload noremoteplayback noplaybackrate"
                     disablePictureInPicture disableRemotePlayback
                     (contextmenu)="block($event)"></video>
            }
          }
          @case ('audio') {
            <div class="audio-wrap"><mat-icon>graphic_eq</mat-icon>
              <audio controls autoplay [src]="mediaUrl()"
                     controlsList="nodownload noremoteplayback noplaybackrate"
                     (contextmenu)="block($event)"></audio>
            </div>
          }
          @case ('image') { <img [src]="mediaUrl()" [alt]="item.title" draggable="false" (contextmenu)="block($event)" /> }
          @default { <div class="text"><p>{{ item.text }}</p></div> }
        }
      </div>
      <div class="meta">
        <h2>{{ item.title }}</h2>
        @if (item.text && item.kind !== 'text') { <p>{{ item.text }}</p> }
      </div>
    </div>
  `,
  styles: [`
    .viewer { position: relative; background:#15101f; color:#fff; border-radius:14px; overflow:hidden; max-width:880px; }
    .close { position:absolute; top:10px; right:10px; z-index:2; background:rgba(0,0,0,.45); border:none; color:#fff; width:38px; height:38px; border-radius:50%; cursor:pointer; display:grid; place-items:center; }
    .media { background:#000; display:flex; align-items:center; justify-content:center; }
    /* Video: ocupa el ancho (suele ser horizontal). */
    .media video { width:100%; max-height:80vh; display:block; }
    /* Embed (YouTube/Vimeo): iframe 16:9 responsivo. */
    .media .embed { width:100%; aspect-ratio:16/9; max-height:80vh; display:block; border:0; }
    /* Imagen: se muestra COMPLETA en su proporción real (vertical u horizontal),
       acotada por ancho y alto; se centra con barras negras si sobra espacio.
       Antes width:100% deformaba/recortaba los posters verticales. */
    .media img { max-width:100%; max-height:82vh; width:auto; height:auto; display:block; margin:0 auto; object-fit:contain; }
    .audio-wrap { padding:40px; display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; }
    .audio-wrap mat-icon { font-size:56px; width:56px; height:56px; color:#d9a441; }
    .audio-wrap audio { width:100%; max-width:520px; }
    .text { padding:32px; background:#fff; color:#2a2333; max-height:70vh; overflow:auto; width:100%; }
    .text p { white-space:pre-line; line-height:1.7; margin:0; }
    .meta { padding:18px 22px; }
    .meta h2 { margin:0 0 6px; font-size:1.2rem; }
    .meta p { margin:0; color:#cbc4dd; font-size:.9rem; line-height:1.5; }
  `],
})
export class ContentViewerDialogComponent implements OnInit {
  private auth = inject(MemberAuthService);
  private sanitizer = inject(DomSanitizer);

  /** URL efectiva del archivo: parte vacía y se rellena con una URL FIRMADA de
   * vida corta pedida al backend. La URL permanente nunca llega al cliente; en
   * dev/local el backend devuelve la URL directa (no hay nada que firmar). */
  readonly mediaUrl = signal<string>('');

  /** Si la URL es de YouTube/Vimeo, devuelve la URL de EMBED (sanitizada) para
   * mostrarla en un iframe; si es un archivo directo (MP4), devuelve null y se
   * usa el reproductor nativo <video>. */
  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const u = this.mediaUrl();
    if (!u) return null;
    const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${yt[1]}`);
    const vim = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vim) return this.sanitizer.bypassSecurityTrustResourceUrl(`https://player.vimeo.com/video/${vim[1]}`);
    return null;
  });

  constructor(
    public ref: MatDialogRef<ContentViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public item: MemberContentItem,
  ) {}

  async ngOnInit(): Promise<void> {
    // Solo los tipos con archivo servido necesitan URL firmada.
    if (!['video', 'audio', 'image'].includes(this.item.kind)) return;
    try {
      this.mediaUrl.set(await this.auth.getMediaUrl(this.item.id));
    } catch {
      // Sin conexión / sin acceso: se queda vacío (no hay URL permanente que usar).
      this.mediaUrl.set('');
    }
  }

  /** Bloquea el menú contextual (clic derecho → "Guardar video como…"). */
  block(event: Event): boolean {
    event.preventDefault();
    return false;
  }
}
