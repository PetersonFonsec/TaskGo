import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { Card } from '@shared/components/forms/card/card';

const categoriesList = [
  'Limpeza',
  'Reparo',
  'Automotivo',
  'Beleza e Cuidados',
  'Cuidados Pessoais',
  'Educação e Aulas Particulares',
  'Pets',
  'Eventos e lazer',
  'Transportes e Mudanças',
  'Tecnologia e Informática',
];

@Component({
  selector: 'app-category',
  imports: [ButtonComponent, ButtonBackComponent, Card],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  categories = signal<string[]>(categoriesList);
  categorySelected = signal<string | null>(null);
  #router = inject(Router);

  selectCategory() {
    if(!this.categorySelected()) return;
    this.#router.navigate(['authenticate','category', this.categorySelected(), 'service']);
  }
}
