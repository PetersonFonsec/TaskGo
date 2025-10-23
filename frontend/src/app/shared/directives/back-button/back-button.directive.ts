import { Directive, HostListener, inject } from '@angular/core';
import { Location } from '@angular/common';

@Directive({
  selector: '[BackButton]',
  standalone: true
})
export class BackButtonDirective {
  location = inject(Location);

  @HostListener('click')
  onClick() {
    this.location.back();
  }
}
