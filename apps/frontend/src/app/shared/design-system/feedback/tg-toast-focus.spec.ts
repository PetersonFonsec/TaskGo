import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgToastRegionComponent } from './tg-toast-region.component';
import { TgToast } from './tg-toast.service';

@Component({
  imports: [TgToastRegionComponent],
  template: '<main>Conteúdo</main>@if (region()) { <tg-toast-region /> }',
})
class FocusHost { readonly region = signal(true); }

describe('TgToast: propriedade e limpeza do tabindex de fallback', () => {
  let fixture: ComponentFixture<FocusHost>;
  let main: HTMLElement;
  let restoreOutside: () => void;
  const focusElsewhere = () => {
    const next = document.createElement('button');
    next.textContent = 'Próximo';
    fixture.nativeElement.append(next);
    next.focus();
    return next;
  };
  const fallback = () => {
    TestBed.inject(TgToast).show('Mensagem');
    fixture.detectChanges();
    const close = fixture.nativeElement.querySelector('.tg-toast__close') as HTMLButtonElement;
    close.focus(); close.click(); fixture.detectChanges();
    expect(document.activeElement).toBe(main);
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(FocusHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    main = fixture.nativeElement.querySelector('main');
    // Os links do runner não são controles da página testada.
    const outside = Array.from(document.body.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== fixture.nativeElement)
      .map((el) => ({ el, inert: el.inert }));
    outside.forEach(({ el }) => el.inert = true);
    restoreOutside = () => outside.forEach(({ el, inert }) => el.inert = inert);
  });
  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
    restoreOutside();
  });

  it('main sem tabindex mantém o foco e só remove o atributo depois do blur', () => {
    fallback();
    expect(main.getAttribute('tabindex')).toBe('-1');
    const next = focusElsewhere();
    expect(document.activeElement).toBe(next);
    expect(main.hasAttribute('tabindex')).toBeFalse();
  });

  for (const tabindex of ['-1', '0']) {
    it(`preserva tabindex preexistente ${tabindex}`, () => {
      main.setAttribute('tabindex', tabindex);
      fallback(); focusElsewhere();
      expect(main.getAttribute('tabindex')).toBe(tabindex);
    });
  }

  for (const nextValue of ['0', '-1', null]) {
    it(`não desfaz alteração externa de tabindex para ${nextValue}`, () => {
      fallback();
      if (nextValue === null) main.removeAttribute('tabindex');
      else main.setAttribute('tabindex', nextValue);
      focusElsewhere();
      expect(main.getAttribute('tabindex')).toBe(nextValue);
    });
  }

  it('limpa elemento removido antes da destruição, sem mover o foco', () => {
    fallback(); main.remove();
    const next = focusElsewhere();
    fixture.componentInstance.region.set(false); fixture.detectChanges();
    expect(main.hasAttribute('tabindex')).toBeFalse();
    expect(document.activeElement).toBe(next);
  });

  it('destruição com main focado preserva o foco e adia a limpeza até blur', () => {
    fallback();
    fixture.componentInstance.region.set(false); fixture.detectChanges();
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
    const next = focusElsewhere();
    expect(main.hasAttribute('tabindex')).toBeFalse();
    expect(document.activeElement).toBe(next);
  });

  for (const destroyFirst of [false, true]) {
    it(`limpa remoção sem blur entregue, região já destruída=${destroyFirst}`, async () => {
      // Simula a ausência do evento no destino removido.
      main.addEventListener('blur', (event) => event.stopImmediatePropagation(), { capture: true, once: true });
      fallback();
      if (destroyFirst) {
        fixture.componentInstance.region.set(false); fixture.detectChanges();
        expect(document.activeElement).toBe(main);
      }
      main.remove();
      await Promise.resolve();
      expect(main.hasAttribute('tabindex')).toBeFalse();
      const next = focusElsewhere();
      expect(document.activeElement).toBe(next);
      fixture.nativeElement.prepend(main);
      expect(main.hasAttribute('tabindex')).toBeFalse();
    });
  }

  it('mudança externa após destruição também é preservada', async () => {
    fallback();
    fixture.componentInstance.region.set(false); fixture.detectChanges();
    main.setAttribute('tabindex', '0');
    await Promise.resolve();
    focusElsewhere();
    expect(main.getAttribute('tabindex')).toBe('0');
  });

  it('sem foco no toast não acrescenta tabindex nem rouba foco', () => {
    const outside = focusElsewhere();
    TestBed.inject(TgToast).show('Mensagem'); fixture.detectChanges();
    (fixture.nativeElement.querySelector('.tg-toast__close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(outside);
    expect(main.hasAttribute('tabindex')).toBeFalse();
  });
});
