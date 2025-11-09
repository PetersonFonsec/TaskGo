import { AfterViewInit, Component, contentChildren, Directive, ElementRef, inject, input, Renderer2 } from '@angular/core';

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

  perpage = input(1);
  gap = input(0);

  ngAfterViewInit(): void {
    const width = this.slider.nativeElement.getBoundingClientRect().width;

    this.itens().forEach(sliderItem => {
      const perpage = (width / this.perpage()) - this.gap();
      sliderItem.updateWidth(`${Math.ceil(perpage)}px`);
    });
  }
}
