import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CardDetail } from '@shared/components/ui/card-detail/card-detail';
import { Provider } from '@shared/service/provider/provider';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [CardDetail, RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit {
  #router = inject(ActivatedRoute);
  #provider = inject(Provider);
  providers = signal<any>([]);

  ngOnInit(): void {
    this.#router.queryParams.pipe(
      switchMap(({ categoria }) =>
        this.#provider.findProvidersByCategorySlug(categoria)
      )
    ).subscribe({
      next: (params: any) => {
        this.providers.set(params)
        console.log(params)
      }
    });
  }
}
