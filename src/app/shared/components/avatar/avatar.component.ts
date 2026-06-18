import { Component, Input, OnInit, ElementRef } from '@angular/core';

import { AvatarUtil } from '../../utils/avatar.util';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [],
  template: `
    <div class="avatar-container">
      @if (showImage) {
        <img [src]="imageUrl"
             [alt]="name"
             class="avatar-img"
             referrerpolicy="no-referrer"
             (error)="onImageError()">
      } @else {
        <div class="avatar-initials"
             [style.background-color]="backgroundColor"
             [style.font-size.px]="fontSize">
          {{ initials }}
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: var(--avatar-size, 80px);
      height: var(--avatar-size, 80px);
      flex-shrink: 0;
    }

    .avatar-container {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      overflow: hidden;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-initials {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
      user-select: none;
    }
  `]
})
export class AvatarComponent implements OnInit {
  @Input() name = '';
  @Input() imageUrl?: string | null;
  @Input() size = 80;

  imageError = false;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.elementRef.nativeElement.style.setProperty('--avatar-size', `${this.size}px`);
  }

  onImageError(): void {
    this.imageError = true;
  }

  get showImage(): boolean {
    return !!this.imageUrl && !this.imageError;
  }

  get initials(): string {
    return AvatarUtil.getInitials(this.name);
  }

  get backgroundColor(): string {
    return AvatarUtil.getColorFromString(this.name);
  }

  get fontSize(): number {
    return this.size * 0.4;
  }
}
