import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { accessibleName } from '../button/accessible-name';
import { TgAccountMenuComponent } from './tg-account-menu.component';
import { TgAppBarComponent } from './tg-app-bar.component';
import { TgNavItem } from './tg-nav-item';
import { TgNavComponent } from './tg-nav.component';

@Component({ template: '' })
class PageComponent {}

const DESTINOS: TgNavItem[] = [
  { label: 'Início', icon: 'house', link: '/customer', exact: true },
  { label: 'Buscar', icon: 'magnifying-glass', link: '/customer/search' },
  { label: 'Pedidos', icon: 'receipt', link: '/pedidos' },
  { label: 'Favoritos', icon: 'heart', link: '/customer/favorites' },
];
const CONTA: TgNavItem = { label: 'Conta', icon: 'user-circle', link: '/conta' };
const LINKS_CONTA: TgNavItem[] = [
  { label: 'Dados pessoais', icon: 'user', link: '/conta' },
  { label: 'Endereços', icon: 'map-pin', link: '/conta/enderecos' },
];

@Component({
  imports: [TgAppBarComponent, TgNavComponent, TgAccountMenuComponent],
  template: `
    <tg-app-bar homeLink="/customer">
      <tg-nav [items]="destinos" [account]="conta" />
      <button type="button" id="notificacoes">Notificações</button>
      <tg-account-menu [name]="nome()" detail="Cliente" [links]="linksConta" (signOut)="saidas = saidas + 1" />
    </tg-app-bar>
    <main id="conteudo" class="tg-nav-offset"><button type="button" id="fora">Fora</button></main>
  `,
})
class HostComponent {
  readonly destinos = DESTINOS;
  readonly conta = CONTA;
  readonly linksConta = LINKS_CONTA;
  readonly nome = signal('Ana Souza');
  saidas = 0;
}

