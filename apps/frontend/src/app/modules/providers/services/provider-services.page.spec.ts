import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '@environments/environment';
import { daysLabel, type Offer, parsePrice, ProviderServicesPage, validate } from './provider-services.page';

const URL = environment.url + '/services';
const CATEGORIES = { data: [{ slug: 'eletrica', name: 'Elétrica' }, { slug: 'montagem', name: 'Montagem' }] };

const offer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 's1',
  title: 'Instalação de chuveiro',
  description: 'Com teste de disjuntor.',
  category: 'eletrica',
  basePrice: '120.00',
  status: 'ATIVO',
  availability: {
    weekdays: Object.fromEntries(
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((d) => [d, [{ start: '09:00', end: '17:00', slotMinutes: 60 }]]),
    ),
  },
  ...overrides,
});

describe('ProviderServicesPage', () => {
  let fixture: ComponentFixture<ProviderServicesPage>;
  let component: ProviderServicesPage;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderServicesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProviderServicesPage);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(environment.url + '/categories?limit=100').flush(CATEGORIES);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  const render = () => fixture.detectChanges();
  const respondList = (offers: Offer[]) => {
    http.expectOne(URL + '/mine').flush(offers);
    render();
  };
  const text = () => el.textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);
  const sheetOpen = () => !!el.querySelector<HTMLDialogElement>('tg-sheet dialog')?.open;
  const dialogOpen = () => !!el.querySelector<HTMLDialogElement>('tg-dialog dialog')?.open;
  const submit = () => {
    button(component.editing() ? 'Salvar alterações' : 'Criar serviço')?.click();
    render();
  };
  const fillValid = () => {
    component.draft = { ...component.draft, title: 'Limpeza residencial', category: 'montagem', price: '1.250,50' };
  };

  it('lista os serviços com selo, categoria, horários e preço', () => {
    respondList([offer(), offer({ id: 's2', title: 'Montagem de móveis', category: 'montagem', status: 'INATIVO', basePrice: 150 })]);

    const cards = el.querySelectorAll('.service');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Ativo');
    expect(cards[0].textContent).toContain('Elétrica');
    expect(cards[0].textContent?.replace(/\s+/g, ' ')).toContain('Seg a Sex · 09:00 às 17:00 · 60 min');
    expect(cards[0].textContent?.replace(/\s/g, ' ')).toContain('R$ 120,00');
    expect(cards[1].textContent).toContain('Inativo');
    expect(cards[1].textContent).toContain('Montagem');
  });

  it('só oferece Desativar para serviços ativos', () => {
    respondList([offer(), offer({ id: 's2', status: 'INATIVO' })]);

    const cards = el.querySelectorAll('.service');
    expect(cards[0].textContent).toContain('Desativar');
    expect(cards[1].textContent).not.toContain('Desativar');
  });

  it('mostra o estado vazio com o aviso de aprovação do perfil', () => {
    respondList([]);

    expect(text()).toContain('Cadastre seu primeiro serviço');
    expect(text()).toContain('Depois da aprovação do seu perfil');
  });

  it('mostra a falha ao carregar e tenta de novo', () => {
    http.expectOne(URL + '/mine').flush('erro', { status: 500, statusText: 'Erro' });
    render();
    expect(text()).toContain('Não foi possível carregar seus serviços');

    button('Tentar de novo')?.click();
    respondList([offer()]);

    expect(text()).not.toContain('Não foi possível carregar seus serviços');
    expect(el.querySelectorAll('.service').length).toBe(1);
  });

  it('não envia o formulário vazio e diz o que corrigir', () => {
    respondList([]);
    button('Novo serviço')?.click();
    render();
    expect(sheetOpen()).toBeTrue();

    submit();

    http.expectNone(URL);
    expect(text()).toContain('Dê um nome com pelo menos 3 letras.');
    expect(text()).toContain('Escolha a categoria do serviço.');
    expect(text()).toContain('Informe um preço entre R$ 0,01 e R$ 100.000.');
    expect(el.querySelector('#service-category')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('exige pelo menos um dia e fim depois do início', () => {
    respondList([]);
    component.openNew();
    fillValid();
    for (const key of Object.keys(component.draft.days)) component.draft.days[key] = false;
    component.draft.start = '18:00';
    component.draft.end = '08:00';
    render();

    submit();

    http.expectNone(URL);
    expect(text()).toContain('Escolha pelo menos um dia.');
    expect(text()).toContain('O fim precisa ser depois do início.');
  });

  it('cria o serviço com o payload de antes, fecha o painel e recarrega', () => {
    respondList([]);
    component.openNew();
    render();
    fillValid();
    component.toggleDay('saturday');
    render();

    submit();

    const request = http.expectOne({ method: 'POST', url: URL });
    expect(request.request.body).toEqual({
      title: 'Limpeza residencial',
      description: '',
      category: 'montagem',
      basePrice: 1250.5,
      status: 'ATIVO',
      availability: {
        timezone: 'America/Sao_Paulo',
        weekdays: Object.fromEntries(
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => [
            d,
            [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
          ]),
        ),
      },
    });
    request.flush({ id: 'novo' });
    render();

    expect(sheetOpen()).toBeFalse();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Serviço criado.');
    respondList([offer({ id: 'novo', title: 'Limpeza residencial' })]);
    expect(el.querySelectorAll('.service').length).toBe(1);
  });

  it('abre Editar com os dados do serviço e salva com PATCH', () => {
    respondList([offer()]);
    button('Editar')?.click();
    render();

    expect(text()).toContain('Editar serviço');
    expect(component.draft.price).toBe('120,00');
    expect(component.draft.days['monday']).toBeTrue();
    expect(component.draft.days['saturday']).toBeFalse();
    expect(el.querySelector('[aria-label="segunda"]')?.getAttribute('aria-pressed')).toBe('true');

    component.draft.active = false;
    submit();

    const request = http.expectOne({ method: 'PATCH', url: URL + '/s1' });
    expect(request.request.body.status).toBe('INATIVO');
    expect(request.request.body.basePrice).toBe(120);
    request.flush({});
    render();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Serviço atualizado.');
    respondList([offer({ status: 'INATIVO' })]);
  });

  it('mantém o painel aberto e mostra a mensagem da API quando salvar falha', () => {
    respondList([]);
    component.openNew();
    fillValid();
    render();

    submit();
    http.expectOne({ method: 'POST', url: URL }).flush({ message: ['Categoria inválida.'] }, { status: 400, statusText: 'Bad Request' });
    render();

    expect(sheetOpen()).toBeTrue();
    expect(text()).toContain('Categoria inválida.');
    expect(component.saving()).toBeFalse();
  });

  it('não envia duas vezes enquanto salva', () => {
    respondList([]);
    component.openNew();
    fillValid();
    render();

    submit();
    component.save();
    submit();

    const requests = http.match({ method: 'POST', url: URL });
    expect(requests.length).toBe(1);
    requests[0].flush({});
    render();
    respondList([]);
  });

  // Regressão: Editar lia só a primeira janela e o envio reescrevia todos os
  // dias com ela, apagando horários diferentes por dia.
  describe('editar preserva os horários', () => {
    const varied = () =>
      offer({
        availability: {
          weekdays: {
            monday: [{ start: '09:00', end: '12:00', slotMinutes: 60 }],
            tuesday: [{ start: '14:00', end: '18:00', slotMinutes: 60 }],
            wednesday: [
              { start: '08:00', end: '11:00', slotMinutes: 60 },
              { start: '13:00', end: '17:00', slotMinutes: 60 },
            ],
          },
        },
      });
    const edit = (o: Offer) => {
      respondList([o]);
      button('Editar')?.click();
      render();
    };
    const patch = () => http.expectOne({ method: 'PATCH', url: URL + '/s1' });
    const finish = (request: ReturnType<typeof patch>, o: Offer) => {
      request.flush({});
      render();
      respondList([o]);
    };

    it('só o título: o PATCH não leva disponibilidade, e todas as janelas ficam', () => {
      edit(varied());
      expect(text()).toContain('Este serviço tem horários diferentes por dia');
      component.draft = { ...component.draft, title: 'Instalação de chuveiro elétrico' };
      submit();
      const request = patch();
      expect(request.request.body.title).toBe('Instalação de chuveiro elétrico');
      expect('availability' in request.request.body).toBeFalse();
      finish(request, varied());
    });

    it('só o preço: o PATCH não leva disponibilidade', () => {
      edit(offer());
      expect(text()).toContain('Os horários só mudam se você alterar os dias ou o horário.');
      component.draft = { ...component.draft, price: '150,00' };
      submit();
      const request = patch();
      expect(request.request.body.basePrice).toBe(150);
      expect('availability' in request.request.body).toBeFalse();
      finish(request, offer());
    });

    it('ativar sem mexer nos horários também mantém os salvos', () => {
      edit(varied());
      component.draft = { ...component.draft, active: false };
      submit();
      const request = patch();
      expect(request.request.body.status).toBe('INATIVO');
      expect('availability' in request.request.body).toBeFalse();
      finish(request, varied());
    });

    it('mudar o horário de um serviço com várias janelas é explícito e manda o horário único escolhido', () => {
      edit(varied());
      component.draft = { ...component.draft, end: '13:00' };
      render();
      submit();
      const request = patch();
      expect(request.request.body.availability).toEqual({
        timezone: 'America/Sao_Paulo',
        weekdays: Object.fromEntries(
          ['monday', 'tuesday', 'wednesday'].map((d) => [d, [{ start: '09:00', end: '13:00', slotMinutes: 60 }]]),
        ),
      });
      finish(request, varied());
    });

    it('mudar só os dias também manda a disponibilidade', () => {
      edit(offer());
      component.toggleDay('saturday');
      submit();
      const request = patch();
      expect(Object.keys(request.request.body.availability.weekdays)).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ]);
      finish(request, offer());
    });

    it('voltar dias e horário ao que eram não manda disponibilidade', () => {
      edit(varied());
      component.toggleDay('friday');
      component.toggleDay('friday');
      component.draft = { ...component.draft, end: '13:00' };
      component.draft = { ...component.draft, end: '12:00' };
      submit();
      const request = patch();
      expect('availability' in request.request.body).toBeFalse();
      finish(request, varied());
    });

    it('sem horários salvos, editar manda a disponibilidade do formulário', () => {
      edit(offer({ availability: null }));
      // Sem horários salvos, o formulário abre sem dias: escolher é obrigatório.
      submit();
      http.expectNone({ method: 'PATCH', url: URL + '/s1' });
      expect(text()).toContain('Escolha pelo menos um dia.');
      component.toggleDay('monday');
      submit();
      const request = patch();
      expect(request.request.body.availability.weekdays.monday).toEqual([{ start: '09:00', end: '17:00', slotMinutes: 60 }]);
      finish(request, offer());
    });

    it('horário inválido não bloqueia salvar quando os horários não vão no envio', () => {
      edit(
        offer({
          availability: { weekdays: { monday: [{ start: '09:00', end: '09:30', slotMinutes: 60 }] } },
        }),
      );
      component.draft = { ...component.draft, title: 'Outro nome' };
      submit();
      const request = patch();
      expect('availability' in request.request.body).toBeFalse();
      finish(request, offer());
    });
  });

  it('recusa intervalo menor que a duração ao salvar', () => {
    respondList([]);
    component.openNew();
    fillValid();
    component.draft = { ...component.draft, start: '09:00', end: '09:30', duration: 60 };
    render();
    submit();
    http.expectNone(URL);
    expect(text()).toContain('O intervalo entre o início e o fim precisa caber pelo menos um atendimento.');
  });

  it('pede confirmação antes de desativar e recarrega depois', () => {
    respondList([offer()]);
    button('Desativar')?.click();
    render();

    expect(dialogOpen()).toBeTrue();
    http.expectNone({ method: 'DELETE' });
    expect(text()).toContain('"Instalação de chuveiro" deixa de aparecer para os clientes.');

    button('Desativar serviço')?.click();
    render();
    http.expectOne({ method: 'DELETE', url: URL + '/s1' }).flush({});
    render();

    expect(dialogOpen()).toBeFalse();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('foi desativado');
    respondList([offer({ status: 'INATIVO' })]);
  });

  it('Voltar fecha a confirmação sem desativar', () => {
    respondList([offer()]);
    button('Desativar')?.click();
    render();

    button('Voltar')?.click();
    render();

    expect(dialogOpen()).toBeFalse();
    http.expectNone({ method: 'DELETE' });
  });

  it('avisa quando desativar falha', () => {
    respondList([offer()]);
    component.askDeactivate(offer());
    component.deactivate();
    http.expectOne({ method: 'DELETE', url: URL + '/s1' }).flush('erro', { status: 500, statusText: 'Erro' });
    render();

    expect(text()).toContain('Não foi possível desativar o serviço. Tente de novo.');
    expect(component.busyDeactivate()).toBeFalse();
  });
});

