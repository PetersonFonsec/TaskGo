import { UrlBase } from '@shared/enums/base-url.enum';

/** Um parágrafo ou uma lista de itens dentro de uma seção. */
export type InstitutionalBlock = string | { readonly items: readonly string[] };

/** Uma seção de um documento institucional: vira um h2 com âncora. */
export interface InstitutionalSection {
  /** Âncora da seção (sem `#`), única no documento. */
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly InstitutionalBlock[];
}

export interface InstitutionalPageLink {
  readonly label: string;
  readonly path: string;
}

/** Os quatro documentos, na ordem da navegação entre eles. */
export const INSTITUTIONAL_PAGES: readonly InstitutionalPageLink[] = [
  { label: 'Termos de uso', path: 'terms' },
  { label: 'Privacidade', path: 'privacy' },
  { label: 'Segurança', path: 'security' },
  { label: 'Código de conduta', path: 'code-of-conduct' },
];

export const institutionalLink = (path: string) => `/${UrlBase.INSTITUTIONAL}/${path}`;

/** A partir de quantas seções o documento mostra o sumário "Nesta página". */
export const TOC_MIN_SECTIONS = 3;
