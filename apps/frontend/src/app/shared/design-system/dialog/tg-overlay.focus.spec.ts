import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgDialogComponent } from './tg-dialog.component';
import { TgSheetComponent } from './tg-sheet.component';

// Página -> painel -> diálogo aberto de dentro do painel, mais diálogos de
// foco inicial. O diálogo de excluir fica fora do painel, para sobreviver a
// ele (cenários fora de ordem e de destruição).
@Component({
  imports: [TgDialogComponent, TgSheetComponent, TgButtonComponent],
  template: `
    <button id="pagina" (click)="sheet()?.open()">Filtros</button>
    <button id="abrir-sem-acoes" (click)="semAcoes.open()">Aviso</button>
    <button id="abrir-com-link" (click)="comLink.open()">Aviso com link</button>
    <button id="abrir-indisponivel" (click)="indisponivel.open()">Indisponível</button>

    @if (showSheet()) {
      <tg-sheet #filtros id="painel" title="Filtros" (opened)="log('painel aberto')" (closed)="log('painel fechado')">
        <label>Bairro <input id="bairro" /></label>
        <button id="excluir-salvo" (click)="excluir.open()">Excluir filtro salvo</button>
        <button tgButton tgSheetAction id="aplicar">Aplicar filtros</button>
      </tg-sheet>
    }

    <tg-dialog
      #excluir
      id="excluir"
      title="Excluir este filtro?"
      tone="danger"
      [busy]="busy()"
      (opened)="log('diálogo aberto')"
      (closed)="log('diálogo fechado')"
    >
      <p>Ele sai da lista. <a id="regras" href="#">Ver regras</a></p>
      <!-- Um @if por ação: um bloco com dois elementos não casa com o slot. -->
      @if (withActions()) {
        <button tgButton tgDialogAction id="manter" appearance="outline" (click)="excluir.close()">Manter</button>
      }
      @if (withActions()) {
        <button tgButton tgDialogAction id="excluir-agora" tone="danger" [loading]="busy()">Excluir</button>
      }
    </tg-dialog>

    <tg-dialog #semAcoes id="sem-acoes" title="Pedido enviado">
      <p>Avisamos quando o profissional responder.</p>
    </tg-dialog>

    <tg-dialog #comLink id="com-link" title="Pedido enviado">
      <p>Acompanhe em <a id="pedidos" href="#">Pedidos</a>.</p>
    </tg-dialog>

    <tg-dialog #indisponivel id="indisponivel" title="Cancelar o pedido?" tone="danger">
      <p>O profissional é avisado.</p>
      <button tgButton tgDialogAction id="voltar-off" appearance="outline" disabled>Voltar</button>
      <button tgButton tgDialogAction id="cancelar-pedido" tone="danger">Cancelar pedido</button>
    </tg-dialog>
  `,
})
class HostComponent {
  // A referência #filtros fica dentro do @if; a página chega nela por aqui.
  readonly sheet = viewChild<TgSheetComponent>('filtros');
  readonly showSheet = signal(true);
  readonly withActions = signal(true);
  readonly busy = signal(false);
  events: string[] = [];
  log(event: string) {
    this.events.push(event);
  }
}

