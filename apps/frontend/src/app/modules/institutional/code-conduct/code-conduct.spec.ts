import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CodeConduct } from './code-conduct';

describe('CodeConduct', () => {
  it('mostra o título do documento e avisa que o texto ainda não foi publicado', async () => {
    await TestBed.configureTestingModule({ imports: [CodeConduct], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(CodeConduct);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Código de conduta');
    expect(el.querySelector('tg-empty-state')?.textContent).toContain('Texto ainda não publicado');
  });
});
