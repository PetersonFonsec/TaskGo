import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { environment } from '@environments/environment';
import { ProviderProfile } from './provider-profile';
import { providerProfileView } from './provider-profile.view';

const URL = environment.url + '/provider/12';

/** Formato de GET /provider/:id (GetProviderHandler: publicProviderSelect + createdAt + reviews). */
const PROVIDER = {
  id: '12',
  bio: 'Eletricista há 12 anos, com NR-10.',
  ratingAvg: '4.8',
  ratingCount: 3,
  verified: true,
  createdAt: '2025-11-10T15:00:00.000Z',
  user: { id: '12', name: 'Bruno Lima Souza', photoUrl: null },
  services: [
    { id: '2', providerId: '12', title: 'Troca de tomada', description: null, category: 'eletrica', basePrice: '89.9', status: 'ATIVO' },
    { id: '1', providerId: '12', title: 'Instalação de chuveiro', description: 'Com teste de carga.', category: 'eletrica', basePrice: '120', status: 'ATIVO' },
  ],
  locations: [{ lat: -23.56, lng: -46.65 }],
  reviews: [
    { id: '7', rating: 5, comment: 'Chegou no horário e deixou tudo limpo.', reviewedAt: '2026-11-12T13:00:00.000Z' },
    { id: '6', rating: 4, comment: null, reviewedAt: '2026-10-02T13:00:00.000Z' },
  ],
};

