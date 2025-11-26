import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, output, signal } from '@angular/core';
import { fromEvent, Subscription, throttleTime } from 'rxjs';

@Component({
  selector: 'app-layout-slider',
  imports: [],
  templateUrl: './layout-slider.html',
  styleUrl: './layout-slider.scss',
})
export class LayoutSlider implements AfterViewInit, OnDestroy {
  @ViewChild('container', { read: ElementRef }) container!: ElementRef<HTMLElement>;
  private subs = new Subscription();
  private scrollAmount = 300;

  change = output<any>();
  canScrollRight = signal(false);
  canScrollLeft = signal(false);

  scrollLeft() {
    this.container.nativeElement.scrollBy({ left: -this.scrollAmount, behavior: 'smooth' });
    this.updateScrollButtons();
  }

  scrollRight() {
    this.container.nativeElement.scrollBy({ left: this.scrollAmount, behavior: 'smooth' });
    this.updateScrollButtons();
  }

  ngAfterViewInit(): void {
    // Avoid running DOM measurements on the server (SSR)
    if (typeof window === 'undefined') return;

    // initial state
    this.updateScrollButtons();

    // update on user scroll (throttled) and on window resize
    const el = this.container.nativeElement;
    this.subs.add(fromEvent(el, 'scroll').pipe(throttleTime(100)).subscribe(() => this.updateScrollButtons()));
    this.subs.add(fromEvent(window, 'resize').pipe(throttleTime(200)).subscribe(() => this.updateScrollButtons()));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private updateScrollButtons() {
    const el = this.container?.nativeElement;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    // allow a small tolerance to avoid floating point issues
    const tolerance = 10;
    this.canScrollLeft.set(scrollLeft > tolerance);
    this.canScrollRight.set((scrollLeft + clientWidth) < (scrollWidth - tolerance));

    this.change.emit({ canScrollRight: this.canScrollRight(), canScrollLeft: this.canScrollLeft() });
  }
}
