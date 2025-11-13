import { Component } from '@angular/core';
import { CardDetail } from '@shared/components/ui/card-detail/card-detail';
import { Filters } from '@shared/components/forms/filters/filters';

@Component({
  selector: 'app-search',
  imports: [CardDetail, Filters],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {

}
