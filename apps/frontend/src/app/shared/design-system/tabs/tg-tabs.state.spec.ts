import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgTabComponent, TgTabsComponent } from './tg-tabs.component';

type Item = { value: string; label: string; count?: number };
const ITEMS: Item[] = [
  { value: 'ativos', label: 'Ativos', count: 2 },
  { value: 'concluidos', label: 'Concluídos' },
  { value: 'cancelados', label: 'Cancelados' },
];

// Lista dinâmica, com um campo fora das abas e o valor da tela observado.
@Component({
  imports: [TgTabsComponent, TgTabComponent],
  template: `
    <input id="fora" aria-label="Fora das abas" />
    <tg-tabs id="dinamico" label="Pedidos" [(value)]="tab" (valueChange)="changes = changes + 1">
      @for (t of tabs(); track t.value) {
        <tg-tab [value]="t.value" [label]="t.label" [count]="t.count">Lista de {{ t.label }}</tg-tab>
      }
    </tg-tabs>
  `,
})
class DynamicHostComponent {
  readonly tab = signal<string | undefined>(undefined);
  readonly tabs = signal<Item[]>(ITEMS);
  changes = 0;
}

// Configuração inválida: "agendados" aparece duas vezes e uma aba não tem valor.
@Component({
  imports: [TgTabsComponent, TgTabComponent],
  template: `
    <tg-tabs id="repetido" label="Pedidos" [(value)]="tab">
      <tg-tab value="ativos" label="Ativos">A</tg-tab>
      <tg-tab value="agendados" label="Agendados">B</tg-tab>
      <tg-tab value="agendados" label="Agendados de novo">B2</tg-tab>
      <tg-tab label="Sem valor">X</tg-tab>
      <tg-tab value="historico" label="Histórico">C</tg-tab>
    </tg-tabs>
  `,
})
class DuplicateHostComponent {
  readonly tab = signal<string | undefined>(undefined);
}

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};
const buttonsOf = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
const panelsOf = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
const keydown = (target: HTMLElement, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

/** Uma só aba selecionada, e é ela (e só ela) que entra no Tab. */
function expectConsistent(root: HTMLElement) {
  const buttons = buttonsOf(root);
  const selected = buttons.filter((b) => b.getAttribute('aria-selected') === 'true');
  const tabbable = buttons.filter((b) => b.tabIndex === 0);
  expect(selected.length).toBeLessThanOrEqual(1);
  expect(tabbable).toEqual(selected);
  const visible = panelsOf(root).filter((p) => !p.hidden);
  expect(visible.map((p) => p.id)).toEqual(selected.map((b) => b.getAttribute('aria-controls') as string));
  return selected[0] as HTMLButtonElement | undefined;
}

describe('TgTabsComponent: valores repetidos ou ausentes', () => {
  let fixture: ComponentFixture<DuplicateHostComponent>;
  let host: DuplicateHostComponent;
  let warn: jasmine.Spy;
  const root = () => fixture.nativeElement.querySelector('#repetido') as HTMLElement;
  const buttons = () => buttonsOf(root());
  const press = async (target: HTMLElement, key: string) => {
    const event = keydown(target, key);
    await settle(fixture);
    return event;
  };

  beforeEach(async () => {
    warn = spyOn(console, 'warn');
    fixture = TestBed.createComponent(DuplicateHostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
  });
  afterEach(() => fixture.nativeElement.remove());

  it('avisa em desenvolvimento', () => {
    expect(warn).toHaveBeenCalledWith('tg-tabs: valores repetidos (agendados).');
    expect(warn).toHaveBeenCalledWith('tg-tabs: toda tg-tab precisa de value e label.');
  });

  it('a repetição e a aba sem valor ficam inativas: aria-disabled e fora do Tab', () => {
    expect(buttons().map((b) => b.getAttribute('aria-disabled'))).toEqual([null, null, 'true', 'true', null]);
    expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    expectConsistent(root());
  });

  it('clique na repetição não muda a seleção nem o valor', async () => {
    buttons()[2].click();
    await settle(fixture);
    expect(host.tab()).toBeUndefined();
    expect(expectConsistent(root())).toBe(buttons()[0]);

    buttons()[1].click();
    await settle(fixture);
    expect(host.tab()).toBe('agendados');
    expect(expectConsistent(root())).toBe(buttons()[1]);

    buttons()[2].click();
    await settle(fixture);
    expect(expectConsistent(root())).toBe(buttons()[1]);
  });

  it('setas pulam as inativas; seleção, tabIndex e foco andam juntos', async () => {
    buttons()[0].focus();
    await press(buttons()[0], 'ArrowRight');
    expect(host.tab()).toBe('agendados');
    expect(document.activeElement).toBe(expectConsistent(root()) as HTMLElement);
    expect(document.activeElement).toBe(buttons()[1]);

    await press(buttons()[1], 'ArrowRight');
    expect(host.tab()).toBe('historico');
    expect(document.activeElement).toBe(buttons()[4]);
    expect(expectConsistent(root())).toBe(buttons()[4]);

    await press(buttons()[4], 'ArrowLeft');
    expect(host.tab()).toBe('agendados');
    expect(document.activeElement).toBe(buttons()[1]);
    expect(expectConsistent(root())).toBe(buttons()[1]);

    await press(buttons()[4 - 3], 'ArrowLeft');
    expect(document.activeElement).toBe(buttons()[0]);
    await press(buttons()[0], 'ArrowLeft');
    expect(document.activeElement).toBe(buttons()[4]);
    expect(expectConsistent(root())).toBe(buttons()[4]);
  });

  it('Home e End vão às abas válidas das pontas', async () => {
    await press(buttons()[0], 'End');
    expect(host.tab()).toBe('historico');
    expect(document.activeElement).toBe(buttons()[4]);
    await press(buttons()[4], 'Home');
    expect(host.tab()).toBe('ativos');
    expect(document.activeElement).toBe(buttons()[0]);
    expect(expectConsistent(root())).toBe(buttons()[0]);
  });

  it('teclado a partir de uma inativa focada pelo clique também é previsível', async () => {
    buttons()[2].focus();
    await press(buttons()[2], 'ArrowRight');
    expect(document.activeElement).toBe(buttons()[4]);
    await press(buttons()[4], 'ArrowLeft');
    buttons()[3].focus();
    await press(buttons()[3], 'ArrowLeft');
    expect(document.activeElement).toBe(buttons()[1]);
    expect(expectConsistent(root())).toBe(buttons()[1]);
  });

  it('[(value)] continua valendo: a tela escolhe a primeira com aquele valor', async () => {
    host.tab.set('historico');
    await settle(fixture);
    expect(expectConsistent(root())).toBe(buttons()[4]);
    host.tab.set('agendados');
    await settle(fixture);
    expect(expectConsistent(root())).toBe(buttons()[1]);
  });
});

describe('TgTabsComponent: lista dinâmica e foco', () => {
  let fixture: ComponentFixture<DynamicHostComponent>;
  let host: DynamicHostComponent;
  const root = () => fixture.nativeElement.querySelector('#dinamico') as HTMLElement;
  const buttons = () => buttonsOf(root());
  const outside = () => fixture.nativeElement.querySelector('#fora') as HTMLInputElement;
  const byLabel = (label: string) => buttons().find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
  const without = (value: string) => ITEMS.filter((t) => t.value !== value);

  beforeEach(async () => {
    fixture = TestBed.createComponent(DynamicHostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
  });
  afterEach(() => fixture.nativeElement.remove());

  it('não move o foco ao iniciar', () => {
    expect(root().contains(document.activeElement)).toBeFalse();
  });

  it('remover a aba focada passa o foco para a nova selecionada', async () => {
    byLabel('Concluídos').click();
    byLabel('Concluídos').focus();
    await settle(fixture);

    host.tabs.set(without('concluidos'));
    await settle(fixture);
    expect(document.activeElement).toBe(byLabel('Ativos'));
    expect(expectConsistent(root())).toBe(byLabel('Ativos'));
  });

  it('remover a primeira ou a última, focada, também mantém o foco nas abas', async () => {
    byLabel('Ativos').focus();
    host.tabs.set(without('ativos'));
    await settle(fixture);
    expect(document.activeElement).toBe(byLabel('Concluídos'));

    byLabel('Cancelados').click();
    byLabel('Cancelados').focus();
    await settle(fixture);
    host.tabs.set([ITEMS[1]]);
    await settle(fixture);
    expect(document.activeElement).toBe(byLabel('Concluídos'));
    expect(expectConsistent(root())).toBe(byLabel('Concluídos'));
  });

  it('remover uma aba não focada não mexe no foco', async () => {
    byLabel('Concluídos').click();
    const focused = byLabel('Concluídos');
    focused.focus();
    await settle(fixture);
    host.tabs.set(without('cancelados'));
    await settle(fixture);
    expect(document.activeElement).toBe(focused);
    expect(expectConsistent(root())).toBe(focused);
  });

  it('com o foco fora, remover a selecionada não puxa o foco', async () => {
    byLabel('Concluídos').click();
    await settle(fixture);
    outside().focus();
    host.tabs.set(without('concluidos'));
    await settle(fixture);
    expect(document.activeElement).toBe(outside());
  });

  it('seleção pela tela com o foco fora não puxa o foco', async () => {
    outside().focus();
    host.tab.set('cancelados');
    await settle(fixture);
    expect(document.activeElement).toBe(outside());
    expect(expectConsistent(root())).toBe(byLabel('Cancelados'));
  });

  it('reordenar com a aba focada mantém o foco nela', async () => {
    byLabel('Concluídos').click();
    byLabel('Concluídos').focus();
    await settle(fixture);
    host.tabs.set([ITEMS[1], ITEMS[2], ITEMS[0]]);
    await settle(fixture);
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Concluídos', 'Cancelados', 'Ativos2']);
    expect(document.activeElement).toBe(byLabel('Concluídos'));
    expect(expectConsistent(root())).toBe(byLabel('Concluídos'));
  });

  it('mudar rótulo e contagem não mexe no foco', async () => {
    const focused = byLabel('Ativos');
    focused.focus();
    host.tabs.set([{ ...ITEMS[0], label: 'Em aberto', count: 5 }, ITEMS[1], ITEMS[2]]);
    await settle(fixture);
    expect(document.activeElement).toBe(focused);
    expect(focused.getAttribute('aria-label')).toBe('Em aberto, 5');
  });

  it('remover todas e adicionar de novo: sem erro e funcionando, sem puxar o foco', async () => {
    byLabel('Ativos').focus();
    host.tabs.set([]);
    await settle(fixture);
    expect(buttons().length).toBe(0);
    expect(panelsOf(root()).length).toBe(0);

    outside().focus();
    host.tabs.set(ITEMS);
    await settle(fixture);
    expect(document.activeElement).toBe(outside());
    expect(expectConsistent(root())).toBe(byLabel('Ativos'));

    byLabel('Ativos').focus();
    keydown(byLabel('Ativos'), 'ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(byLabel('Concluídos'));
    expect(host.tab()).toBe('concluidos');
  });

  it('o teclado continua certo depois de mudanças na lista', async () => {
    host.tabs.set([ITEMS[2], ITEMS[0]]);
    await settle(fixture);
    byLabel('Cancelados').focus();
    keydown(byLabel('Cancelados'), 'End');
    await settle(fixture);
    expect(document.activeElement).toBe(byLabel('Ativos'));
    expect(expectConsistent(root())).toBe(byLabel('Ativos'));
  });
});

describe('TgTabsComponent: valor que não corresponde a uma aba', () => {
  let fixture: ComponentFixture<DynamicHostComponent>;
  let host: DynamicHostComponent;
  const root = () => fixture.nativeElement.querySelector('#dinamico') as HTMLElement;
  const byLabel = (label: string) => buttonsOf(root()).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
  const create = async (initial: string | undefined) => {
    fixture = TestBed.createComponent(DynamicHostComponent);
    host = fixture.componentInstance;
    host.tab.set(initial);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
  };
  afterEach(() => fixture.nativeElement.remove());

  it('sem valor: mostra a primeira e não escreve na tela', async () => {
    await create(undefined);
    expect(expectConsistent(root())).toBe(byLabel('Ativos'));
    expect(host.tab()).toBeUndefined();
    expect(host.changes).toBe(0);
  });

  it('valor válido de início: mostra aquela aba', async () => {
    await create('cancelados');
    expect(expectConsistent(root())).toBe(byLabel('Cancelados'));
    expect(host.changes).toBe(0);
  });

  it('valor inexistente de início: mostra a primeira e mantém o valor da tela', async () => {
    await create('arquivados');
    expect(expectConsistent(root())).toBe(byLabel('Ativos'));
    expect(host.tab()).toBe('arquivados');
    expect(host.changes).toBe(0);
  });

  it('a tela troca para um valor inexistente: mesma regra, sem ciclo', async () => {
    await create('concluidos');
    host.tab.set('arquivados');
    await settle(fixture);
    expect(expectConsistent(root())).toBe(byLabel('Ativos'));
    expect(host.tab()).toBe('arquivados');
    expect(host.changes).toBe(0);
  });

  it('a aba do valor sai e volta: a seleção volta com ela', async () => {
    await create('concluidos');
    host.tabs.set(ITEMS.filter((t) => t.value !== 'concluidos'));
    await settle(fixture);
    expect(expectConsistent(root())).toBe(byLabel('Ativos'));
    expect(host.tab()).toBe('concluidos');

    host.tabs.set(ITEMS);
    await settle(fixture);
    expect(expectConsistent(root())).toBe(byLabel('Concluídos'));
    expect(host.changes).toBe(0);
  });

  it('clique sincroniza a tela, uma vez por troca', async () => {
    await create('arquivados');
    byLabel('Cancelados').click();
    await settle(fixture);
    expect(host.tab()).toBe('cancelados');
    expect(host.changes).toBe(1);
    byLabel('Cancelados').click();
    await settle(fixture);
    expect(host.changes).toBe(1);
  });
});
