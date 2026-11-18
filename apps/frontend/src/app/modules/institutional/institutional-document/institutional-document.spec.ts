import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { InstitutionalSection } from '../institutional-pages';
import { InstitutionalDocument } from './institutional-document';

const section = (id: string, title: string, ...blocks: InstitutionalSection['blocks']): InstitutionalSection => ({
  id,
  title,
  blocks,
});

describe('InstitutionalDocument', () => {
  let fixture: ComponentFixture<InstitutionalDocument>;
  let el: HTMLElement;

  async function render(sections: readonly InstitutionalSection[], lead = 'Linha de apoio') {
    fixture.componentRef.setInput('heading', 'Termos de uso');
    fixture.componentRef.setInput('lead', lead);
    fixture.componentRef.setInput('sections', sections);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionalDocument],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(InstitutionalDocument);
    el = fixture.nativeElement;
  });

  afterEach(() => el.remove());

  it('sem seções, mostra um h1 e o estado vazio, sem sumário', async () => {
    await render([]);
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('.doc__lead')?.textContent).toContain('Linha de apoio');
    expect(el.querySelector('tg-empty-state h2')?.textContent).toContain('Texto ainda não publicado');
    expect(el.querySelector('.doc__toc')).toBeNull();
  });

  it('sem linha de apoio, não deixa um parágrafo vazio', async () => {
    await render([], '');
    expect(el.querySelector('.doc__lead')).toBeNull();
  });

  it('renderiza o texto como veio: cada seção é um h2 com âncora, com parágrafos e listas', async () => {
    await render([
      section('uso', '1. Uso', 'Primeiro parágrafo.', { items: ['Item a', 'Item b'] }),
      section('conta', '2. Conta', 'Segundo parágrafo.'),
    ]);
    const headings = Array.from(el.querySelectorAll<HTMLElement>('.doc__section h2'));
    expect(headings.map((h) => [h.id, h.textContent?.trim()])).toEqual([
      ['uso', '1. Uso'],
      ['conta', '2. Conta'],
    ]);
    expect(Array.from(el.querySelectorAll('.doc__paragraph')).map((p) => p.textContent)).toEqual([
      'Primeiro parágrafo.',
      'Segundo parágrafo.',
    ]);
    expect(Array.from(el.querySelectorAll('.doc__list li')).map((li) => li.textContent)).toEqual(['Item a', 'Item b']);
    expect(el.querySelector('tg-empty-state')).toBeNull();
  });

  it('com menos de três seções, não mostra o sumário', async () => {
    await render([section('a', 'A', 'x'), section('b', 'B', 'y')]);
    expect(el.querySelector('.doc__toc')).toBeNull();
  });

  it('a partir de três seções, mostra o sumário com um link para cada âncora', async () => {
    await render([section('a', 'A', 'x'), section('b', 'B', 'y'), section('c', 'C', 'z')]);
    const toc = el.querySelector('nav.doc__toc');
    expect(toc?.querySelector('h2')?.textContent).toContain('Nesta página');
    const links = Array.from(toc?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/#a', '/#b', '/#c']);
  });

  it('o link do sumário leva o foco ao título da seção, sem trocar a rota', async () => {
    document.body.appendChild(el);
    await render([section('a', 'A', 'x'), section('b', 'B', 'y'), section('c', 'C', 'z')]);
    const link = el.querySelectorAll<HTMLAnchorElement>('.doc__toc a')[2];
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(el.querySelector('#c'));
  });
});
