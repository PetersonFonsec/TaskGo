import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { environment } from '@environments/environment';
import { IFullAddress } from '@shared/service/address/address.model';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Address, addressPlace, formatCep } from './address';

const URL = environment.url + '/user/me/addresses';

const address = (id: string, extra: Partial<IFullAddress> = {}) =>
  ({
    id,
    label: 'Casa',
    street: 'Rua das Flores',
    number: '120',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    cep: '01001000',
    lat: -23.55,
    lng: -46.63,
    isDefault: false,
    active: true,
    ...extra,
  }) as IFullAddress;

const HOME = address('10', { isDefault: true, complement: 'Apto 4' });
const WORK = address('11', { label: 'Trabalho', street: 'Av. Paulista', number: '1000', cep: '01310100' });

describe('Address (Endereços)', () => {
  let fixture: ComponentFixture<Address>;
  let component: Address;
  let el: HTMLElement;
  let http: HttpTestingController;
  let cepLookup: Subject<{ street?: string; neighborhood?: string; city: string; state: string }>;

  beforeEach(async () => {
    cepLookup = new Subject();
    await TestBed.configureTestingModule({
      imports: [Address],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserLoggedService, useValue: { user: signal({ user: { id: '42' } }) } },
        { provide: Geolocalization, useValue: { getAddressByCep: () => cepLookup } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Address);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const text = (root: Element = el) => (root.textContent ?? '').replace(/\s+/g, ' ');
  const list = (): TestRequest => http.expectOne((req) => req.method === 'GET' && req.url.startsWith(URL));
  const respond = async (data: IFullAddress[] | 'error' = [HOME, WORK]) => {
    const request = list();
    expect(request.request.url).toBe(`${URL}?limit=100`);
    if (data === 'error') request.flush('erro', { status: 500, statusText: 'Erro' });
    else request.flush({ data, meta: { total: data.length, page: 1, limit: 100, totalPages: 1, hasPrevPage: false, hasNextPage: false } });
    await render();
  };
  const button = (label: string, root: ParentNode = el) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);
  const sheet = () => el.querySelector<HTMLDialogElement>('tg-sheet dialog')!;
  const dialog = () => el.querySelector<HTMLDialogElement>('tg-dialog dialog')!;
  const type = async (name: string, value: string) => {
    const input = sheet().querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await render();
  };
  const submit = async () => {
    sheet().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await render();
  };
  const fieldError = (name: string) =>
    sheet().querySelector(`[name="${name}"]`)?.closest('tg-field')?.querySelector('.tg-field__error')?.textContent?.trim() ?? '';

  it('mostra o skeleton enquanto carrega, sem o botão de adicionar', () => {
    expect(el.querySelector('h2')?.textContent).toContain('Endereços');
    expect(el.querySelector('tg-loading .tg-loading__body')?.getAttribute('aria-busy')).toBe('true');
    expect(button('Adicionar endereço')).toBeUndefined();
    list().flush({ data: [] });
  });

  it('lista os endereços com o principal marcado, o complemento e o CEP formatado', async () => {
    await respond();

    expect(text()).toContain('2 endereços salvos.');
    const cards = el.querySelectorAll('.address');
    expect(cards.length).toBe(2);
    expect(text(cards[0])).toContain('Casa');
    expect(cards[0].querySelector('tg-badge')?.textContent).toContain('Principal');
    expect(text(cards[0])).toContain('Rua das Flores, 120');
    expect(text(cards[0])).toContain('Apto 4');
    expect(text(cards[0])).toContain('São Paulo, SP');
    expect(text(cards[0])).toContain('CEP 01001-000');
    expect(cards[1].querySelector('tg-badge')).toBeNull();
    // Editar e Remover dizem de qual endereço são.
    const edit = button('Editar', cards[1])!;
    expect(el.querySelector('#' + edit.getAttribute('aria-describedby'))?.textContent).toContain('Trabalho');
    expect(button('Adicionar endereço')).toBeDefined();
  });

  it('sem endereços: estado vazio com a ação de adicionar, que abre o painel', async () => {
    await respond([]);

    const empty = el.querySelector('tg-empty-state')!;
    expect(text(empty)).toContain('Nenhum endereço cadastrado');
    // Uma ação por vez: o topo não repete o botão.
    expect(el.querySelector('.addresses__header button')).toBeNull();
    expect(text()).toContain('Os locais onde você recebe os serviços.');
    button('Adicionar endereço', empty)!.click();
    await render();
    expect(sheet().open).toBeTrue();
    expect(text(sheet())).toContain('Adicionar endereço');
  });

  it('falha ao carregar: alerta com "Tentar de novo", que recarrega', async () => {
    await respond('error');

    const alert = el.querySelector('tg-alert[role="alert"]')!;
    expect(text(alert)).toContain('Não foi possível carregar seus endereços');
    expect(el.querySelector('.address')).toBeNull();
    button('Tentar de novo', alert)!.click();
    await render();
    await respond([HOME]);
    expect(el.querySelector('tg-alert[role="alert"]')).toBeNull();
    expect(el.querySelectorAll('.address').length).toBe(1);
    expect(text()).toContain('1 endereço salvo.');
  });

  it('valida os campos obrigatórios do DTO e foca o primeiro erro', async () => {
    await respond();
    button('Adicionar endereço')!.click();
    await render();

    await submit();
    expect(fieldError('label')).toBe('Dê um nome ao endereço, como Casa ou Trabalho.');
    expect(fieldError('cep')).toBe('Informe o CEP.');
    expect(fieldError('street')).toBe('Informe a rua.');
    expect(fieldError('number')).toBe('Informe o número.');
    expect(fieldError('city')).toBe('Informe a cidade.');
    expect(fieldError('state')).toBe('Informe o estado.');
    expect(fieldError('complement')).toBe('');
    expect(document.activeElement?.getAttribute('name')).toBe('label');
    expect(sheet().querySelector('[name="label"]')?.getAttribute('aria-invalid')).toBe('true');

    // Só espaços não vale; CEP incompleto pede os 8 dígitos.
    await type('label', '   ');
    await type('cep', '0100');
    await submit();
    expect(fieldError('label')).toContain('Dê um nome');
    expect(fieldError('cep')).toBe('Informe os 8 dígitos do CEP.');
    http.expectNone((req) => req.method === 'POST');
  });

  it('busca o CEP, preenche o endereço e cria com o que a API aceita', async () => {
    await respond();
    button('Adicionar endereço')!.click();
    await render();

    await type('label', '  Trabalho ');
    await type('number', '1000');
    await type('cep', '01310100');
    expect(text(sheet())).toContain('Buscando o endereço pelo CEP');
    cepLookup.next({ street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' });
    await render();
    expect(sheet().querySelector<HTMLInputElement>('[name="street"]')!.value).toBe('Avenida Paulista');
    expect(sheet().querySelector<HTMLInputElement>('[name="number"]')!.value).toBe('1000');
    // O bairro não está no DTO da API: o formulário não o pede.
    expect(sheet().querySelector('[name="neighborhood"]')).not.toBeNull();
    sheet().querySelector<HTMLInputElement>('[name="isDefault"]')!.click();
    await render();

    await submit();
    const post = http.expectOne((req) => req.method === 'POST' && req.url === URL);
    expect(post.request.body).toEqual({
      label: 'Trabalho',
      street: 'Avenida Paulista',
      number: '1000',
      complement: '',
      city: 'São Paulo',
      state: 'SP',
      cep: '01310100',
      lat: 0,
      lng: 0,
      isDefault: true,
    });
    expect(sheet().getAttribute('aria-busy')).toBe('true');
    post.flush({ id: '12' });
    await render();

    expect(sheet().open).toBeFalse();
    expect(text(el.querySelector('.addresses__status')!)).toContain('Endereço adicionado.');
    // Recarga em silêncio: a lista fica à vista enquanto a nova chega.
    expect(el.querySelectorAll('.address').length).toBe(2);
    await respond([HOME, WORK, address('12', { label: 'Trabalho' })]);
    expect(el.querySelectorAll('.address').length).toBe(3);
  });

  it('CEP não encontrado: avisa e deixa preencher à mão', async () => {
    await respond();
    button('Adicionar endereço')!.click();
    await render();
    await type('cep', '99999999');
    cepLookup.error({ status: 404 });
    await render();
    expect(text(sheet())).toContain('CEP não encontrado');
    expect(sheet().querySelector('tg-alert')?.getAttribute('role')).toBe('status');
  });

  it('edita com os dados do endereço e envia PATCH só com os campos do DTO', async () => {
    await respond();
    button('Editar', el.querySelectorAll('.address')[0])!.click();
    await render();

    expect(text(sheet())).toContain('Editar endereço');
    expect(sheet().querySelector<HTMLInputElement>('[name="label"]')!.value).toBe('Casa');
    expect(sheet().querySelector<HTMLInputElement>('[name="cep"]')!.value).toBe('01001-000');
    expect(sheet().querySelector<HTMLInputElement>('[name="isDefault"]')!.checked).toBeTrue();
    await type('label', 'Casa nova');
    await submit();

    const patch = http.expectOne((req) => req.method === 'PATCH');
    expect(patch.request.url).toBe(`${URL}/10`);
    expect(Object.keys(patch.request.body).sort()).toEqual(
      ['cep', 'city', 'complement', 'isDefault', 'label', 'lat', 'lng', 'number', 'state', 'street'],
    );
    expect(patch.request.body).toEqual(jasmine.objectContaining({ label: 'Casa nova', lat: -23.55, lng: -46.63 }));
    patch.flush({});
    await render();
    expect(text(el.querySelector('.addresses__status')!)).toContain('Endereço atualizado.');
    await respond();
  });

  it('falha ao salvar: mantém o painel e o que foi digitado, com o erro', async () => {
    await respond();
    button('Editar', el.querySelectorAll('.address')[1])!.click();
    await render();
    await type('number', '2000');
    await submit();
    http.expectOne((req) => req.method === 'PATCH').flush('erro', { status: 400, statusText: 'Bad Request' });
    await render();

    expect(sheet().open).toBeTrue();
    expect(text(sheet().querySelector('tg-alert[role="alert"]')!)).toContain('Não foi possível salvar o endereço');
    expect(sheet().querySelector<HTMLInputElement>('[name="number"]')!.value).toBe('2000');
    expect(component.saving()).toBeFalse();
  });

  it('reabrir o painel começa do zero', async () => {
    await respond();
    button('Adicionar endereço')!.click();
    await render();
    await type('label', 'Rascunho');
    button('Cancelar', sheet())!.click();
    await render();
    expect(sheet().open).toBeFalse();
    button('Adicionar endereço')!.click();
    await render();
    expect(sheet().querySelector<HTMLInputElement>('[name="label"]')!.value).toBe('');
  });

  it('remover pede confirmação, e só então chama a API e recarrega', async () => {
    await respond();
    button('Remover', el.querySelectorAll('.address')[1])!.click();
    await render();

    expect(dialog().open).toBeTrue();
    expect(text(dialog())).toContain('Remover este endereço?');
    expect(text(dialog())).toContain('Trabalho (Av. Paulista, 1000)');
    http.expectNone((req) => req.method === 'DELETE');
    // O foco começa na ação segura.
    expect(document.activeElement?.textContent?.trim()).toBe('Voltar');

    button('Remover endereço', dialog())!.click();
    await render();
    const del = http.expectOne((req) => req.method === 'DELETE');
    expect(del.request.url).toBe(`${URL}/11`);
    del.flush({});
    await render();
    expect(dialog().open).toBeFalse();
    expect(text(el.querySelector('.addresses__status')!)).toContain('Endereço removido.');
    await respond([HOME]);
    expect(el.querySelectorAll('.address').length).toBe(1);
  });

  it('voltar no diálogo não remove; falha ao remover mostra o erro no diálogo', async () => {
    await respond();
    button('Remover', el.querySelectorAll('.address')[0])!.click();
    await render();
    button('Voltar', dialog())!.click();
    await render();
    expect(dialog().open).toBeFalse();
    http.expectNone((req) => req.method === 'DELETE');

    button('Remover', el.querySelectorAll('.address')[0])!.click();
    await render();
    button('Remover endereço', dialog())!.click();
    await render();
    http.expectOne((req) => req.method === 'DELETE').flush('erro', { status: 500, statusText: 'Erro' });
    await render();
    expect(dialog().open).toBeTrue();
    expect(text(dialog())).toContain('Não foi possível remover o endereço');
    expect(el.querySelectorAll('.address').length).toBe(2);
  });
});

describe('Endereços: formatação', () => {
  it('formata o CEP e o local sem as partes que faltam', () => {
    expect(formatCep('01001000')).toBe('01001-000');
    expect(formatCep('0100')).toBe('0100');
    expect(addressPlace({ neighborhood: 'Sé', city: 'São Paulo', state: 'SP' })).toBe('Sé · São Paulo, SP');
    expect(addressPlace({ neighborhood: '', city: 'São Paulo', state: '' })).toBe('São Paulo');
  });
});
