import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TG_ACCOUNT_MENU_MEDIA, TgAccountMenuComponent } from './tg-account-menu.component';

@Component({ template: '' })
class PageComponent {}

@Component({
  imports: [TgAccountMenuComponent],
  template: `
    @if (show()) {
      <tg-account-menu
        name="Ana Souza"
        [links]="[{ label: 'Dados pessoais', icon: 'user', link: '/conta' }]"
        (signOut)="saidas = saidas + 1"
        style="display:block"
      />
    }
    <button type="button" id="fora">Fora</button>
  `,
})
class HostComponent {
  readonly show = signal(true);
  saidas = 0;
}

/** MediaQueryList controlado pelo teste: o Karma não muda a largura da janela. */
class FakeMediaQuery extends EventTarget {
  constructor(public matches: boolean) {
    super();
  }
  change(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(Object.assign(new Event('change'), { matches }));
  }
}

describe('TgAccountMenuComponent: breakpoint de 1024 px', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let media: FakeMediaQuery;
  let matchMedia: jasmine.Spy;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => fixture.nativeElement.querySelector(s) as T;
  const trigger = () => q<HTMLButtonElement>('.tg-account__trigger');
  const panel = () => q('.tg-account__panel');
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const open = async () => {
    trigger().click();
    await render();
  };
  const expectOpen = (value: boolean) => {
    expect(trigger().getAttribute('aria-expanded')).toBe(String(value));
    expect(panel().hidden).toBe(!value);
  };

  beforeEach(async () => {
    media = new FakeMediaQuery(true);
    const real = window.matchMedia.bind(window);
    matchMedia = spyOn(window, 'matchMedia').and.callFake((query: string) =>
      query === TG_ACCOUNT_MENU_MEDIA ? (media as unknown as MediaQueryList) : real(query),
    );
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: PageComponent }])] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await render();
  });

  it('começa fechado e abre no desktop', async () => {
    expectOpen(false);
    expect(trigger().getAttribute('aria-controls')).toBe(panel().id);
    await open();
    expectOpen(true);
  });

  it('ir para o celular fecha; voltar ao desktop mantém fechado', async () => {
    await open();
    media.change(false);
    await render();
    expectOpen(false);

    media.change(true);
    await render();
    expectOpen(false);
  });

  it('ao fechar pelo breakpoint, não move o foco para o botão oculto', async () => {
    await open();
    (panel().querySelector('a') as HTMLElement).focus();
    media.change(false);
    await render();
    expect(document.activeElement).not.toBe(trigger());
  });

  it('mudanças dentro do desktop não fecham', async () => {
    await open();
    media.change(true);
    await render();
    expectOpen(true);
  });

  it('os outros fechamentos continuam: Esc com foco, clique fora, foco saindo, link e sair', async () => {
    await open();
    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await render();
    expectOpen(false);
    expect(document.activeElement).toBe(trigger());

    await open();
    q('#fora').click();
    await render();
    expectOpen(false);

    await open();
    (panel().querySelector('a') as HTMLElement).focus();
    q('#fora').focus();
    await render();
    expectOpen(false);

    await open();
    (panel().querySelector('a') as HTMLElement).click();
    await render();
    expectOpen(false);
    expect(TestBed.inject(Router).url).toBe('/conta');

    await open();
    (panel().querySelector('button') as HTMLElement).click();
    await render();
    expectOpen(false);
    expect(host.saidas).toBe(1);
  });

  it('destruído: remove o listener do breakpoint', async () => {
    const remove = spyOn(media, 'removeEventListener').and.callThrough();
    host.show.set(false);
    await render();
    expect(remove).toHaveBeenCalledOnceWith('change', jasmine.any(Function));
    // Uma mudança depois não chega a um componente destruído.
    expect(() => media.change(false)).not.toThrow();
  });

  it('registra um listener só, para o breakpoint do CSS', () => {
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
    expect(matchMedia.calls.allArgs().filter(([query]) => query === TG_ACCOUNT_MENU_MEDIA).length).toBe(1);
  });
});

describe('TgAccountMenuComponent: no servidor', () => {
  it('renderiza sem tocar em matchMedia', async () => {
    const matchMedia = spyOn(window, 'matchMedia').and.callThrough();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const fixture = TestBed.createComponent(TgAccountMenuComponent);
    fixture.componentRef.setInput('name', 'Ana Souza');
    expect(() => fixture.detectChanges()).not.toThrow();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.tg-account__trigger')).not.toBeNull();
    expect(matchMedia.calls.allArgs().some(([query]) => query === TG_ACCOUNT_MENU_MEDIA)).toBeFalse();
  });
});
