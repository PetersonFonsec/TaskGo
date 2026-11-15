import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { accessibleName } from '../button/accessible-name';
import { TgToastRegionComponent } from './tg-toast-region.component';
import { TgToast } from './tg-toast.service';

@Component({
  imports: [TgToastRegionComponent],
  template: `<button id="salvar">Salvar</button><tg-toast-region />`,
})
class HostComponent {}

describe('TgToast e tg-toast-region', () => {
  let fixture: ComponentFixture<HostComponent>;
  let toast: TgToast;
  const $ = <T extends HTMLElement>(selector: string) => fixture.nativeElement.querySelector(selector) as T | null;
  const box = () => $('.tg-toast');
  const live = () => $('.tg-toast-region__live') as HTMLElement;
  const tick = (ms: number) => {
    jasmine.clock().tick(ms);
    fixture.detectChanges();
  };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 15));
    fixture = TestBed.createComponent(HostComponent);
    toast = TestBed.inject(TgToast);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => {
    toast.dismiss();
    fixture.detectChanges();
    fixture.destroy();
    fixture.nativeElement.remove();
    jasmine.clock().uninstall();
  });

  it('a região viva existe antes do toast e recebe só a mensagem', () => {
    expect(live().getAttribute('role')).toBe('status');
    expect(live().getAttribute('aria-live')).toBe('polite');
    expect(live().textContent?.trim()).toBe('');
    toast.show('Endereço salvo.', { action: 'Desfazer' });
    fixture.detectChanges();
    expect(live().textContent?.trim()).toBe('Endereço salvo.');
    expect(box()?.textContent).toContain('Endereço salvo.');
    expect(box()?.hasAttribute('role')).toBeFalse();
  });

  it('a mesma mensagem duas vezes é anunciada de novo (nó novo)', () => {
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    const first = live().querySelector('span');
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    expect(live().querySelector('span')).not.toBe(first);
    expect(live().querySelectorAll('span').length).toBe(1);
  });

  it('não rouba o foco', () => {
    $<HTMLButtonElement>('#salvar')?.focus();
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    expect(document.activeElement).toBe($('#salvar'));
  });

  it('some em 6 s; com ação, em 10 s; nunca menos de 6 s', () => {
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    tick(5999);
    expect(box()).not.toBeNull();
    tick(1);
    expect(box()).toBeNull();

    toast.show('Pedido cancelado.', { action: 'Desfazer' });
    fixture.detectChanges();
    tick(9999);
    expect(box()).not.toBeNull();
    tick(1);
    expect(box()).toBeNull();

    toast.show('Rápido demais.', { duration: 1000 });
    fixture.detectChanges();
    tick(5999);
    expect(box()).not.toBeNull();
  });

  it('pausa com o mouse em cima e retoma o que faltava', () => {
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    tick(4000);
    box()?.dispatchEvent(new MouseEvent('mouseenter'));
    tick(20000);
    expect(box()).not.toBeNull();
    box()?.dispatchEvent(new MouseEvent('mouseleave'));
    tick(1999);
    expect(box()).not.toBeNull();
    tick(1);
    expect(box()).toBeNull();
  });

  it('pausa com o foco dentro; Esc fecha e o foco volta para onde estava', () => {
    const salvar = $<HTMLButtonElement>('#salvar') as HTMLButtonElement;
    salvar.focus();
    toast.show('Pedido cancelado.', { action: 'Desfazer' });
    fixture.detectChanges();
    const action = box()?.querySelector('.tg-toast__action') as HTMLButtonElement;
    action.focus();
    tick(30000);
    expect(box()).not.toBeNull();
    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(box()).toBeNull();
    expect(document.activeElement).toBe(salvar);
  });

  it('a ação chama a tela e fecha', () => {
    const undo = jasmine.createSpy('desfazer');
    toast.show('Pedido cancelado.', { action: 'Desfazer', onAction: undo });
    fixture.detectChanges();
    const action = box()?.querySelector('.tg-toast__action') as HTMLButtonElement;
    expect(action.type).toBe('button');
    action.click();
    fixture.detectChanges();
    expect(undo).toHaveBeenCalledTimes(1);
    expect(box()).toBeNull();
  });

  it('fechar: botão de 44 px com nome', () => {
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    const close = box()?.querySelector('.tg-toast__close') as HTMLButtonElement;
    expect(accessibleName(close)).toBe('Fechar notificação');
    expect(close.getBoundingClientRect().height).toBe(44);
    close.click();
    fixture.detectChanges();
    expect(box()).toBeNull();
  });

  it('um por vez: o novo substitui e ganha o tempo dele', () => {
    const first = toast.show('Endereço salvo.');
    fixture.detectChanges();
    tick(5000);
    toast.show('Serviço salvo.', { tone: 'info' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.tg-toast').length).toBe(1);
    expect(box()?.classList).toContain('tg-toast--info');
    first.dismiss();
    fixture.detectChanges();
    expect(box()?.textContent).toContain('Serviço salvo.');
    tick(5999);
    expect(box()).not.toBeNull();
    tick(1);
    expect(box()).toBeNull();
  });

  it('depois de sumir com o mouse em cima, o próximo ainda some sozinho', () => {
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    box()?.dispatchEvent(new MouseEvent('mouseenter'));
    toast.dismiss();
    fixture.detectChanges();
    toast.show('Serviço salvo.');
    fixture.detectChanges();
    tick(6000);
    expect(box()).toBeNull();
  });

  it('cores e posição: superfície, borda e embaixo; acima da barra de abas quando ela existe', () => {
    toast.show('Endereço salvo.');
    fixture.detectChanges();
    const region = $('.tg-toast-region') as HTMLElement;
    const el = box() as HTMLElement;
    el.style.animation = 'none';
    expect(getComputedStyle(region).position).toBe('fixed');
    expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(480);
    const bottom = window.innerHeight - el.getBoundingClientRect().bottom;
    expect(Math.round(bottom)).toBe(16);

    const nav = document.createElement('nav');
    nav.className = 'tg-nav';
    document.body.appendChild(nav);
    try {
      const lifted = window.innerHeight - el.getBoundingClientRect().bottom;
      expect(Math.round(lifted)).toBe(window.innerWidth < 1024 ? 72 + 16 : 16);
    } finally {
      nav.remove();
    }
  });
});

describe('TgToast no servidor', () => {
  it('não agenda tempo nenhum', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const spy = spyOn(window, 'setTimeout').and.callThrough();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.inject(TgToast).show('Endereço salvo.');
    fixture.detectChanges();
    expect(spy.calls.all().some((c) => c.args[1] === 6000)).toBeFalse();
    fixture.destroy();
  });
});

describe('LiveAnnouncer com o CSS global', () => {
  it('o elemento do anunciador fica invisível, mas não display:none', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    await announcer.announce('Endereço salvo.');
    const el = document.querySelector('.cdk-live-announcer-element') as HTMLElement;
    expect(el).not.toBeNull();
    const style = getComputedStyle(el);
    expect(style.display).not.toBe('none');
    expect(style.visibility).not.toBe('hidden');
    expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    expect(el.textContent).toContain('Endereço salvo.');
  });
});