describe('Navegação (tg-app-bar, tg-nav, tg-account-menu)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let router: Router;
  const q = <T extends Element = HTMLElement>(selector: string) => fixture.nativeElement.querySelector(selector) as T;
  const qa = (selector: string) => Array.from(fixture.nativeElement.querySelectorAll(selector)) as HTMLElement[];
  const go = async (url: string) => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: PageComponent }])] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    router = TestBed.inject(Router);
    await go('/customer');
  });

  describe('tg-nav', () => {
    it('é um landmark "Principal" com uma lista de links, não tablist', () => {
      const nav = q('nav.tg-nav');
      expect(nav.getAttribute('aria-label')).toBe('Principal');
      expect(nav.querySelector('[role]')).toBeNull();
      const links = qa('.tg-nav__link');
      expect(links.map((a) => a.tagName)).toEqual(['A', 'A', 'A', 'A', 'A']);
      expect(links.map((a) => a.getAttribute('href'))).toEqual([
        '/customer',
        '/customer/search',
        '/pedidos',
        '/customer/favorites',
        '/conta',
      ]);
    });

    it('o nome de cada link é o rótulo visível; o ícone é decorativo', () => {
      const links = qa('.tg-nav__link');
      expect(links.map((a) => accessibleName(a))).toEqual(['Início', 'Buscar', 'Pedidos', 'Favoritos', 'Conta']);
      for (const svg of qa('.tg-nav__link svg')) expect(svg.getAttribute('aria-hidden')).toBe('true');
    });

    it('marca o atual com aria-current e ícone preenchido; a home só com a rota exata', async () => {
      const current = () => qa('.tg-nav__link[aria-current="page"]').map((a) => a.textContent?.trim());
      expect(current()).toEqual(['Início']);

      await go('/customer/search?categoria=limpeza');
      expect(current()).toEqual(['Buscar']);

      await go('/pedidos/1042');
      expect(current()).toEqual(['Pedidos']);
      const pedidos = qa('.tg-nav__link')[2];
      const inicio = qa('.tg-nav__link')[0];
      // O preenchido do Phosphor tem desenho diferente do contorno.
      expect(pedidos.querySelector('svg')?.innerHTML).not.toBe(
        (() => {
          return inicio.querySelector('svg')?.innerHTML;
        })(),
      );
      expect(pedidos.classList).toContain('tg-nav__link--current');
      expect(inicio.classList).not.toContain('tg-nav__link--current');
    });

    it('a aba da Conta só aparece abaixo de 1024 px', () => {
      const conta = q('.tg-nav__entry--compact');
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      expect(getComputedStyle(conta).display).toBe(wide ? 'none' : 'flex');
    });

    it('rótulos com 13 px no celular e sem quebra', () => {
      const label = q('.tg-nav__label');
      expect(getComputedStyle(label).whiteSpace).toBe('nowrap');
      if (!window.matchMedia('(min-width: 1024px)').matches) expect(getComputedStyle(label).fontSize).toBe('13px');
    });
  });

  describe('tg-app-bar', () => {
    it('é um banner com a marca ligada à home', () => {
      const header = q('tg-app-bar header');
      expect(header).not.toBeNull();
      const brand = q<HTMLAnchorElement>('.tg-app-bar__brand');
      expect(brand.getAttribute('href')).toBe('/customer');
      expect(accessibleName(brand)).toBe('TaskGo');
    });

    it('"Pular para o conteúdo" é o primeiro link e foca o main sem trocar a rota', async () => {
      const skip = q<HTMLAnchorElement>('.tg-app-bar__skip');
      const first = q('tg-app-bar').querySelector('a, button');
      expect(first).toBe(skip);
      expect(skip.getAttribute('href')).toBe('#conteudo');
      skip.click();
      await fixture.whenStable();
      expect(document.activeElement).toBe(q('#conteudo'));
      expect(q('#conteudo').getAttribute('tabindex')).toBe('-1');
      expect(router.url).toBe('/customer');
    });

    it('o link de pular fica visível ao receber foco', () => {
      const skip = q('.tg-app-bar__skip');
      expect(getComputedStyle(skip).transform).not.toBe('none');
      skip.focus();
      expect(getComputedStyle(skip).transform).toBe('none');
    });
  });

  describe('tg-account-menu', () => {
    // O menu só aparece a partir de 1024 px (abaixo, a conta é uma aba). O
    // Karma roda numa janela menor, então os testes de comportamento mostram
    // o menu à força; a troca por largura é conferida pelo teste abaixo e no
    // navegador, no Storybook.
    beforeEach(() => {
      if (!window.matchMedia('(min-width: 1024px)').matches) q('tg-account-menu').style.display = 'block';
    });

    it('só aparece a partir de 1024 px', () => {
      q('tg-account-menu').style.display = '';
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      expect(getComputedStyle(q('tg-account-menu')).display).toBe(wide ? 'block' : 'none');
    });

    const trigger = () => q<HTMLButtonElement>('.tg-account__trigger');
    const panel = () => q('.tg-account__panel');
    const open = async () => {
      trigger().click();
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('botão fechado, com aria-expanded e aria-controls; nome inclui o texto visível', () => {
      expect(trigger().type).toBe('button');
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(trigger().getAttribute('aria-controls')).toBe(panel().id);
      expect(panel().hidden).toBeTrue();
      expect(accessibleName(trigger())).toBe('Conta de Ana');
      expect(q('.tg-account__avatar').textContent?.trim()).toBe('AS');
    });

    it('abre uma lista de links com o sair por último, sem role=menu', async () => {
      await open();
      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(panel().hidden).toBeFalse();
      expect(panel().querySelector('[role]')).toBeNull();
      const items = Array.from(panel().querySelectorAll('.tg-account__item')) as HTMLElement[];
      expect(items.map((el) => el.tagName)).toEqual(['A', 'A', 'BUTTON']);
      expect(items.map((el) => el.textContent?.trim())).toEqual(['Dados pessoais', 'Endereços', 'Sair da conta']);
      expect(panel().textContent).toContain('Ana Souza');
      expect(panel().textContent).toContain('Cliente');
    });

    it('Esc fecha e devolve o foco ao botão', async () => {
      await open();
      (panel().querySelector('a') as HTMLElement).focus();
      panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(panel().hidden).toBeTrue();
      expect(document.activeElement).toBe(trigger());
    });

    it('clique fora fecha; clique dentro não', async () => {
      await open();
      (panel().querySelector('.tg-account__who') as HTMLElement).click();
      fixture.detectChanges();
      expect(panel().hidden).toBeFalse();
      q('#fora').click();
      fixture.detectChanges();
      expect(panel().hidden).toBeTrue();
    });

    it('o foco sair do menu fecha', async () => {
      await open();
      (panel().querySelector('a') as HTMLElement).focus();
      q('#fora').focus();
      fixture.detectChanges();
      expect(panel().hidden).toBeTrue();
    });

    it('escolher um link fecha; sair emite signOut e fecha', async () => {
      await open();
      (panel().querySelector('a') as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(panel().hidden).toBeTrue();
      expect(router.url).toBe('/conta');

      await open();
      (panel().querySelector('button') as HTMLElement).click();
      fixture.detectChanges();
      expect(host.saidas).toBe(1);
      expect(panel().hidden).toBeTrue();
    });

    it('iniciais de nome único e com espaços extras', () => {
      host.nome.set('  Marina   ');
      fixture.detectChanges();
      expect(q('.tg-account__avatar').textContent?.trim()).toBe('MA');
      expect(accessibleName(trigger())).toBe('Conta de Marina');
    });

    it('alvos de pelo menos 44 px', async () => {
      expect(trigger().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    });
  });
});
