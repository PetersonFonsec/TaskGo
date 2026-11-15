import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgButtonComponent } from '../button/tg-button.component';
import { accessibleName, idRefs } from '../button/accessible-name';
import { TgDialogComponent } from './tg-dialog.component';
import { TgSheetComponent } from './tg-sheet.component';

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER') {
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
  imports: [TgDialogComponent, TgSheetComponent, TgButtonComponent],
  template: `
    <button id="abrir-dialogo" (click)="recusar.open()">Recusar</button>
    <button id="abrir-painel" (click)="filtros.open()">Filtros</button>

    <tg-dialog
      #recusar
      id="dialogo"
      title="Recusar este pedido?"
      icon="warning-circle"
      tone="danger"
      [busy]="busy()"
      (opened)="events.push('aberto')"
      (closed)="events.push('fechado')"
    >
      <p>Ana Souza recebe o aviso e pode pedir a outro profissional.</p>
      <button tgButton tgDialogAction id="voltar" appearance="outline" (click)="recusar.close()">Voltar</button>
      <button tgButton tgDialogAction id="recusar" tone="danger" [loading]="busy()">Recusar pedido</button>
    </tg-dialog>

    <tg-sheet #filtros id="painel" title="Filtros" [busy]="busy()" (closed)="events.push('painel fechado')">
      <div id="conteudo" style="height: 2000px">Categoria</div>
      <button tgButton tgSheetAction appearance="outline">Limpar</button>
      <button tgButton tgSheetAction id="aplicar" (click)="filtros.close()">Aplicar filtros</button>
    </tg-sheet>
  `,
})
class HostComponent {
  readonly busy = signal(false);
  events: string[] = [];
}

