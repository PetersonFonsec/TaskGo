import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgEmptyStateComponent, TgEmptyStateLevel } from './tg-empty-state.component';

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

function token(name: string, property = 'color') {
  const probe = document.createElement('span');
  probe.style.setProperty(property, `var(${name})`);
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return value;
}

@Component({
  imports: [TgEmptyStateComponent, TgButtonComponent],
  template: `
    <div style="width: 560px">
      <tg-empty-state id="grande" icon="receipt" title="Você ainda não fez nenhum pedido">
        Encontre um profissional e agende em poucos passos.
        <button tgButton tgEmptyAction id="acao">Buscar profissionais</button>
      </tg-empty-state>
      <tg-empty-state id="compacto" compact icon="calendar-blank" title="Sua agenda está livre" [level]="level()">
        Quando você contratar um serviço, ele aparece aqui.
      </tg-empty-state>
      <tg-empty-state id="completo" title="Página não encontrada" [level]="1" illustrationSrc="/ilustracao.webp" illustrationAlt="">
        <p>Confira o endereço e tente novamente.</p>
        <button tgButton tgEmptyAction id="principal">Ir para o início</button>
        <button tgButton tgEmptySecondaryAction id="secundaria" appearance="outline">Voltar</button>
      </tg-empty-state>
      <tg-empty-state id="so-titulo" title="Nada por aqui" />
    </div>
  `,
})
class Host {
  readonly level = signal<TgEmptyStateLevel>(3);
}

describe('TgEmptyStateComponent', () => {
  let fixture: ComponentFixture<Host>;
  const $ = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const box = (el: Element) => el.getBoundingClientRect();

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('título como heading (h2 por padrão), texto e ação no slot', () => {
    const title = $('#grande h2');
    expect(title.textContent?.trim()).toBe('Você ainda não fez nenhum pedido');
    expect($('#grande .tg-empty-state__text').textContent?.trim()).toBe('Encontre um profissional e agende em poucos passos.');
    expect($('#grande .tg-empty-state__action #acao')).not.toBeNull();
    expect($('#grande .tg-empty-state__text #acao')).toBeNull();
  });

  it('nível do heading configurável; fora de 2 a 6 volta para h2 (a tabela completa está no spec de layout)', () => {
    expect($('#compacto h3')).not.toBeNull();
    fixture.componentInstance.level.set(5);
    fixture.detectChanges();
    expect($('#compacto h5')).not.toBeNull();
    fixture.componentInstance.level.set(9 as TgEmptyStateLevel);
    fixture.detectChanges();
    expect($('#compacto h2')).not.toBeNull();
  });

  it('aceita h1, ilustração acessível e duas ações', () => {
    expect($('#completo h1')?.textContent?.trim()).toBe('Página não encontrada');
    expect($('#completo img')?.getAttribute('src')).toBe('/ilustracao.webp');
    expect($('#completo img')?.getAttribute('alt')).toBe('');
    expect($('#completo .tg-empty-state__action #principal')).not.toBeNull();
    expect($('#completo .tg-empty-state__action #secundaria')).not.toBeNull();
  });

  it('é conteúdo comum: sem role e ícone decorativo', () => {
    for (const id of ['grande', 'compacto', 'so-titulo']) expect($(`#${id}`).hasAttribute('role')).toBeFalse();
    expect($('#grande tg-icon svg').getAttribute('aria-hidden')).toBe('true');
    expect(document.activeElement).not.toBe($('#acao'));
  });

  it('grande: centralizado, círculo de 72 px, texto até 360 px, 40 px de respiro', () => {
    const host = $('#grande .tg-empty-state__box');
    const style = getComputedStyle(host);
    expect(style.textAlign).toBe('center');
    expect(style.paddingTop).toBe('40px');
    expect(style.paddingBottom).toBe('40px');
    const icon = $('#grande .tg-empty-state__icon');
    expect(box(icon).width).toBe(72);
    expect(box(icon).height).toBe(72);
    expect(Math.round(box(icon).left + 36)).toBe(Math.round(box(host).left + box(host).width / 2));
    expect(box($('#grande .tg-empty-state__body')).width).toBeLessThanOrEqual(360);
  });

  it('compacto: em linha, borda tracejada, círculo de 44 px e ação à direita', () => {
    const host = $('#compacto .tg-empty-state__box');
    expect(getComputedStyle(host).flexDirection).toBe('row');
    expect(getComputedStyle(host).borderTopStyle).toBe('dashed');
    expect(getComputedStyle(host).textAlign).toBe('start');
    expect(box($('#compacto .tg-empty-state__icon')).width).toBe(44);
  });

  it('sem ícone, texto ou ação: só o título, sem espaços vazios', () => {
    const host = $('#so-titulo');
    expect(host.querySelector('.tg-empty-state__icon')).toBeNull();
    expect(getComputedStyle(host.querySelector('.tg-empty-state__text') as HTMLElement).display).toBe('none');
    expect(getComputedStyle(host.querySelector('.tg-empty-state__action') as HTMLElement).display).toBe('none');
  });

  it('cores dos tokens nos dois modos', () => {
    for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
      const restore = pinTheme(theme);
      try {
        const icon = $('#grande .tg-empty-state__icon');
        expect(getComputedStyle(icon).backgroundColor).toBe(token('--tg-action-subtle', 'background-color'));
        expect(getComputedStyle(icon).color).toBe(token('--tg-action-subtle-text'));
        expect(getComputedStyle($('#grande .tg-empty-state__title')).color).toBe(token('--tg-text-primary'));
        expect(getComputedStyle($('#grande .tg-empty-state__text')).color).toBe(token('--tg-text-secondary'));
        expect(getComputedStyle($('#compacto .tg-empty-state__box')).borderTopColor).toBe(token('--tg-border-default'));
        expect(getComputedStyle($('#compacto .tg-empty-state__box')).backgroundColor).toBe(token('--tg-bg-surface', 'background-color'));
      } finally {
        restore();
      }
    }
  });
});
