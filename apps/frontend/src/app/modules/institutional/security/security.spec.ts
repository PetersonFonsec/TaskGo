import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Security } from './security';

describe('Security', () => {
  it('mostra o título do documento e avisa que o texto ainda não foi publicado', async () => {
    await TestBed.configureTestingModule({ imports: [Security], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(Security);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Segurança');
    expect(el.querySelector('tg-empty-state')?.textContent).toContain('Texto ainda não publicado');
  });
});
