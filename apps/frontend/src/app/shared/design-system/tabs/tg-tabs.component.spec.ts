import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { accessibleName } from '../button/accessible-name';
import { TgTabComponent, TgTabsComponent } from './tg-tabs.component';

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

/** Valor resolvido de um token de cor, no tema atual. */
function token(name: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

@Component({
  imports: [TgTabsComponent, TgTabComponent],
  template: `
    <div [style.width.px]="width()">
      <tg-tabs id="pedidos" label="Pedidos" [(value)]="tab">
        @for (t of tabs(); track t.value) {
          <tg-tab [value]="t.value" [label]="t.label" [count]="t.count">
            <p>Lista de {{ t.label }}</p>
            <a href="#">Ver pedido</a>
          </tg-tab>
        }
      </tg-tabs>
    </div>
  `,
})
class HostComponent {
  readonly width = signal(720);
  readonly tab = signal<string | undefined>(undefined);
  readonly tabs = signal<{ value: string; label: string; count?: number | null }[]>([
    { value: 'ativos', label: 'Ativos', count: 2 },
    { value: 'concluidos', label: 'Concluídos' },
    { value: 'cancelados', label: 'Cancelados', count: 0 },
  ]);
}

describe('TgTabsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let restoreTheme: () => void;

  const root = () => fixture.nativeElement.querySelector('#pedidos') as HTMLElement;
  const tablist = () => root().querySelector('[role="tablist"]') as HTMLElement;
  const buttons = () => Array.from(root().querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = () => Array.from(root().querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const selected = () => buttons().filter((b) => b.getAttribute('aria-selected') === 'true');
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const key = async (target: HTMLElement, name: string) => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    await render();
    return event;
  };

  beforeEach(() => (restoreTheme = pinTheme()));
  afterEach(() => restoreTheme());

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await render();
  });
  afterEach(() => fixture.nativeElement.remove());

  describe('papéis e ligações', () => {
    it('tablist com nome; cada aba é um botão ligado ao seu painel', () => {
      expect(tablist().getAttribute('aria-label')).toBe('Pedidos');
      expect(buttons().length).toBe(3);
      buttons().forEach((button, i) => {
        const panel = panels()[i];
        expect(button.type).toBe('button');
        expect(button.getAttribute('aria-controls')).toBe(panel.id);
        expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
        expect(panel.tabIndex).toBe(0);
      });
      expect(new Set([...buttons(), ...panels()].map((el) => el.id)).size).toBe(6);
    });

    it('sem valor: a primeira aba fica selecionada e só o painel dela aparece', () => {
      expect(selected()).toEqual([buttons()[0]]);
      expect(panels().map((p) => p.hidden)).toEqual([false, true, true]);
      expect(getComputedStyle(panels()[1]).display).toBe('none');
      expect(host.tab()).toBeUndefined();
    });

    it('valor que não existe: vale a primeira', async () => {
      host.tab.set('arquivados');
      await render();
      expect(selected()).toEqual([buttons()[0]]);
    });

    it('a contagem aparece só quando é maior que zero e entra no nome', () => {
      // Conferido também na árvore de acessibilidade do Chrome: "Ativos, 2".
      expect(accessibleName(buttons()[0])).toBe('Ativos, 2');
      expect(buttons()[0].querySelector('.tg-tabs__count')?.textContent?.trim()).toBe('2');
      expect(buttons()[1].getAttribute('aria-label')).toBe('Concluídos');
      expect(buttons()[1].querySelector('.tg-tabs__count')).toBeNull();
      expect(buttons()[2].querySelector('.tg-tabs__count')).toBeNull();
      expect(accessibleName(buttons()[2])).toBe('Cancelados');
    });
  });

  describe('seleção', () => {
    it('clique seleciona, mostra o painel e atualiza o valor da tela', async () => {
      buttons()[1].click();
      await render();
      expect(host.tab()).toBe('concluidos');
      expect(selected()).toEqual([buttons()[1]]);
      expect(panels().map((p) => p.hidden)).toEqual([true, false, true]);
    });

    it('a tela muda o valor: a aba acompanha', async () => {
      host.tab.set('cancelados');
      await render();
      expect(selected()).toEqual([buttons()[2]]);
      expect(panels()[2].hidden).toBeFalse();
    });

    it('a aba selecionada some: volta para a primeira', async () => {
      host.tab.set('concluidos');
      await render();
      host.tabs.update((tabs) => tabs.filter((t) => t.value !== 'concluidos'));
      await render();
      expect(buttons().length).toBe(2);
      expect(selected()).toEqual([buttons()[0]]);
      expect(panels()[0].hidden).toBeFalse();
    });
  });

  describe('teclado', () => {
    it('só a aba selecionada entra no Tab', async () => {
      expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
      buttons()[2].click();
      await render();
      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
    });

    it('setas trocam de aba com volta no fim, e o foco acompanha', async () => {
      buttons()[0].focus();
      const event = await key(buttons()[0], 'ArrowRight');
      expect(event.defaultPrevented).toBeTrue();
      expect(host.tab()).toBe('concluidos');
      expect(document.activeElement).toBe(buttons()[1]);

      await key(buttons()[1], 'ArrowRight');
      await key(buttons()[2], 'ArrowRight');
      expect(host.tab()).toBe('ativos');
      expect(document.activeElement).toBe(buttons()[0]);

      await key(buttons()[0], 'ArrowLeft');
      expect(host.tab()).toBe('cancelados');
      expect(document.activeElement).toBe(buttons()[2]);
    });

    it('Home e End vão para a primeira e a última', async () => {
      await key(buttons()[0], 'End');
      expect(host.tab()).toBe('cancelados');
      await key(buttons()[2], 'Home');
      expect(host.tab()).toBe('ativos');
      expect(document.activeElement).toBe(buttons()[0]);
    });

    it('outras teclas e teclas vindas do painel não trocam a aba', async () => {
      const space = await key(buttons()[0], 'ArrowDown');
      expect(space.defaultPrevented).toBeFalse();
      const link = panels()[0].querySelector('a') as HTMLElement;
      const fromPanel = await key(link, 'ArrowRight');
      expect(fromPanel.defaultPrevented).toBeFalse();
      expect(host.tab()).toBeUndefined();
    });
  });

  describe('aparência', () => {
    it('48 px de altura; selecionada em negrito, cor de ação e barra de 3 px', () => {
      const [on, off] = buttons();
      expect(on.getBoundingClientRect().height).toBe(48);
      expect(getComputedStyle(on).color).toBe(token('--tg-action-subtle-text'));
      expect(getComputedStyle(off).color).toBe(token('--tg-text-secondary'));
      expect(getComputedStyle(on).fontWeight).toBe('800');
      const bar = getComputedStyle(on, '::after');
      expect(bar.borderTopWidth).toBe('3px');
      expect(bar.borderTopColor).toBe(token('--tg-action-primary'));
      expect(getComputedStyle(off, '::after').content).toBe('none');
    });

    it('modo prestador: as cores vêm do tema', async () => {
      // Sem a transição de cor, para ler o valor final logo após trocar o tema.
      buttons()[0].style.transition = 'none';
      const restore = pinTheme('PROVIDER');
      try {
        expect(getComputedStyle(buttons()[0]).color).toBe(token('--tg-action-subtle-text'));
        expect(getComputedStyle(buttons()[0], '::after').borderTopColor).toBe(token('--tg-action-primary'));
      } finally {
        restore();
      }
    });

    it('selecionar não muda a largura da aba', async () => {
      const before = buttons()[1].getBoundingClientRect().width;
      buttons()[1].click();
      await render();
      expect(buttons()[1].getBoundingClientRect().width).toBe(before);
    });
  });

  describe('barra estreita', () => {
    beforeEach(async () => {
      host.tabs.set([
        { value: 'servicos', label: 'Serviços' },
        { value: 'avaliacoes', label: 'Avaliações', count: 48 },
        { value: 'sobre', label: 'Sobre o profissional' },
        { value: 'fotos', label: 'Fotos dos trabalhos' },
      ]);
      host.width.set(260);
      await render();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await render();
    });

    it('rola na horizontal, com esmaecido só onde há mais abas', async () => {
      const bar = root().querySelector('.tg-tabs__bar') as HTMLElement;
      expect(tablist().scrollWidth).toBeGreaterThan(tablist().clientWidth);
      expect(bar.classList).toContain('tg-tabs__bar--fade-end');
      expect(bar.classList).not.toContain('tg-tabs__bar--fade-start');
      expect(root().getBoundingClientRect().width).toBe(260);
    });

    it('a aba selecionada fica inteira à vista, sem rolar a página', async () => {
      const pageY = window.scrollY;
      await key(buttons()[0], 'End');
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const list = tablist().getBoundingClientRect();
      const last = buttons()[3].getBoundingClientRect();
      expect(last.left).toBeGreaterThanOrEqual(list.left);
      expect(last.right).toBeLessThanOrEqual(list.right + 1);
      expect(window.scrollY).toBe(pageY);
      fixture.detectChanges();
      expect((root().querySelector('.tg-tabs__bar') as HTMLElement).classList).toContain('tg-tabs__bar--fade-start');
    });
  });

  it('avisa em desenvolvimento quando falta valor ou rótulo', async () => {
    const warn = spyOn(console, 'warn');
    host.tabs.set([{ value: 'a', label: ' ' }]);
    await render();
    expect(warn).toHaveBeenCalledWith('tg-tabs: toda tg-tab precisa de value e label.');
  });

  it('avisa em desenvolvimento quando há valores repetidos', async () => {
    const warn = spyOn(console, 'warn');
    host.tabs.set([
      { value: 'a', label: 'Um' },
      { value: 'a', label: 'Dois' },
    ]);
    await render();
    expect(warn).toHaveBeenCalledWith('tg-tabs: valores repetidos (a).');
  });
});
