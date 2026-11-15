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
    if (!fixture.componentRef.hostView.destroyed) {
      fixture.detectChanges();
      fixture.destroy();
    }
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

  it('substituir uma ação focada e removida retoma a duração integral', () => {
    toast.show('Primeiro', { action: 'Desfazer' });
    fixture.detectChanges();
    $('.tg-toast__action')!.focus();
    toast.show('Segundo');
    fixture.detectChanges();
    tick(5999);
    expect(box()).not.toBeNull();
    tick(1);
    expect(box()).toBeNull();
  });

  it('reconcilia foco obsoleto quando focusout não chega à região', () => {
    toast.show('Primeiro', { action: 'Desfazer' });
    fixture.detectChanges();
    $('.tg-toast__action')!.focus();
    box()!.addEventListener('focusout', (event) => event.stopImmediatePropagation(), true);
    $('#salvar')!.focus();
    toast.show('Segundo');
    fixture.detectChanges();
    tick(6000);
    expect(box()).toBeNull();
  });

  for (const unavailable of ['removed', 'disabled', 'hidden', 'inert', 'display', 'visibility', 'fieldset', 'closed-dialog', 'aria-hidden']) {
    it(`fechar ignora origem indisponível: ${unavailable}`, () => {
      const origin = document.createElement('button');
      const parent = document.createElement(unavailable === 'closed-dialog' ? 'dialog' : unavailable === 'fieldset' ? 'fieldset' : 'div');
      if (unavailable === 'closed-dialog') parent.setAttribute('open', '');
      parent.append(origin);
      fixture.nativeElement.prepend(parent);
      origin.focus();
      toast.show('Mensagem');
      fixture.detectChanges();
      const close = $('.tg-toast__close')!;
      close.focus();
      switch (unavailable) {
        case 'closed-dialog': parent.removeAttribute('open'); break;
        case 'aria-hidden': parent.setAttribute('aria-hidden', 'true'); break;
        case 'removed': origin.remove(); break;
        case 'disabled': origin.disabled = true; break;
        case 'hidden': parent.hidden = true; break;
        case 'inert': parent.inert = true; break;
        case 'display': parent.style.display = 'none'; break;
        case 'visibility': parent.style.visibility = 'hidden'; break;
        case 'fieldset': (parent as HTMLFieldSetElement).disabled = true; break;
      }
      const focusOrigin = spyOn(origin, 'focus').and.callThrough();
      close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(box()).toBeNull();
      expect(document.activeElement).toBe($('#salvar'));
      expect(focusOrigin).not.toHaveBeenCalled();
    });
  }

  it('relatedTarget null usa o controle da página e botão fecha sem roubar foco externo', () => {
    toast.show('Mensagem');
    fixture.detectChanges();
    $('.tg-toast__close')!.focus();
    $('.tg-toast__close')!.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe($('#salvar'));
    toast.show('Outra');
    fixture.detectChanges();
    $('#salvar')!.focus();
    $('.tg-toast__close')!.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe($('#salvar'));
  });

  it('fallback permanece no diálogo modal ativo', () => {
    const modal = document.createElement('dialog');
    const button = document.createElement('button');
    modal.append(button);
    document.body.append(modal);
    modal.showModal();
    ($('#salvar') as HTMLButtonElement).disabled = true;
    try {
      toast.show('Mensagem');
      fixture.detectChanges();
      // O toast fica no top layer deste diálogo neste cenário de integração.
      modal.append(fixture.nativeElement);
      $('.tg-toast__close')!.focus();
      box()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      $('.tg-toast__close')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }));
      $('.tg-toast__close')!.click();
      fixture.detectChanges();
      expect(document.activeElement).toBe(button);
    } finally {
      document.body.append(fixture.nativeElement);
      modal.close();
      modal.remove();
    }
  });

  for (const control of ['action', 'close']) {
    it(`mantém pausa se o foco permanece no botão ${control} reutilizado`, () => {
      $('#salvar')!.focus();
      toast.show('Primeiro', { action: 'Desfazer' });
      fixture.detectChanges();
      const focused = $(`.tg-toast__${control}`)!;
      focused.focus();
      tick(2000);
      toast.show('Segundo', { action: 'Continuar' });
      fixture.detectChanges();
      expect(document.activeElement).toBe(focused);
      tick(30000);
      expect(box()).not.toBeNull();
      $('#salvar')!.focus();
      tick(9999);
      expect(box()).not.toBeNull();
      tick(1);
      expect(box()).toBeNull();
    });
  }

  it('hover real preservado pausa a substituição, sair retoma sua duração integral', () => {
    toast.show('Primeiro');
    fixture.detectChanges();
    tick(5000);
    // Eventos sintéticos não alteram :hover do navegador.
    const matches = spyOn(box()!, 'matches').and.returnValue(true);
    box()!.dispatchEvent(new MouseEvent('mouseenter'));
    toast.show('Segundo');
    fixture.detectChanges();
    tick(30000);
    expect(box()).not.toBeNull();
    matches.and.returnValue(false);
    box()!.dispatchEvent(new MouseEvent('mouseleave'));
    tick(2000);
    $('.tg-toast__close')!.focus();
    tick(30000);
    $('#salvar')!.focus();
    tick(3999);
    expect(box()).not.toBeNull();
    tick(1);
    expect(box()).toBeNull();
  });

  it('descarta hover obsoleto quando a caixa não está mais sob o ponteiro', () => {
    toast.show('Primeiro');
    fixture.detectChanges();
    box()!.dispatchEvent(new MouseEvent('mouseenter'));
    spyOn(box()!, 'matches').and.returnValue(false);
    toast.show('Segundo');
    fixture.detectChanges();
    tick(6000);
    expect(box()).toBeNull();
  });

  it('substituições repetidas cancelam timers, referência e callback antigos não fecham o novo', () => {
    const schedule = jasmine.createSpy('setTimeout').and.callFake(window.setTimeout);
    window.setTimeout = Object.assign(schedule, window.setTimeout);
    const cancel = jasmine.createSpy('clearTimeout').and.callFake(window.clearTimeout);
    window.clearTimeout = cancel;
    const old = toast.show('Primeiro');
    fixture.detectChanges();
    const timers = () => schedule.calls.all().filter((call) => call.args[1] === 6000);
    const callback = timers()[0].args[0] as () => void;
    const firstTimer = timers()[0].returnValue;
    for (let i = 0; i < 5; i++) {
      tick(1000);
      toast.show(`Novo ${i}`);
      fixture.detectChanges();
    }
    expect(timers().length).toBe(6);
    expect(cancel).toHaveBeenCalledWith(firstTimer);
    old.dismiss();
    callback();
    fixture.detectChanges();
    expect(box()?.textContent).toContain('Novo 4');
    tick(5999);
    expect(box()).not.toBeNull();
    tick(1);
    expect(box()).toBeNull();
  });

  it('não duplica timer em eventos repetidos nem deixa timer após destruir a região', () => {
    const schedule = jasmine.createSpy('setTimeout').and.callFake(window.setTimeout);
    window.setTimeout = Object.assign(schedule, window.setTimeout);
    const cancel = jasmine.createSpy('clearTimeout').and.callFake(window.clearTimeout);
    window.clearTimeout = cancel;
    toast.show('Mensagem');
    fixture.detectChanges();
    box()!.dispatchEvent(new MouseEvent('mouseleave'));
    box()!.dispatchEvent(new MouseEvent('mouseleave'));
    const timers = schedule.calls.all().filter((call) => call.args[1] === 6000);
    expect(timers.length).toBe(1);
    fixture.destroy();
    expect(cancel).toHaveBeenCalledWith(timers[0].returnValue);
    jasmine.clock().tick(6000);
    expect(toast.current()?.message).toBe('Mensagem');
  });

  it('uma ação que mostra novo toast não o fecha com a referência antiga', () => {
    toast.show('Primeiro', { action: 'Desfazer', onAction: () => toast.show('Segundo') });
    fixture.detectChanges();
    $('.tg-toast__action')!.click();
    fixture.detectChanges();
    expect(box()?.textContent).toContain('Segundo');
    tick(6000);
    expect(box()).toBeNull();
  });

  it('fallback sem controles usa main sem adicionar parada na navegação', () => {
    $('#salvar')!.remove();
    const outside = Array.from(document.body.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== fixture.nativeElement)
      .map((el) => ({ el, inert: el.inert }));
    outside.forEach(({ el }) => el.inert = true);
    try {
      const main = document.createElement('main');
      main.textContent = 'Conteúdo';
      fixture.nativeElement.prepend(main);
      toast.show('Mensagem');
      fixture.detectChanges();
      $('.tg-toast__close')!.focus();
      expect(document.activeElement).toBe($('.tg-toast__close'));
      expect(main.getClientRects().length).toBeGreaterThan(0);
      const focusMain = spyOn(main, 'focus').and.callThrough();
      $('.tg-toast__close')!.click();
      expect(focusMain).toHaveBeenCalled();
      fixture.detectChanges();
      expect(document.activeElement).toBe(main);
      expect(main.getAttribute('tabindex')).toBe('-1');
    } finally {
      outside.forEach(({ el, inert }) => el.inert = inert);
    }
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
