import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Notification as NotificationApi } from '@shared/components/functional/notification/notification.service';
import { Header } from './header';
import { resolveShellNavigation } from './navigation.constant';

describe('Header (shell logado)', () => {
  const user = signal<any>({});
  const logout = jasmine.createSpy('logout');

  beforeEach(async () => {
    logout.calls.reset();
    user.set({ user: { id: '42', type: 'CLIENTE', name: 'Ana Souza', photoUrl: '' } });
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        { provide: UserLoggedService, useValue: { user, logout } },
        { provide: NotificationApi, useValue: { list: () => of({ items: [], total: 0, unreadCount: 0 }), markAllRead: () => of({ updatedCount: 0, unreadCount: 0 }), markRead: () => of({ updated: true, notificationId: '1' }) } },
      ],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function navLabels(el: HTMLElement) {
    return Array.from(el.querySelectorAll('nav .tg-nav__label')).map((n) => n.textContent?.trim());
  }

  it('mostra a marca TaskGo, os destinos do cliente e o nome real na conta', () => {
    const el = render();
    expect(el.querySelector('.tg-app-bar__brand')?.textContent).toContain('TaskGo');
    expect(el.querySelector('.tg-app-bar__brand')?.getAttribute('href')).toBe('/customer');
    expect(navLabels(el)).toEqual(['Início', 'Buscar', 'Pedidos', 'Favoritos', 'Conta']);
    expect(el.textContent).toContain('Ana Souza');
    expect(el.textContent).toContain('Cliente');
    expect(el.textContent).not.toContain('Proxi');
    expect(el.textContent).not.toContain('Admin');
  });

  it('troca para os destinos do profissional quando a sessão muda', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    user.set({ user: { id: '77', type: 'PRESTADOR', name: 'Bruno Lima' } });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(navLabels(el)).toEqual(['Agenda', 'Pedidos', 'Serviços', 'Ganhos', 'Conta']);
    expect(el.querySelector('.tg-app-bar__brand')?.getAttribute('href')).toBe('/provider');
    const hrefs = Array.from(el.querySelectorAll('.tg-account__item[href]')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/general/77/profile', '/general/77/addresses']);
    expect(el.textContent).toContain('Profissional');
  });

  it('usa as iniciais sem foto e a foto quando existe', () => {
    let el = render();
    expect(el.querySelector('.tg-account__avatar')?.textContent?.trim()).toBe('AS');
    user.set({ user: { id: '42', type: 'CLIENTE', name: 'Ana Souza', photoUrl: 'https://cdn.example/ana.jpg' } });
    el = render();
    expect(el.querySelector('.tg-account__avatar img')?.getAttribute('src')).toBe('https://cdn.example/ana.jpg');
  });

  it('"Sair da conta" encerra a sessão', () => {
    const el = render();
    const button = Array.from(el.querySelectorAll<HTMLButtonElement>('.tg-account__item')).find((b) =>
      b.textContent?.includes('Sair da conta'),
    );
    button!.click();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('mostra o botão de notificações com um nome acessível', () => {
    const el = render();
    expect(el.querySelector('app-notification')).not.toBeNull();
    const names = Array.from(el.querySelectorAll('button, a')).map(
      (control) => control.getAttribute('aria-label') ?? control.textContent?.trim() ?? '',
    );
    expect(names.some((name) => /notifica/i.test(name))).toBeTrue();
  });

  it('sem sessão mostra só a marca', () => {
    user.set({});
    const el = render();
    expect(el.querySelector('.tg-app-bar__brand')).not.toBeNull();
    expect(el.querySelectorAll('nav a').length).toBe(0);
    expect(el.querySelector('tg-account-menu')).toBeNull();
  });
});

describe('resolveShellNavigation', () => {
  it('aceita o papel do back e do front e recusa sem papel ou id', () => {
    expect(resolveShellNavigation('PRESTADOR', '1')?.roleLabel).toBe('Profissional');
    expect(resolveShellNavigation('PROVIDER', '1')?.roleLabel).toBe('Profissional');
    expect(resolveShellNavigation('CUSTOMER', '1')?.roleLabel).toBe('Cliente');
    expect(resolveShellNavigation('ADMIN', '1')).toBeNull();
    expect(resolveShellNavigation('CLIENTE', undefined)).toBeNull();
  });

  it('tem no máximo quatro destinos e a Conta leva ao hub da conta', () => {
    const nav = resolveShellNavigation('CLIENTE', '9')!;
    expect(nav.destinations.length).toBe(4);
    expect(nav.account.link).toEqual(['/general', '9', 'home']);
  });
});
