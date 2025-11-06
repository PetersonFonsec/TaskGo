import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { InputCheckboxComponent } from '@shared/components/forms/input-checkbox/input-checkbox.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

const servicesList =  [
  'Limpeza Residencial',
  'Limpeza Comercial',
  'Reparo Elétrico',
  'Reparo Hidráulico',
  'Reparo de Eletrodomésticos',
  'Mecânica Automotiva',
]
@Component({
  selector: 'app-services',
  imports: [ButtonComponent, ButtonBackComponent, InputCheckboxComponent],
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class Services {
  services = signal<string[]>(servicesList);
  serviceSelected = signal<string | null>(null);
  #router = inject(Router);

  addServiceSelected(){
    if (!this.serviceSelected()) return;    
    this.#router.navigate(['authenticate','register']);
  }
}
