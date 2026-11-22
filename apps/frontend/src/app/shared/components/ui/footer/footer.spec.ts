import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { Footer } from './footer';

describe('Footer', () => {
  it('mostra a marca TaskGo e oculta os links institucionais até os textos serem aprovados', async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('TaskGo');
    expect(el.textContent).not.toContain('Proxi');
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([]);
    // Razão social e CNPJ só com fonte confirmada; nenhum dado legal fixo no rodapé.
    expect(el.querySelector('.footer__legal')?.textContent?.trim()).toMatch(
      /^© \d{4} TaskGo\. Todos os direitos reservados\.$/,
    );
    expect(el.textContent).not.toMatch(/CNPJ|S\.A\.|Ltda/);
  });
});
