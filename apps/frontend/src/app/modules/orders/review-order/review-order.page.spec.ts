import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, type ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '@environments/environment';
import type { OrderDetails, ReviewTag } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ReviewOrderPage } from './review-order.page';
import { reviewAvailability, reviewErrors, reviewSummary } from './review-order.view';

const ORDER_URL = (id: string) => `${environment.url}/orders/${id}`;
const TAGS_URL = `${environment.url}/review-tags`;
const TAGS: ReviewTag[] = [
  { id: '1', name: 'Pontual', slug: 'pontual' },
  { id: '2', name: 'Preço justo', slug: 'preco-justo' },
];

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '1042',
    status: 'CONCLUIDO',
    expiresAt: null,
    service: {
      id: '3',
      title: 'Instalação de chuveiro',
      category: 'Elétrica',
      estimatedPrice: 120,
    },
    provider: { id: '17', name: 'Bruno Lima', photoUrl: null },
    client: { id: '7', name: 'Marina Souza', photoUrl: null },
    schedule: { requestedAt: '2026-11-12T13:00:00.000Z', scheduledFor: '2026-11-14T17:00:00.000Z' },
    address: null,
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 150 },
    review: null,
    timeline: [],
    completion: { providerFinishedAt: '2026-11-15T02:30:00.000Z', providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

describe('ReviewOrderPage (Avaliar atendimento)', () => {
  let fixture: ComponentFixture<ReviewOrderPage>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let params: BehaviorSubject<ParamMap>;
  const session = signal<{ user: { id: string | number; type: string } } | null>({
    user: { id: 7, type: 'CUSTOMER' },
  });

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ id: '1042' }));
    session.set({ user: { id: 7, type: 'CUSTOMER' } });
    await TestBed.configureTestingModule({
      imports: [ReviewOrderPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: UserLoggedService, useValue: { user: session } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReviewOrderPage);
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
    fixture.detectChanges();
  };
  const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
  const open = async (
    order: OrderDetails | 'error' | 404 = details(),
    tags: ReviewTag[] | 'error' = TAGS,
  ) => {
    const tagsRequest = http.expectOne(TAGS_URL);
    if (tags === 'error') tagsRequest.flush('erro', { status: 500, statusText: 'Erro' });
    else tagsRequest.flush(tags);
    const request = http.expectOne(ORDER_URL('1042'));
    if (order === 'error') request.flush('erro', { status: 500, statusText: 'Erro' });
    else if (order === 404)
      request.flush({ message: 'não encontrado' }, { status: 404, statusText: 'Not Found' });
    else request.flush(order);
    await render();
  };
  const stars = () => Array.from(el.querySelectorAll<HTMLInputElement>('input[name=rating]'));
  const submitButton = () => el.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const textarea = () => el.querySelector<HTMLTextAreaElement>('textarea')!;
  const type = async (value: string) => {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    await render();
  };
  const submit = async () => {
    submitButton().click();
    await render();
  };

  it('mostra o resumo do atendimento e o formulário', async () => {
    await open();

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('Avaliar atendimento');
    expect(text()).toContain('Pedido #1042');
    expect(text()).toContain('Bruno Lima');
    expect(text()).toContain('Instalação de chuveiro');
    // Finalizado às 23:30 de 14/11 em São Paulo (02:30 UTC do dia 15).
    expect(text()).toContain('14 de novembro de 2026');
    expect(text()).toContain('R$ 150,00');
    expect(el.querySelector('legend')?.textContent).toContain('Como foi o atendimento?');
    expect(stars().length).toBe(5);
    expect(el.querySelectorAll('.review__chip').length).toBe(2);
    expect(el.querySelector('label[for]')?.textContent).toContain('Comentário');
    expect(el.querySelector('a.review__back')?.getAttribute('href')).toBe('/orders/1042');
  });

  it('cada estrela é um rádio nativo com nome acessível (setas do teclado trocam a nota)', async () => {
    await open();
    const radios = stars();
    expect(radios.every((radio) => radio.type === 'radio' && radio.name === 'rating')).toBeTrue();
    expect(radios[0].closest('label')?.textContent).toContain('1 estrela, Muito insatisfeito');
    expect(radios[4].closest('label')?.textContent).toContain('5 estrelas, Excelente atendimento');
    expect(el.querySelector('fieldset')?.getAttribute('role')).toBe('radiogroup');

    radios[3].click();
    await render();
    expect(fixture.componentInstance.rating()).toBe(4);
    expect(text()).toContain('Bom atendimento');
    expect(el.querySelectorAll('.review__star--on').length).toBe(4);
  });

  it('sem nota, não envia: mostra o erro e leva o foco à primeira estrela', async () => {
    await open();
    await submit();

    http.expectNone(`${ORDER_URL('1042')}/review`);
    expect(text()).toContain('Escolha uma nota de 1 a 5 estrelas.');
    expect(el.querySelector('fieldset')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe(
      'review-rating-error',
    );
    expect(document.activeElement).toBe(stars()[0]);

    stars()[4].click();
    await render();
    expect(text()).not.toContain('Escolha uma nota');
  });

  it('comentário segue o limite do DTO (500, sem os espaços das pontas)', async () => {
    expect(reviewErrors(5, ' '.repeat(10) + 'a'.repeat(500) + ' ').comment).toBe('');
    expect(reviewErrors(5, 'a'.repeat(501)).comment).toContain('500');
    expect(reviewErrors(0, '').rating).toContain('Escolha');
    expect(reviewErrors(5.5, '').rating).toContain('Escolha');

    await open();
    expect(textarea().getAttribute('maxlength')).toBe('500');
    await type('  Muito bom  ');
    expect(text()).toContain('9/500');

    stars()[4].click();
    await type('a'.repeat(501));
    await submit();
    http.expectNone(`${ORDER_URL('1042')}/review`);
    expect(text()).toContain('Use no máximo 500 caracteres no comentário.');
    expect(document.activeElement).toBe(textarea());
  });

  it('envia nota, comentário sem espaços nas pontas e tags; mostra o sucesso com "Ver pedido"', async () => {
    await open();
    stars()[4].click();
    el.querySelectorAll<HTMLButtonElement>('.review__chip')[1].click();
    await type('  Ótimo serviço.  ');
    await submit();

    const request = http.expectOne(`${ORDER_URL('1042')}/review`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ rating: 5, comment: 'Ótimo serviço.', tagIds: ['2'] });

    // Enviando: botão carregando, campos travados, sem segundo envio.
    expect(submitButton().getAttribute('aria-disabled')).toBe('true');
    expect(el.querySelector('fieldset')?.disabled).toBeTrue();
    submitButton().click();
    http.expectNone(`${ORDER_URL('1042')}/review`);

    request.flush({
      id: '9',
      orderId: '1042',
      rating: 5,
      comment: 'Ótimo serviço.',
      reviewedAt: '',
      tags: [],
      provider: {},
    });
    await render();

    expect(text()).toContain('Obrigado pela avaliação!');
    expect(text()).toContain('Avaliação enviada');
    expect(text()).toContain('“Ótimo serviço.”');
    expect(el.querySelector('[role=img]')?.getAttribute('aria-label')).toBe('Nota 5 de 5');
    expect(el.querySelector('form')).toBeNull();
    const link = Array.from(el.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Ver pedido',
    );
    expect(link?.getAttribute('href')).toBe('/orders/1042');
    expect(document.activeElement?.textContent).toContain('Obrigado pela avaliação!');
  });

  it('sem comentário, não manda o campo', async () => {
    await open();
    stars()[2].click();
    await type('   ');
    await submit();
    const request = http.expectOne(`${ORDER_URL('1042')}/review`);
    expect(request.request.body).toEqual({ rating: 3, comment: undefined, tagIds: [] });
    request.flush({});
  });

  it('falha ao enviar mostra o alerta com a mensagem da API e mantém o que foi preenchido', async () => {
    await open();
    stars()[4].click();
    await type('Bom');
    await submit();
    http
      .expectOne(`${ORDER_URL('1042')}/review`)
      .flush(
        { message: 'Uma ou mais tags são inválidas ou estão inativas' },
        { status: 400, statusText: 'Bad Request' },
      );
    await render();

    expect(el.querySelector('tg-alert[role=alert]')?.textContent).toContain(
      'Não foi possível enviar sua avaliação',
    );
    expect(text()).toContain('Uma ou mais tags são inválidas ou estão inativas');
    expect(fixture.componentInstance.rating()).toBe(5);
    expect(textarea().value).toBe('Bom');
    expect(submitButton().getAttribute('aria-disabled')).toBeNull();
  });

  it('erro de validação da API (lista de mensagens) ou de rede vira a mensagem da tela', async () => {
    await open();
    stars()[4].click();
    await submit();
    http
      .expectOne(`${ORDER_URL('1042')}/review`)
      .flush(
        { message: ['rating must not be greater than 5'] },
        { status: 400, statusText: 'Bad Request' },
      );
    await render();
    expect(text()).toContain('Verifique sua conexão e tente de novo.');
    expect(text()).not.toContain('rating must');
  });

  it('409 no envio: mostra "já avaliado", sem formulário', async () => {
    await open();
    stars()[4].click();
    await submit();
    http
      .expectOne(`${ORDER_URL('1042')}/review`)
      .flush(
        { message: 'Este pedido já possui uma avaliação' },
        { status: 409, statusText: 'Conflict' },
      );
    await render();

    expect(text()).toContain('Você já avaliou este atendimento');
    expect(text()).toContain('a deste já foi registrada');
    expect(el.querySelector('form')).toBeNull();
  });

  it('pedido já avaliado mostra a nota e o comentário, sem formulário', async () => {
    await open(details({ review: { id: '9', rating: 4, comment: ' Muito bom ', reviewedAt: '' } }));
    expect(text()).toContain('Você já avaliou este atendimento');
    expect(el.querySelector('[role=img]')?.getAttribute('aria-label')).toBe('Nota 4 de 5');
    expect(text()).toContain('“Muito bom”');
    expect(el.querySelector('form')).toBeNull();
  });

  it('pedido que não permite avaliar mostra o motivo e "Ver pedido", sem formulário', async () => {
    await open(details({ status: 'EM_ANDAMENTO' }));
    expect(text()).toContain('O atendimento ainda não foi concluído');
    expect(el.querySelector('form')).toBeNull();
    const link = Array.from(el.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Ver pedido',
    );
    expect(link?.getAttribute('href')).toBe('/orders/1042');
  });

  it('pedido de outra conta não abre o formulário', async () => {
    session.set({ user: { id: 99, type: 'CUSTOMER' } });
    await open();
    expect(text()).toContain('Só quem contratou pode avaliar');
    expect(el.querySelector('form')).toBeNull();
  });

  it('pedido cancelado não pode ser avaliado', async () => {
    await open(details({ status: 'CANCELADO' }));
    expect(text()).toContain('Este pedido não pode ser avaliado');
  });

  it('falha ao carregar mostra "Tentar de novo", que recarrega o pedido', async () => {
    await open('error');
    expect(el.querySelector('tg-alert[role=alert]')?.textContent).toContain(
      'Não foi possível carregar o atendimento',
    );
    const retry = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Tentar de novo',
    );
    retry!.click();
    http.expectOne(ORDER_URL('1042')).flush(details());
    await render();
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('404 mostra "não encontrado", sem "Tentar de novo"', async () => {
    await open(404);
    expect(text()).toContain('Este pedido não foi encontrado');
    expect(text()).not.toContain('Tentar de novo');
  });

  it('sem tags (falha), o formulário segue sem a seção; "Tentar de novo" do pedido também busca as tags', async () => {
    await open(details(), 'error');
    expect(el.querySelector('.review__chips')).toBeNull();
    expect(el.querySelector('form')).not.toBeNull();

    fixture.componentInstance.load();
    http.expectOne(TAGS_URL).flush(TAGS);
    http.expectOne(ORDER_URL('1042')).flush(details());
    await render();
    expect(el.querySelectorAll('.review__chip').length).toBe(2);
  });

  it('enquanto carrega, a região fica ocupada e sem formulário', () => {
    expect(el.querySelector('tg-loading .tg-loading__body')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(el.querySelector('form')).toBeNull();
    http.expectOne(TAGS_URL).flush(TAGS);
    http.expectOne(ORDER_URL('1042')).flush(details());
  });

  it('trocar de pedido na rota limpa o formulário', async () => {
    await open();
    stars()[4].click();
    await render();
    params.next(convertToParamMap({ id: '2000' }));
    http.expectOne(ORDER_URL('2000')).flush(details({ id: '2000' }));
    await render();
    expect(fixture.componentInstance.rating()).toBe(0);
    expect(text()).toContain('Pedido #2000');
  });
});

describe('review-order.view', () => {
  it('regras de quem e quando pode avaliar são as da API', () => {
    expect(reviewAvailability(details(), '7')).toBe('open');
    expect(reviewAvailability(details(), '8')).toBe('notOwner');
    expect(reviewAvailability(details(), null)).toBe('notOwner');
    expect(
      reviewAvailability(details({ review: { id: '1', rating: 5, reviewedAt: '' } }), '7'),
    ).toBe('reviewed');
    expect(reviewAvailability(details({ status: 'AGUARDANDO_CONFIRMACAO_CLIENTE' }), '7')).toBe(
      'notFinished',
    );
    expect(reviewAvailability(details({ status: 'CANCELADO' }), '7')).toBe('closed');
    expect(reviewAvailability(details({ status: 'REJEITADO' }), '7')).toBe('closed');
    expect(reviewAvailability(details({ status: 'DISPUTA' }), '7')).toBe('closed');
  });

  it('valor: final, senão estimado do pagamento, senão o do serviço', () => {
    const amount = (order: OrderDetails) => reviewSummary(order).amount?.replace(/\s/g, ' ');
    expect(amount(details())).toBe('R$ 150,00');
    expect(
      amount(
        details({
          payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 99, finalAmount: null },
        }),
      ),
    ).toBe('R$ 99,00');
    expect(amount(details({ payment: null }))).toBe('R$ 120,00');
    expect(reviewSummary(details()).initials).toBe('BL');
  });
});
