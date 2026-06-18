import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MemberContentItem } from '../services/member-auth.service';

/** Visor modal de una pieza de la biblioteca (reproduce/​muestra según el tipo). */
@Component({
  selector: 'app-content-viewer-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatIconModule],
  template: `
    <div class="viewer">
      <button class="close" (click)="ref.close()" aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      <div class="media">
        @switch (item.kind) {
          @case ('video') { <video controls autoplay preload="metadata" [src]="item.file_url"></video> }
          @case ('audio') { <div class="audio-wrap"><mat-icon>graphic_eq</mat-icon><audio controls autoplay [src]="item.file_url"></audio></div> }
          @case ('image') { <img [src]="item.file_url" [alt]="item.title" /> }
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
    .media video, .media img { width:100%; max-height:70vh; display:block; }
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
export class ContentViewerDialogComponent {
  constructor(
    public ref: MatDialogRef<ContentViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public item: MemberContentItem,
  ) {}
}
