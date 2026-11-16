import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UrlBase } from '@shared/enums/base-url.enum';

export interface FooterLink {
  readonly label: string;
  readonly link: string;
}

/** Só rotas que existem em InstitutionalRoutes. */
export const FOOTER_LINKS: readonly FooterLink[] = [
  { label: 'Quem somos', link: `/${UrlBase.INSTITUTIONAL}/about` },
  { label: 'Perguntas frequentes', link: `/${UrlBase.INSTITUTIONAL}/faq` },
  { label: 'Ajuda', link: `/${UrlBase.INSTITUTIONAL}/support` },
];

/** Rodapé do shell logado no Design System: marca, links institucionais e direitos. */
@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly links = FOOTER_LINKS;
  protected readonly year = new Date().getFullYear();
}
