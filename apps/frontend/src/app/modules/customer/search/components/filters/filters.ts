import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

@Component({
  selector: 'app-filters',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './filters.html',
  styleUrl: './filters.scss',
})
export class Filters {

}
