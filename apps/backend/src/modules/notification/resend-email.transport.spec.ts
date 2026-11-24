import {
  ResendDeliveryError,
  ResendEmailTransport,
} from './resend-email.transport';

describe('ResendEmailTransport', () => {
  const message = {
    to: 'cliente@proxi.test',
    subject: 'Assunto',
    text: 'Texto',
    html: '<p>Texto</p>',
    category: 'order-accepted',
    idempotencyKey: 'order-accepted/42',
  };
  const json = (status: number, body: unknown, headers = {}) =>
    new Response(JSON.stringify(body), { status, headers });

  function setup(...responses: Array<Response | Error>) {
    const fetchFn = jest.fn();
    for (const response of responses) {
      if (response instanceof Error) fetchFn.mockRejectedValueOnce(response);
      else fetchFn.mockResolvedValueOnce(response);
    }
    const sleep = jest.fn().mockResolvedValue(undefined);
    const transport = new ResendEmailTransport(
      're_test_key',
      'Proxi <nao-responda@proxi.test>',
      { fetchFn, sleep, replyTo: 'suporte@proxi.test' },
    );
    return { transport, fetchFn, sleep };
  }

  it('envia pela API com remetente, versões texto e HTML, tag e chave de idempotência', async () => {
    const { transport, fetchFn } = setup(json(200, { id: 'email_1' }));

    await transport.send(message);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer re_test_key',
        'Idempotency-Key': 'order-accepted/42',
      }),
    );
    expect(JSON.parse(init.body)).toEqual({
      from: 'Proxi <nao-responda@proxi.test>',
      to: ['cliente@proxi.test'],
      subject: 'Assunto',
      text: 'Texto',
      html: '<p>Texto</p>',
      reply_to: 'suporte@proxi.test',
      tags: [{ name: 'category', value: 'order-accepted' }],
    });
  });

  it('gera uma chave de idempotência quando o chamador não informa', async () => {
    const { transport, fetchFn } = setup(json(200, {}));
    await transport.send({ to: 'a@proxi.test', subject: 's', text: 't' });
    expect(fetchFn.mock.calls[0][1].headers['Idempotency-Key']).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it('repete 429 e 5xx com a mesma chave e respeita o Retry-After', async () => {
    const { transport, fetchFn, sleep } = setup(
      json(429, { name: 'rate_limit_exceeded' }, { 'retry-after': '2' }),
      json(503, { name: 'internal_server_error' }),
      json(200, { id: 'email_1' }),
    );

    await transport.send(message);

    expect(fetchFn).toHaveBeenCalledTimes(3);
    const keys = fetchFn.mock.calls.map(
      ([, init]) => init.headers['Idempotency-Key'],
    );
    expect(new Set(keys)).toEqual(new Set(['order-accepted/42']));
    expect(sleep).toHaveBeenNthCalledWith(1, 2000);
  });

  it('repete falhas de rede e desiste após o limite', async () => {
    const { transport, fetchFn } = setup(
      new TypeError('fetch failed'),
      new TypeError('fetch failed'),
      new TypeError('fetch failed'),
    );

    await expect(transport.send(message)).rejects.toEqual(
      new ResendDeliveryError(null, 'network'),
    );
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('não repete erros de validação e não expõe o destinatário no erro', async () => {
    const { transport, fetchFn } = setup(
      json(422, {
        name: 'validation_error',
        message: 'Invalid `to` field: cliente@proxi.test',
      }),
    );

    const error = await transport.send(message).catch((e: Error) => e);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(ResendDeliveryError);
    expect((error as Error).message).toContain('validation_error');
    expect((error as Error).message).not.toContain('cliente@proxi.test');
  });

  it('ignora categorias com caracteres que o Resend não aceita em tags', async () => {
    const { transport, fetchFn } = setup(json(200, {}));
    await transport.send({ ...message, category: 'pedido aceito!' });
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).tags).toBeUndefined();
  });
});
