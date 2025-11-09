import { Component } from '@angular/core';

import { CardThumb } from '@shared/components/ui/card-thumb/card-thumb/card-thumb';
import { Slider, SliderItemDirective } from '@shared/components/ui/slider/slider';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { Card } from '@shared/components/ui/card/card/card';

@Component({
  selector: 'app-home',
  imports: [CardThumb, Card, Slider, SliderItemDirective, ButtonComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