describe('parsePrice', () => {
  it('aceita vírgula, ponto de milhar e ponto decimal', () => {
    expect(parsePrice('120')).toBe(120);
    expect(parsePrice('120,5')).toBe(120.5);
    expect(parsePrice('1.250,50')).toBe(1250.5);
    expect(parsePrice('99.90')).toBe(99.9);
  });

  it('recusa texto inválido', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('12,345')).toBeNull();
    expect(parsePrice('-5')).toBeNull();
  });
});

describe('daysLabel', () => {
  it('resume os dias', () => {
    expect(daysLabel(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])).toBe('Seg a Sex');
    expect(daysLabel(['friday', 'monday', 'wednesday'])).toBe('Seg, Qua e Sex');
    expect(daysLabel(['saturday'])).toBe('Sáb');
    expect(daysLabel(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).toBe('Todos os dias');
  });
});

// Regressão: o fim só precisava ser depois do início; a API também exige
// que a duração (inteira, de 15 a 480 min) caiba no intervalo.
describe('validate (horários, como validateAvailability da API)', () => {
  const draft = (start: string, end: string, duration: number) => ({
    title: 'Serviço',
    description: '',
    category: 'eletrica',
    price: '100',
    days: { monday: true },
    start,
    end,
    duration,
    active: true,
  });
  const hours = (start: string, end: string, duration: number) => validate(draft(start, end, duration)).hours;

  it('a duração precisa caber no intervalo', () => {
    expect(hours('09:00', '09:30', 60)).toContain('caber pelo menos um atendimento');
    expect(hours('09:00', '10:00', 60)).toBeUndefined();
    expect(hours('09:00', '12:00', 60)).toBeUndefined();
    expect(hours('17:00', '09:00', 60)).toBe('O fim precisa ser depois do início.');
    expect(hours('09:00', '09:00', 30)).toBe('O fim precisa ser depois do início.');
  });

  it('limites da duração: inteira, de 15 a 480 minutos', () => {
    expect(hours('08:00', '08:15', 15)).toBeUndefined();
    expect(hours('08:00', '16:00', 480)).toBeUndefined();
    expect(hours('08:00', '18:00', 14)).toContain('entre 15 minutos e 8 horas');
    expect(hours('08:00', '18:00', 481)).toContain('entre 15 minutos e 8 horas');
    expect(hours('08:00', '18:00', 30.5)).toContain('entre 15 minutos e 8 horas');
    expect(hours('08:00', '18:00', Number.NaN)).toContain('entre 15 minutos e 8 horas');
  });

  it('recusa horário vazio ou fora do formato', () => {
    expect(hours('', '10:00', 60)).toBe('Informe o início e o fim, como 09:00.');
    expect(hours('09:00', '', 60)).toBe('Informe o início e o fim, como 09:00.');
    expect(hours('9:00', '10:00', 30)).toBe('Informe o início e o fim, como 09:00.');
    expect(hours('24:00', '24:30', 15)).toBe('Informe o início e o fim, como 09:00.');
    expect(hours('09:60', '10:00', 15)).toBe('Informe o início e o fim, como 09:00.');
  });
});
