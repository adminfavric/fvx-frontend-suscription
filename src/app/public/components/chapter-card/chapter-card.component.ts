import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChapterCardDialogComponent } from './chapter-card-dialog.component';

@Component({
  selector: 'app-chapter-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chapter-card.component.html',
  styleUrl: './chapter-card.component.scss'
})
export class ChapterCardComponent {
  @Input() image: string = '';
  @Input() title: string = '';
  @Input() body: string = '';
  @Input() buttonText: string = 'Ver más';
  @Input() chapterNumber?: number;

  private dialog = inject(MatDialog);

  get truncatedBody(): string {
    if (this.body.length <= 100) {
      return this.body;
    }
    return this.body.substring(0, 100).trim() + '...';
  }

  openDetails(): void {
    this.dialog.open(ChapterCardDialogComponent, {
      data: {
        image: this.image,
        title: this.title,
        body: this.body,
        chapterNumber: this.chapterNumber
      },
      width: '90vw',
      maxWidth: '600px',
      panelClass: 'chapter-dialog-panel'
    });
  }
}