describe('TgDialogComponent e TgSheetComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let restoreTheme: () => void;
  let dialogCmp: TgDialogComponent;
  let sheetCmp: TgSheetComponent;

  const $ = <T extends HTMLElement>(selector: string) => fixture.nativeElement.querySelector(selector) as T;
  const dialog = () => $<HTMLDialogElement>('#dialogo dialog');
  const sheet = () => $<HTMLDialogElement>('#painel dialog');
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const escape = (target: Element) => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  /** Clique no fundo: no próprio dialog, num ponto fora da caixa. */
  const clickBackdrop = (el: HTMLDialogElement) =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));
  const openDialog = async () => {
    $<HTMLButtonElement>('#abrir-dialogo').focus();
    $<HTMLButtonElement>('#abrir-dialogo').click();
    await render();
  };
  const openSheet = async () => {
    $<HTMLButtonElement>('#abrir-painel').focus();
    $<HTMLButtonElement>('#abrir-painel').click();
    await render();
  };

  beforeEach(() => (restoreTheme = pinTheme()));
  afterEach(() => restoreTheme());

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await render();
    dialogCmp = fixture.debugElement.query((d) => d.componentInstance instanceof TgDialogComponent).componentInstance;
    sheetCmp = fixture.debugElement.query((d) => d.componentInstance instanceof TgSheetComponent).componentInstance;
  });
  afterEach(() => {
    dialogCmp.close();
    sheetCmp.close();
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  describe('diálogo', () => {
    it('fechado: não aparece', () => {
      expect(dialog().open).toBeFalse();
      expect(getComputedStyle(dialog()).display).toBe('none');
    });

    it('abre modal, com nome e descrição', async () => {
      await openDialog();
      expect(dialog().open).toBeTrue();
      expect(dialog().matches(':modal')).toBeTrue();
      expect(accessibleName(dialog())).toBe('Recusar este pedido?');
      const description = idRefs(dialog().getAttribute('aria-describedby'))
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .join(' ');
      expect(description).toBe('Ana Souza recebe o aviso e pode pedir a outro profissional.');
      expect(host.events).toEqual(['aberto']);
      expect(dialogCmp.isOpen()).toBeTrue();
    });

    it('o foco vai para a ação segura, que vem primeiro', async () => {
      await openDialog();
      expect(document.activeElement).toBe($('#voltar'));
      const actions = Array.from(dialog().querySelectorAll('[tgDialogAction]'), (el) => el.id);
      expect(actions).toEqual(['voltar', 'recusar']);
    });

    it('Esc fecha e devolve o foco a quem abriu', async () => {
      await openDialog();
      const event = escape($('#voltar'));
      await render();
      expect(event.defaultPrevented).toBeTrue();
      expect(dialog().open).toBeFalse();
      expect(document.activeElement).toBe($('#abrir-dialogo'));
      expect(host.events).toEqual(['aberto', 'fechado']);
    });

    it('cancel nativo também passa pela mesma regra', async () => {
      await openDialog();
      const cancel = new Event('cancel', { cancelable: true });
      dialog().dispatchEvent(cancel);
      await render();
      expect(cancel.defaultPrevented).toBeTrue();
      expect(dialog().open).toBeFalse();
    });

    it('toque no fundo fecha; clique dentro da caixa não', async () => {
      await openDialog();
      const box = dialog().getBoundingClientRect();
      dialog().dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: box.left + 10, clientY: box.top + 10 }));
      await render();
      expect(dialog().open).toBeTrue();
      $<HTMLElement>('#dialogo p').click();
      await render();
      expect(dialog().open).toBeTrue();
      clickBackdrop(dialog());
      await render();
      expect(dialog().open).toBeFalse();
    });

    it('enviando: Esc e fundo não fecham, o foco fica; por código fecha', async () => {
      await openDialog();
      $<HTMLButtonElement>('#recusar').focus();
      host.busy.set(true);
      await render();
      expect(dialog().getAttribute('aria-busy')).toBe('true');
      escape($('#recusar'));
      escape($('#recusar'));
      clickBackdrop(dialog());
      await render();
      expect(dialog().open).toBeTrue();
      expect(document.activeElement).toBe($('#recusar'));
      expect($('#recusar').getAttribute('aria-disabled')).toBe('true');

      dialogCmp.close();
      await render();
      expect(dialog().open).toBeFalse();
      expect(document.activeElement).toBe($('#abrir-dialogo'));
    });

    it('a ação da tela fecha', async () => {
      await openDialog();
      $<HTMLButtonElement>('#voltar').click();
      await render();
      expect(dialog().open).toBeFalse();
    });

    it('trava a rolagem da página e devolve o valor anterior', async () => {
      document.body.style.overflow = 'clip';
      try {
        await openDialog();
        expect(document.body.style.overflow).toBe('hidden');
        dialogCmp.close();
        expect(document.body.style.overflow).toBe('clip');
      } finally {
        document.body.style.overflow = '';
      }
    });

    it('evento close atrasado não fecha um diálogo reaberto', async () => {
      await openDialog();
      dialogCmp.close();
      dialogCmp.open();
      dialog().dispatchEvent(new Event('close'));
      expect(dialogCmp.isOpen()).toBeTrue();
      expect(dialog().open).toBeTrue();
      expect(host.events).toEqual(['aberto', 'fechado', 'aberto']);
    });

    it('abrir duas vezes não empilha', async () => {
      await openDialog();
      dialogCmp.open();
      expect(host.events).toEqual(['aberto']);
    });

    it('quem abriu sumiu: fecha sem erro', async () => {
      await openDialog();
      $('#abrir-dialogo').remove();
      expect(() => dialogCmp.close()).not.toThrow();
      expect(dialog().open).toBeFalse();
    });

    it('cores e forma dos tokens, nos dois modos', async () => {
      await openDialog();
      dialog().style.animation = 'none';
      for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
        const restore = pinTheme(theme);
        try {
          const style = getComputedStyle(dialog());
          expect(style.backgroundColor).toBe(token('--tg-bg-surface', 'background-color'));
          expect(style.color).toBe(token('--tg-text-primary'));
          expect(style.borderTopLeftRadius).toBe('28px');
          const icon = $<HTMLElement>('#dialogo .tg-dialog__icon');
          expect(getComputedStyle(icon).color).toBe(token('--tg-feedback-danger-text'));
          expect(icon.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        } finally {
          restore();
        }
      }
    });

    it('até 440 px e ações empilhadas abaixo de 600 px, lado a lado acima', async () => {
      await openDialog();
      dialog().style.animation = 'none';
      expect(dialog().getBoundingClientRect().width).toBeLessThanOrEqual(440);
      const actions = $<HTMLElement>('#dialogo .tg-dialog__actions');
      const expected = window.innerWidth < 600 ? 'column-reverse' : 'row';
      expect(getComputedStyle(actions).flexDirection).toBe(expected);
    });

    it('destruído aberto: devolve a rolagem', async () => {
      await openDialog();
      fixture.destroy();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('painel', () => {
    it('abre modal com o título como nome; o foco vai para o Fechar', async () => {
      await openSheet();
      expect(sheet().matches(':modal')).toBeTrue();
      expect(accessibleName(sheet())).toBe('Filtros');
      const close = $<HTMLButtonElement>('#painel .tg-sheet__close');
      expect(document.activeElement).toBe(close);
      expect(accessibleName(close)).toBe('Fechar');
      expect(close.type).toBe('button');
      const box = close.getBoundingClientRect();
      expect(box.width).toBe(44);
      expect(box.height).toBe(44);
    });

    it('o Fechar fecha e devolve o foco', async () => {
      await openSheet();
      $<HTMLButtonElement>('#painel .tg-sheet__close').click();
      await render();
      expect(sheet().open).toBeFalse();
      expect(document.activeElement).toBe($('#abrir-painel'));
      expect(host.events).toEqual(['painel fechado']);
    });

    it('enviando: o Fechar fica indisponível sem perder o foco', async () => {
      await openSheet();
      const close = $<HTMLButtonElement>('#painel .tg-sheet__close');
      host.busy.set(true);
      await render();
      expect(close.getAttribute('aria-disabled')).toBe('true');
      close.click();
      escape(close);
      clickBackdrop(sheet());
      await render();
      expect(sheet().open).toBeTrue();
      expect(document.activeElement).toBe(close);
    });

    it('título e ações ficam fixos; só o meio rola', async () => {
      await openSheet();
      sheet().style.animation = 'none';
      const header = $<HTMLElement>('#painel .tg-sheet__header');
      const body = $<HTMLElement>('#painel .tg-sheet__body');
      const footer = $<HTMLElement>('#painel .tg-sheet__actions');
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      const headerTop = header.getBoundingClientRect().top;
      const footerTop = footer.getBoundingClientRect().top;
      body.scrollTop = 800;
      expect(body.scrollTop).toBeGreaterThan(0);
      expect(header.getBoundingClientRect().top).toBe(headerTop);
      expect(footer.getBoundingClientRect().top).toBe(footerTop);
      expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 0.5);
      expect(footer.textContent).toContain('Aplicar filtros');
    });

    it('embaixo abaixo de 600 px; à direita, com 440 px, acima', async () => {
      await openSheet();
      sheet().style.animation = 'none';
      const box = sheet().getBoundingClientRect();
      if (window.innerWidth < 600) {
        expect(box.width).toBe(window.innerWidth);
        expect(Math.round(box.bottom)).toBe(window.innerHeight);
      } else {
        expect(box.width).toBe(440);
        expect(Math.round(box.right)).toBe(window.innerWidth);
        expect(Math.round(box.height)).toBe(window.innerHeight);
      }
    });

    it('a ação da tela fecha', async () => {
      await openSheet();
      $<HTMLButtonElement>('#aplicar').click();
      await render();
      expect(sheet().open).toBeFalse();
    });
  });

  it('dois abertos em sequência: a rolagem só volta quando os dois fecham', async () => {
    await openSheet();
    dialogCmp.open();
    expect(document.body.style.overflow).toBe('hidden');
    dialogCmp.close();
    expect(document.body.style.overflow).toBe('hidden');
    sheetCmp.close();
    expect(document.body.style.overflow).toBe('');
  });
});