describe('TgOverlay: foco', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const $ = <T extends HTMLElement>(selector: string) => fixture.nativeElement.querySelector(selector) as T;
  const dialogEl = (id: string) => $<HTMLDialogElement>(`#${id} dialog`);
  const cmp = <T>(type: new (...args: never[]) => T, id: string): T =>
    fixture.debugElement.query((d) => d.componentInstance instanceof type && d.nativeElement.id === id).componentInstance;
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const press = async (selector: string) => {
    $<HTMLElement>(selector).focus();
    $<HTMLElement>(selector).click();
    await render();
  };
  const escape = async () => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await render();
  };
  const inside = (id: string) => dialogEl(id).contains(document.activeElement);

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await render();
  });
  afterEach(() => {
    for (const d of Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'))) d.close();
    fixture.destroy();
    fixture.nativeElement.remove();
    document.body.style.overflow = '';
  });

  describe('foco inicial', () => {
    it('diálogo com duas ações e um link no texto: foco na ação segura', async () => {
      await press('#pagina');
      await press('#excluir-salvo');
      expect(document.activeElement).toBe($('#manter'));
    });

    it('aberto durante o envio: ainda a ação segura, e o envio segura o Esc', async () => {
      host.busy.set(true);
      await render();
      await press('#pagina');
      await press('#excluir-salvo');
      expect(document.activeElement).toBe($('#manter'));
      await escape();
      expect(dialogEl('excluir').open).toBeTrue();
    });

    it('sem ações: foco no próprio diálogo, que lê título e texto', async () => {
      await press('#abrir-sem-acoes');
      expect(document.activeElement).toBe(dialogEl('sem-acoes'));
      expect(dialogEl('sem-acoes').tabIndex).toBe(-1);
    });

    it('sem ações e com link no texto: foco no diálogo, não no link', async () => {
      await press('#abrir-com-link');
      expect(document.activeElement).toBe(dialogEl('com-link'));
    });

    it('ações removidas pela tela antes de abrir: foco no diálogo', async () => {
      host.withActions.set(false);
      await render();
      await press('#pagina');
      await press('#excluir-salvo');
      expect(document.activeElement).toBe(dialogEl('excluir'));
    });

    it('ação segura indisponível: foco no diálogo, nunca na de perigo', async () => {
      await press('#abrir-indisponivel');
      expect(document.activeElement).toBe(dialogEl('indisponivel'));
      expect(document.activeElement).not.toBe($('#cancelar-pedido'));
    });

    it('painel: foco no Fechar, mesmo com campo no conteúdo', async () => {
      await press('#pagina');
      expect(document.activeElement).toBe($('#painel .tg-sheet__close'));
    });

    it('o foco nunca fica fora do modal aberto', async () => {
      await press('#abrir-sem-acoes');
      expect(inside('sem-acoes')).toBeTrue();
      $<HTMLElement>('#pagina').focus();
      expect(inside('sem-acoes')).toBeTrue();
    });
  });

  describe('dois abertos', () => {
    it('A, ordem normal: o foco volta para dentro do painel e depois para a página', async () => {
      await press('#pagina');
      await press('#excluir-salvo');
      await escape();
      expect(dialogEl('excluir').open).toBeFalse();
      expect(dialogEl('painel').open).toBeTrue();
      expect(document.activeElement).toBe($('#excluir-salvo'));
      expect(document.body.style.overflow).toBe('hidden');

      await escape();
      expect(dialogEl('painel').open).toBeFalse();
      expect(document.activeElement).toBe($('#pagina'));
      expect(document.body.style.overflow).toBe('');
      expect(host.events).toEqual(['painel aberto', 'diálogo aberto', 'diálogo fechado', 'painel fechado']);
    });

    it('B, fora de ordem: o painel fecha por baixo e o foco não foge do diálogo', async () => {
      await press('#pagina');
      await press('#excluir-salvo');
      const focusSpy = spyOn(HTMLElement.prototype, 'focus').and.callThrough();
      cmp(TgSheetComponent, 'painel').close();
      await render();
      expect(dialogEl('painel').open).toBeFalse();
      expect(dialogEl('excluir').matches(':modal')).toBeTrue();
      expect(inside('excluir')).toBeTrue();
      expect(document.body.style.overflow).toBe('hidden');

      focusSpy.calls.reset();
      await escape();
      expect(dialogEl('excluir').open).toBeFalse();
      // Não tenta o botão de dentro do painel fechado; volta para a página.
      expect(focusSpy.calls.all().some((c) => c.object === $('#excluir-salvo'))).toBeFalse();
      expect(document.activeElement).toBe($('#pagina'));
      expect(document.body.style.overflow).toBe('');
      expect(host.events).toEqual(['painel aberto', 'diálogo aberto', 'painel fechado', 'diálogo fechado']);
    });

    it('C, destruição: o painel sai da tela aberto e o diálogo de cima segue funcionando', async () => {
      await press('#pagina');
      await press('#excluir-salvo');
      host.showSheet.set(false);
      await render();
      expect($('#painel')).toBeNull();
      expect(dialogEl('excluir').matches(':modal')).toBeTrue();
      expect(inside('excluir')).toBeTrue();
      expect(document.body.style.overflow).toBe('hidden');

      await escape();
      expect(dialogEl('excluir').open).toBeFalse();
      expect(document.activeElement).toBe($('#pagina'));
      expect(document.body.style.overflow).toBe('');
      expect(host.events).toEqual(['painel aberto', 'diálogo aberto', 'diálogo fechado']);
    });

    it('D, reabrir na hora com um close atrasado: o novo ciclo vale', async () => {
      await press('#pagina');
      await press('#excluir-salvo');
      const dialog = cmp(TgDialogComponent, 'excluir');
      dialog.close();
      dialog.open();
      dialogEl('excluir').dispatchEvent(new Event('close'));
      await render();
      expect(dialog.isOpen()).toBeTrue();
      expect(document.activeElement).toBe($('#manter'));
      expect(host.events).toEqual(['painel aberto', 'diálogo aberto', 'diálogo fechado', 'diálogo aberto']);

      await escape();
      expect(document.activeElement).toBe($('#excluir-salvo'));
      await escape();
      expect(document.activeElement).toBe($('#pagina'));
      expect(document.body.style.overflow).toBe('');
    });
  });
});
