import { AfterViewInit, Component, contentChildren, Directive, ElementRef, inject, input, Renderer2, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  standalone: true,
  selector: '[slide-item]'
})
export class SliderItemDirective implements AfterViewInit {
  private renderer = inject(Renderer2);
  item = inject(ElementRef);

  ngAfterViewInit() {
    this.renderer.setStyle(this.item.nativeElement, 'scroll-snap-align', 'start');
  }

  updateWidth(width: string) {
    this.renderer.setStyle(this.item.nativeElement, 'flex', '0 0 ' + width);
  }
}

@Component({
  selector: 'app-slider',
  imports: [],
  templateUrl: './slider.html',
  styleUrl: './slider.scss',
})
export class Slider implements AfterViewInit {
  itens = contentChildren(SliderItemDirective);
  slider = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  perpage = input(1);
  gap = input(0);

  ngAfterViewInit(): void {
    // Avoid DOM measurements on the server (SSR) where `window`/`document` aren't available.
    if (!isPlatformBrowser(this.platformId)) {
      // Server-side: skip sizing. The client will re-run sizing after hydration if needed.
      return;
    }

    const width = this.slider.nativeElement.getBoundingClientRect().width;

    this.itens().forEach(sliderItem => {
      const perpage = (width / this.perpage()) - (this.gap() / 1.5);
      sliderItem.updateWidth(`${Math.ceil(perpage)}px`);
    });
  }
}
