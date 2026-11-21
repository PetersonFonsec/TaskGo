import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Theme } from '@shared/service/theme/theme';
import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { NotFound } from './not-found';

@Component({ template: '' })
class Blank {}

type Session = { token: string; type?: string };

async function setup({ token, type }: Session, from?: string) {
  const setTheme = jasmine.createSpy('setTheme');
  TestBed.configureTestingModule({
    providers: [
      provideLocationMocks(),
      provideRouter([
        { path: 'antes', component: Blank },
        { path: 'customer', component: Blank },
        { path: 'provider', component: Blank },
        { path: 'authenticate', component: Blank },
        { path: '**', component: NotFound },
      ]),
      { provide: TokenService, useValue: { token } },
      {
        provide: UserLoggedService,
        useValue: { user: signal(type ? { user: { id: '7', type, name: 'Ana', photoUrl: '' } } : {}), logout: () => undefined },
      },
      { provide: Theme, useValue: { setTheme } },
    ],
  });
  const harness = await RouterTestingHarness.create(from);
  await harness.navigateByUrl('/endereco-que-nao-existe', NotFound);
  harness.detectChanges();
  return { harness, el: harness.routeNativeElement as HTMLElement, setTheme };
}

const homeLink = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLAnchorElement>('a[tgButton]')].find((a) => a.textContent?.includes('Ir para o início'));
const backButton = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLButtonElement>('button[tgButton]')].find((b) => b.textContent?.includes('Voltar'));

describe('NotFound (Página não encontrada)', () => {
  it('mostra um único h1, o texto, a ilustração decorativa e as duas ações', async () => {
    const { el } = await setup({ token: '' });

    const headings = el.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Página não encontrada');
    expect(el.textContent).toContain('Erro 404');
    expect(el.textContent).toContain('não existe ou mudou de lugar');

    const img = el.querySelector<HTMLImageElement>('img.not-found__illustration');
    expect(img?.getAttribute('src')).toBe('/ilustrations/not-found-ilustration.webp');
    expect(img?.getAttribute('alt')).toBe('');

    expect(homeLink(el)).toBeTruthy();
    expect(backButton(el)?.getAttribute('type')).toBe('button');
    expect(el.querySelector('a[href="/institutional/support"]')?.textContent).toContain('Fale com o suporte');
  });

  it('visitante: "Ir para o início" leva à entrada, no tema do cliente', async () => {
    const { el, setTheme } = await setup({ token: '' });

    expect(homeLink(el)?.getAttribute('href')).toBe('/authenticate');
    expect(setTheme).toHaveBeenCalledWith('CUSTOMER');
  });

  it('usuário salvo sem token conta como visitante, como no userLoggedGuard', async () => {
    const { el } = await setup({ token: '', type: 'PRESTADOR' });

    expect(homeLink(el)?.getAttribute('href')).toBe('/authenticate');
  });

  it('cliente logado: "Ir para o início" leva a /customer', async () => {
    const { el, setTheme } = await setup({ token: 'jwt', type: 'CLIENTE' });

    expect(homeLink(el)?.getAttribute('href')).toBe('/customer');
    expect(setTheme).toHaveBeenCalledWith('CLIENTE');
  });

  it('prestador logado: "Ir para o início" leva a /provider, no tema do prestador', async () => {
    const { el, setTheme } = await setup({ token: 'jwt', type: 'PRESTADOR' });

    expect(homeLink(el)?.getAttribute('href')).toBe('/provider');
    expect(setTheme).toHaveBeenCalledWith('PRESTADOR');
  });

  it('aceita o tipo no formato do enum do front (PROVIDER)', async () => {
    const { el } = await setup({ token: 'jwt', type: 'PROVIDER' });

    expect(homeLink(el)?.getAttribute('href')).toBe('/provider');
  });

  it('"Voltar" volta para a tela anterior do app', async () => {
    const { el } = await setup({ token: 'jwt', type: 'CLIENTE' }, '/antes');
    const location = TestBed.inject(Location);
    const back = spyOn(location, 'back');

    backButton(el)!.click();

    expect(back).toHaveBeenCalled();
  });

  it('"Voltar" sem tela anterior no app (endereço aberto direto) vai ao início', async () => {
    const { el, harness } = await setup({ token: 'jwt', type: 'PRESTADOR' });
    const location = TestBed.inject(Location);
    const back = spyOn(location, 'back');

    backButton(el)!.click();
    await harness.fixture.whenStable();

    expect(back).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/provider');
  });
});
