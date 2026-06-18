import { Directive, ElementRef, HostListener, OnInit, Optional } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

@Directive({
  selector: '[appTruncateTooltip]',
  standalone: true
})
export class TruncateTooltipDirective implements OnInit {
  
  constructor(
    private elementRef: ElementRef,
    @Optional() private tooltip: MatTooltip
  ) {}

  ngOnInit(): void {
    // Initially disable tooltip if it exists
    if (this.tooltip) {
      this.tooltip.disabled = true;
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.tooltip) return;
    
    const element = this.elementRef.nativeElement;
    // Check if content is truncated
    const isTruncated = element.scrollWidth > element.clientWidth;
    this.tooltip.disabled = !isTruncated;
  }
}
