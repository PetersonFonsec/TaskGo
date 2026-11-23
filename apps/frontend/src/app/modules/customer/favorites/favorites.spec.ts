import { HttpErrorResponse } from '@angular/common/http';
import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type Observable, of, Subject, throwError } from 'rxjs';

import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Favorites } from './favorites';

const item = (id: string, name = 'Profissional ' + id) => ({
  provider: {
    id,
    verified: true,
    ratingAvg: 4.8,
    ratingCount: 10,
    user: { id: 'u' + id, name },
    services: [{ id: 's' + id, title: 'Serviço ' + id, basePrice: 100, status: 'ATIVO' }],
  },
});

describe('Favorites', () => {
  let fixture: ComponentFixture<Favorites>;
  let component: Favorites;
  let el: HTMLElement;
  let session: WritableSignal<unknown>;
  const api = {
    listFavorites: jasmine.createSpy('listFavorites'),
    addFavorite: jasmine.createSpy('addFavorite'),
    removeFavorite: jasmine.createSpy('removeFavorite'),
  };

  async function setup(
    list: Observable<unknown>,
    user: unknown = { user: { id: 'client-1', type: 'CLIENTE' } },
  ) {
    api.listFavorites.and.returnValue(list);
    session.set(user);
    await TestBed.configureTestingModule({
      imports: [Favorites],
      providers: [
        provideRouter([]),
        { provide: Provider, useValue: api },
        { provide: UserLoggedService, useValue: { user: session } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Favorites);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    flush();
  }
  const flush = () => {
    TestBed.tick();
    fixture.detectChanges();
  };
  const names = () =>
    Array.from(el.querySelectorAll('.tg-provider-card__name')).map((n) => n.textContent?.trim());
  const heart = (index: number) =>
    el.querySelectorAll<HTMLButtonElement>('.tg-provider-card__favorite')[index];

  beforeEach(() => {
    session = signal<unknown>(null);
    api.listFavorites.calls.reset();
    api.addFavorite.calls.reset();
    api.removeFavorite.calls.reset();
    api.addFavorite.and.returnValue(of({}));
    api.removeFavorite.and.returnValue(of({}));
  });

  it('carrega os favoritos da sessão uma vez e mostra os cards com link para o perfil', async () => {
    await setup(of({ items: [item('1', 'Bruno Lima'), item('2', 'Carla Dias')], total: 2 }));
    expect(api.listFavorites).toHaveBeenCalledOnceWith('client-1', { skip: 0, take: 20 });
    expect(el.querySelector('h1')?.textContent).toContain('Favoritos');
    expect(names()).toEqual(['Bruno Lima', 'Carla Dias']);
    expect(el.querySelector('.tg-provider-card__name a')?.getAttribute('href')).toBe('/customer/1');
    expect(el.querySelector('.favorites__lead')?.textContent).toContain('2 profissionais salvos');
  });

  it('com mais favoritos que a API mandou, avisa quantos mostra do total', async () => {
    await setup(of({ items: [item('1'), item('2')], total: 25 }));
    expect(el.querySelector('.favorites__lead')?.textContent).toContain('mostrando 2 de 25');
  });

  it('ignora itens sem id válido e repetidos', async () => {
    await setup(of({ items: [item('1'), { provider: { user: { name: 'Sem id' } } }, item('1')] }));
    expect(component.providers().map((p) => p.id)).toEqual(['1']);
  });

  it('sem favoritos: estado vazio com a busca', async () => {
    await setup(of({ items: [], total: 0 }));
    const empty = el.querySelector('tg-empty-state');
    expect(empty?.textContent).toContain('Nenhum favorito ainda');
    expect(empty?.querySelector('a')?.getAttribute('href')).toBe('/customer/search');
  });

  it('falha: alerta com "Tentar de novo", que recarrega', async () => {
    await setup(throwError(() => new Error('offline')));
    expect(el.querySelector('tg-alert')?.textContent).toContain(
      'Não foi possível carregar seus favoritos',
    );
    api.listFavorites.and.returnValue(of({ items: [item('1')] }));
    el.querySelector<HTMLButtonElement>('tg-alert button[tgButton]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('tg-alert')).toBeNull();
    expect(component.providers().length).toBe(1);
  });

  it('enquanto carrega, mostra o skeleton e nenhum card', async () => {
    await setup(new Subject());
    expect(component.loading()).toBeTrue();
    expect(el.querySelector('tg-provider-card')).toBeNull();
  });

  // Regressão: a contagem saía dos cards carregados, não do `total` da API.
  describe('contagem com a lista paginada', () => {
    const twenty = () => ({
      items: Array.from({ length: 20 }, (_, i) => item(String(i + 1))),
      total: 25,
    });
    const lead = () =>
      el.querySelector('.favorites__lead')?.textContent?.replace(/\s+/g, ' ') ?? '';

    it('20 itens de 25: conta 25 e oferece carregar a próxima página', async () => {
      await setup(of(twenty()));
      expect(component.favoriteCount()).toBe(25);
      expect(lead()).toContain('25 profissionais salvos');
      expect(lead()).toContain('mostrando 20 de 25');
      expect(el.querySelector<HTMLButtonElement>('button[tgButton]')?.textContent).toContain(
        'Ver mais',
      );
    });

    it('carrega o restante dos favoritos sob demanda e mantém a primeira página', async () => {
      await setup(of(twenty()));
      api.listFavorites.and.callFake((_clientId: string, paging: { skip: number; take: number }) =>
        of({ items: Array.from({ length: 5 }, (_, i) => item(String(21 + i))), total: 25 }),
      );

      component.loadMore();
      fixture.detectChanges();

      expect(api.listFavorites).toHaveBeenCalledWith('client-1', { skip: 20, take: 20 });
      expect(component.providers().length).toBe(25);
      expect(component.total()).toBe(25);
      expect(el.querySelector<HTMLButtonElement>('button[tgButton]')).toBeNull();
    });

    it('tirar um vai para 24; devolver volta para 25; repetir não desvia', async () => {
      await setup(of(twenty()));
      component.toggle('3', false);
      flush();
      expect(component.favoriteCount()).toBe(24);
      expect(lead()).toContain('24 profissionais salvos');
      component.toggle('3', true);
      flush();
      expect(component.favoriteCount()).toBe(25);
      for (let i = 0; i < 3; i++) {
        component.toggle('3', false);
        component.toggle('3', true);
        component.toggle('7', false);
        component.toggle('7', true);
      }
      expect(component.favoriteCount()).toBe(25);
      component.toggle('3', false);
      component.toggle('7', false);
      expect(component.favoriteCount()).toBe(23);
    });

    it('uma troca que falha não muda a contagem', async () => {
      api.removeFavorite.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await setup(of(twenty()));
      component.toggle('3', false);
      flush();
      expect(component.favoriteCount()).toBe(25);
    });

    it('nunca fica negativa', async () => {
      await setup(of({ items: [item('1'), item('2')], total: 0 }));
      component.toggle('1', false);
      component.toggle('2', false);
      expect(component.favoriteCount()).toBe(0);
    });

    it('recarregar volta aos números da API', async () => {
      await setup(of(twenty()));
      component.toggle('1', false);
      expect(component.favoriteCount()).toBe(24);
      api.listFavorites.and.returnValue(of({ items: twenty().items.slice(1), total: 24 }));
      component.load();
      flush();
      expect(component.favorite()['1']).toBeUndefined();
      expect(component.providers().length).toBe(19);
      expect(component.favoriteCount()).toBe(24);
    });

    it('outra conta zera a contagem e usa o total da nova', async () => {
      const second = new Subject<unknown>();
      await setup(of(twenty()));
      component.toggle('3', false);
      api.listFavorites.and.returnValue(second);
      session.set({ user: { id: 'client-2' } });
      flush();
      expect(component.favoriteCount()).toBe(0);
      second.next({ items: [item('9')], total: 4 });
      flush();
      expect(component.favoriteCount()).toBe(4);
    });
  });

  describe('coração', () => {
    it('tirar: chama a API, o card fica com o coração vazio e a contagem cai', async () => {
      await setup(of({ items: [item('1'), item('2')] }));
      heart(0).click();
      fixture.detectChanges();
      expect(api.removeFavorite).toHaveBeenCalledOnceWith('client-1', '1');
      expect(names().length).toBe(2);
      expect(heart(0).getAttribute('aria-pressed')).toBe('false');
      expect(el.querySelector('.favorites__lead')?.textContent).toContain('1 profissional salvo');
    });

    it('outro toque devolve aos favoritos', async () => {
      await setup(of({ items: [item('1')] }));
      heart(0).click();
      fixture.detectChanges();
      heart(0).click();
      fixture.detectChanges();
      expect(api.addFavorite).toHaveBeenCalledOnceWith('client-1', '1');
      expect(heart(0).getAttribute('aria-pressed')).toBe('true');
    });

    it('duplo toque enquanto a troca corre não repete a chamada', async () => {
      const pending = new Subject<unknown>();
      api.removeFavorite.and.returnValue(pending);
      await setup(of({ items: [item('1')] }));
      component.toggle('1', false);
      component.toggle('1', false);
      expect(api.removeFavorite).toHaveBeenCalledTimes(1);
      expect(component.busy().has('1')).toBeTrue();
    });

    it('trocas de profissionais diferentes não soltam uma à outra', async () => {
      const a = new Subject<unknown>();
      const b = new Subject<unknown>();
      api.removeFavorite.and.callFake((_: string, id: string) => (id === '1' ? a : b));
      await setup(of({ items: [item('1'), item('2')] }));
      component.toggle('1', false);
      component.toggle('2', false);
      a.next({});
      a.complete();
      expect([...component.busy()]).toEqual(['2']);
      expect(component.favorite()['1']).toBeFalse();
      expect(component.favorite()['2']).toBeTrue();
    });

    it('falha: mostra o motivo, solta o botão e mantém o coração cheio', async () => {
      api.removeFavorite.and.returnValue(
        throwError(
          () => new HttpErrorResponse({ status: 500, error: { message: 'Falhou no servidor' } }),
        ),
      );
      await setup(of({ items: [item('1')] }));
      heart(0).click();
      fixture.detectChanges();
      expect(el.querySelector('tg-alert')?.textContent).toContain('Falhou no servidor');
      expect(component.busy().size).toBe(0);
      expect(heart(0).getAttribute('aria-pressed')).toBe('true');
    });

    // Regressão: os callbacks da troca não conferiam se a conta ainda era a mesma.
    describe('troca de conta com a troca do coração em curso', () => {
      const switchToB = () => session.set({ user: { id: 'client-2', type: 'CLIENTE' } });

      it('a resposta tardia de A não muda B, mesmo antes de a tela reagir à troca', async () => {
        const pending = new Subject<unknown>();
        api.removeFavorite.and.returnValue(pending);
        await setup(of({ items: [item('1')], total: 1 }));
        api.listFavorites.and.returnValue(of({ items: [item('1')], total: 1 }));
        component.toggle('1', false);
        switchToB();
        pending.next({});
        pending.complete();
        expect(component.favorite()['1']).toBeTrue();
        flush();
        expect(component.favorite()['1']).toBeTrue();
        expect(component.busy().size).toBe(0);
        expect(component.favoriteCount()).toBe(1);
      });

      it('o erro tardio de A não aparece para B', async () => {
        const pending = new Subject<unknown>();
        api.removeFavorite.and.returnValue(pending);
        await setup(of({ items: [item('1')], total: 1 }));
        api.listFavorites.and.returnValue(of({ items: [item('2')], total: 1 }));
        component.toggle('1', false);
        switchToB();
        pending.error(new HttpErrorResponse({ status: 500, error: { message: 'Falhou para A' } }));
        expect(component.actionError()).toBe('');
        flush();
        expect(component.actionError()).toBe('');
        expect(el.textContent).not.toContain('Falhou para A');
      });

      it('trocar de conta cancela o pedido de A e B troca o mesmo profissional normalmente', async () => {
        const forA = new Subject<unknown>();
        const forB = new Subject<unknown>();
        await setup(of({ items: [item('1')], total: 1 }));
        api.listFavorites.and.returnValue(of({ items: [item('1')], total: 1 }));
        api.removeFavorite.and.returnValue(forA);
        component.toggle('1', false);
        switchToB();
        flush();
        expect(forA.observed).toBeFalse();
        api.removeFavorite.and.returnValue(forB);
        component.toggle('1', false);
        expect(component.busy().has('1')).toBeTrue();
        expect(forB.observed).toBeTrue();
        forB.next({});
        forB.complete();
        expect(component.favorite()['1']).toBeFalse();
        expect(component.busy().size).toBe(0);
      });
    });

    it('destruir a tela com troca em curso cancela a chamada', async () => {
      const pending = new Subject<unknown>();
      api.removeFavorite.and.returnValue(pending);
      await setup(of({ items: [item('1')] }));
      component.toggle('1', false);
      expect(pending.observed).toBeTrue();
      fixture.destroy();
      expect(pending.observed).toBeFalse();
    });
  });

  describe('sessão', () => {
    it('outra conta: cancela a lista anterior, limpa e carrega a nova', async () => {
      const first = new Subject<unknown>();
      const second = new Subject<unknown>();
      api.listFavorites.and.returnValues(first, second);
      session.set({ user: { id: 'a' } });
      await TestBed.configureTestingModule({
        imports: [Favorites],
        providers: [
          provideRouter([]),
          { provide: Provider, useValue: api },
          { provide: UserLoggedService, useValue: { user: session } },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(Favorites);
      component = fixture.componentInstance;
      flush();
      session.set({ user: { id: 'b' } });
      flush();
      expect(first.observed).toBeFalse();
      expect(api.listFavorites.calls.mostRecent().args).toEqual(['b', { skip: 0, take: 20 }]);
      first.next({ items: [item('velho')] });
      second.next({ items: [item('2')] });
      expect(component.providers().map((p) => p.id)).toEqual(['2']);
    });

    it('sessão sem id: não consulta e mostra o erro', async () => {
      await setup(of({ items: [] }), {});
      expect(api.listFavorites).not.toHaveBeenCalled();
      expect(el.querySelector('tg-alert')?.textContent).toContain('Não foi possível carregar');
    });
  });
});