describe('ProviderProfile (Perfil do profissional)', () => {
  let fixture: ComponentFixture<ProviderProfile>;
  let el: HTMLElement;
  let http: HttpTestingController;

  function setup(preview = false) {
    TestBed.configureTestingModule({
      imports: [ProviderProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: preview ? { preview: true } : {}, paramMap: convertToParamMap({ userId: '12' }) },
            paramMap: of(convertToParamMap({ userId: '12' })),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ProviderProfile);
    el = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  const render = () => fixture.detectChanges();
  const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
  const respond = (body: object | null) => {
    http.expectOne(URL).flush(body);
    render();
  };
  const fail = (status: number) => {
    http.expectOne(URL).flush({ message: 'erro' }, { status, statusText: 'Erro' });
    render();
  };

  describe('cliente', () => {
    beforeEach(() => setup());

    it('busca o perfil pelo id da rota e fica carregando até a resposta', () => {
      const request = http.expectOne(URL);
      expect(request.request.method).toBe('GET');
      expect(fixture.componentInstance.loading()).toBeTrue();
      expect(el.querySelector('tg-loading')).toBeTruthy();
      expect(el.querySelector('h1')).toBeNull();
      request.flush(PROVIDER);
      render();
      expect(fixture.componentInstance.loading()).toBeFalse();
    });

    it('mostra o perfil completo com serviços, avaliações e o botão de agendar', () => {
      respond(PROVIDER);

      expect(el.querySelectorAll('h1').length).toBe(1);
      expect(el.querySelector('h1')?.textContent?.trim()).toBe('Bruno Lima Souza');
      expect(text()).toContain('Verificado');
      expect(text()).toContain('Nota 4,8 de 5, 3 avaliações');
      expect(text()).toContain('No TaskGo desde novembro de 2025');
      expect(text()).toContain('Eletricista há 12 anos, com NR-10.');
      expect(el.querySelector('.profile__photo')?.textContent?.trim()).toBe('BS');

      const services = Array.from(el.querySelectorAll('.service__title')).map((h) => h.textContent?.trim());
      expect(services).toEqual(['Instalação de chuveiro', 'Troca de tomada']);
      expect(text()).toContain('a partir de R$ 120');
      expect(text()).toContain('R$ 89,90');

      const reviews = el.querySelectorAll('.review');
      expect(reviews.length).toBe(2);
      expect(reviews[0].querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Nota 5 de 5');
      expect(reviews[0].textContent).toContain('Chegou no horário');
      expect(reviews[1].textContent).toContain('Sem comentário.');
      expect(text()).toContain('Mostrando as 2 avaliações mais recentes.');

      const cta = Array.from(el.querySelectorAll('a')).find((a) => a.textContent?.includes('Agendar serviço'));
      expect(cta?.getAttribute('href')).toBe('/customer/12');
      expect(el.querySelector('a[href="/customer"]')?.textContent).toContain('Voltar para profissionais');
      expect(el.querySelector('[role="alert"]')).toBeNull();
    });

    it('sem avaliações: estado vazio e "Novo no TaskGo", nunca 0,0', () => {
      respond({ ...PROVIDER, ratingAvg: '0', ratingCount: 0, reviews: [] });

      expect(text()).toContain('Ainda sem avaliações');
      expect(text()).toContain('Novo no TaskGo');
      expect(text()).not.toContain('0,0');
      expect(text()).not.toContain('Mostrando as');
    });

    it('sem serviços ativos: estado vazio na seção de serviços', () => {
      respond({ ...PROVIDER, services: [{ ...PROVIDER.services[0], status: 'INATIVO' }] });

      expect(el.querySelectorAll('.service').length).toBe(0);
      expect(text()).toContain('Nenhum serviço ativo');
      expect(text()).toContain('Este profissional não tem serviços disponíveis agora.');
    });

    it('sem apresentação nem foto: a apresentação some e aparecem as iniciais', () => {
      respond({ ...PROVIDER, bio: null, user: { id: '12', name: 'Ana', photoUrl: '' } });

      expect(el.querySelector('.profile__bio')).toBeNull();
      expect(el.querySelector('.profile__photo')?.textContent?.trim()).toBe('A');
    });

    it('contato só quando a API manda: hoje não manda, e a parte some', () => {
      respond({ ...PROVIDER, user: { ...PROVIDER.user, phone: '(11) 99999-0000', email: 'bruno@email.com' } });

      expect(el.querySelector('a[href="tel:11999990000"]')?.textContent).toContain('(11) 99999-0000');
      expect(el.querySelector('a[href="mailto:bruno@email.com"]')).toBeTruthy();
      expect(text()).not.toContain('Região de atendimento');
    });

    it('sem contato na resposta, nada de "Não informado"', () => {
      respond(PROVIDER);

      expect(el.querySelector('.profile__contact')).toBeNull();
      expect(text()).not.toContain('Não informado');
    });

    it('resposta nula (sem perfil público) vira "não encontrado", sem "Tentar de novo"', () => {
      respond(null);

      expect(text()).toContain('Este profissional não foi encontrado');
      expect(text()).not.toContain('Tentar de novo');
      expect(el.querySelector('a[href="/customer/search"]')).toBeTruthy();
      expect(el.querySelector('h1')).toBeNull();
    });

    it('404 e id inválido (400) também viram "não encontrado"', () => {
      fail(404);
      expect(text()).toContain('Este profissional não foi encontrado');

      fixture.componentInstance.reload();
      fail(400);
      expect(text()).toContain('Este profissional não foi encontrado');
    });

    it('falha da API mostra o erro com "Tentar de novo", que busca de novo', () => {
      fail(500);

      const alert = el.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('Não foi possível carregar o perfil');
      const retry = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Tentar de novo'));
      expect(retry).toBeTruthy();

      retry!.click();
      render();
      expect(el.querySelector('[role="alert"]')).toBeNull();
      respond(PROVIDER);
      expect(el.querySelector('h1')?.textContent?.trim()).toBe('Bruno Lima Souza');
    });
  });

  describe('prévia do próprio prestador', () => {
    beforeEach(() => setup(true));

    it('mostra o aviso de prévia, sem "Agendar serviço", e volta para a conta', () => {
      respond(PROVIDER);

      expect(text()).toContain('Prévia do seu perfil público');
      expect(text()).not.toContain('Agendar serviço');
      expect(el.querySelector('a[href="/general/12/profile/view"]')?.textContent).toContain('Voltar para minha conta');
    });

    it('perfil ainda não público: aviso com "Ver meus serviços", não erro', () => {
      respond(null);

      expect(text()).toContain('Seu perfil ainda não aparece para os clientes');
      expect(el.querySelector('a[href="/provider/services"]')).toBeTruthy();
      expect(el.querySelector('[role="alert"]')).toBeNull();
    });
  });
});

describe('providerProfileView', () => {
  it('lê nota Decimal do Prisma e contagem', () => {
    const view = providerProfileView({ ...PROVIDER, ratingAvg: { s: 1, e: 0, d: [4, 5000000] }, ratingCount: 10 });
    expect(view?.rating?.label).toBe('Nota 4,5 de 5, 10 avaliações');
    expect(view?.moreReviews).toBeTrue();
  });

  it('nota fora de 1 a 5 ou contagem inválida não aparece', () => {
    expect(providerProfileView({ ...PROVIDER, ratingAvg: 6 })?.rating).toBeNull();
    expect(providerProfileView({ ...PROVIDER, ratingCount: 0 })?.rating).toBeNull();
    expect(providerProfileView({ ...PROVIDER, ratingCount: 1.5 })?.rating).toBeNull();
    expect(providerProfileView({ ...PROVIDER, ratingAvg: 5, ratingCount: 1 })?.rating?.label).toBe('Nota 5,0 de 5, 1 avaliação');
  });

  it('descarta avaliação com nota inválida e serviço sem título; preço inválido vira sob consulta', () => {
    const view = providerProfileView({
      ...PROVIDER,
      reviews: [{ id: '1', rating: 7 }, { id: '2', rating: 3.5 }, { id: '3', rating: '4', reviewedAt: 'x' }],
      services: [{ id: '1', title: '' }, { id: '2', title: 'Visita', basePrice: '0' }],
    });
    expect(view?.reviews.map((r) => r.id)).toEqual(['3']);
    expect(view?.reviews[0].date).toBeNull();
    expect(view?.services).toEqual([{ id: '2', title: 'Visita', description: null, price: null }]);
  });

  it('data da avaliação no horário de São Paulo', () => {
    const view = providerProfileView({ ...PROVIDER, reviews: [{ id: '1', rating: 5, reviewedAt: '2026-11-13T02:00:00.000Z' }] });
    expect(view?.reviews[0].date).toContain('12');
  });

  it('sem resposta ou sem id válido: null', () => {
    expect(providerProfileView(null)).toBeNull();
    expect(providerProfileView({ ...PROVIDER, id: 'abc' })).toBeNull();
  });
});
