import { generateKeyPairSync } from 'node:crypto';

import { FcmPushTransport } from './fcm-push.transport';

describe('FcmPushTransport', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = {
    project_id: 'taskgo-test',
    client_email: 'push@taskgo-test.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status });

  it('aceita a conta de serviço em JSON ou base64', () => {
    const raw = JSON.stringify(account);
    expect(FcmPushTransport.parseServiceAccount(raw).project_id).toBe(
      'taskgo-test',
    );
    expect(
      FcmPushTransport.parseServiceAccount(Buffer.from(raw).toString('base64'))
        .client_email,
    ).toBe(account.client_email);
    expect(() => FcmPushTransport.parseServiceAccount('{}')).toThrow();
  });

  it('autentica uma vez e marca tokens desinstalados como inválidos', async () => {
    const http = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('oauth2')) {
        return json(200, { access_token: 'ACCESS', expires_in: 3600 });
      }
      const token = JSON.parse(String(init?.body)).message.token;
      if (token === 'velho') {
        return json(404, {
          error: {
            status: 'NOT_FOUND',
            details: [{ errorCode: 'UNREGISTERED' }],
          },
        });
      }
      return json(200, { name: 'projects/x/messages/1' });
    });
    const transport = new FcmPushTransport(account, http as typeof fetch);

    const first = await transport.send(['ok', 'velho'], {
      title: 'Pedido aceito',
      body: 'Pague o PIX',
      data: { orderId: '9' },
    });
    await transport.send(['ok'], { title: 'De novo', body: 'b' });

    expect(first.invalidTokens).toEqual(['velho']);
    const oauthCalls = http.mock.calls.filter(([url]) =>
      String(url).includes('oauth2'),
    );
    expect(oauthCalls).toHaveLength(1);
    const sendCall = http.mock.calls.find(([url]) =>
      String(url).includes('/projects/taskgo-test/messages:send'),
    );
    expect(sendCall?.[1]?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer ACCESS' }),
    );
  });

  it('mantém o token quando a falha é temporária', async () => {
    const http = jest.fn(async (url: string) =>
      url.includes('oauth2')
        ? json(200, { access_token: 'ACCESS', expires_in: 3600 })
        : json(503, { error: { status: 'UNAVAILABLE' } }),
    );
    const transport = new FcmPushTransport(account, http as typeof fetch);

    await expect(
      transport.send(['ok'], { title: 't', body: 'b' }),
    ).resolves.toEqual({ invalidTokens: [] });
  });

  describe('classificação dos erros do FCM', () => {
    const tokenViolation = {
      '@type': 'type.googleapis.com/google.rpc.BadRequest',
      fieldViolations: [{ field: 'message.token', description: 'invalid' }],
    };
    const fcmError = (errorCode: string) => ({
      '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
      errorCode,
    });
    const cases: Array<[string, () => Response, boolean]> = [
      [
        'UNREGISTERED',
        () =>
          json(404, {
            error: { status: 'NOT_FOUND', details: [fcmError('UNREGISTERED')] },
          }),
        true,
      ],
      [
        'INVALID_ARGUMENT de payload',
        () =>
          json(400, {
            error: {
              status: 'INVALID_ARGUMENT',
              details: [
                fcmError('INVALID_ARGUMENT'),
                {
                  '@type': 'type.googleapis.com/google.rpc.BadRequest',
                  fieldViolations: [{ field: 'message.data[0].value' }],
                },
              ],
            },
          }),
        false,
      ],
      [
        'INVALID_ARGUMENT sem detalhe de campo',
        () => json(400, { error: { status: 'INVALID_ARGUMENT' } }),
        false,
      ],
      [
        'INVALID_ARGUMENT apontando message.token',
        () =>
          json(400, {
            error: {
              status: 'INVALID_ARGUMENT',
              details: [fcmError('INVALID_ARGUMENT'), tokenViolation],
            },
          }),
        true,
      ],
      [
        'SENDER_ID_MISMATCH',
        () =>
          json(403, {
            error: {
              status: 'PERMISSION_DENIED',
              details: [fcmError('SENDER_ID_MISMATCH')],
            },
          }),
        true,
      ],
      [
        'UNAVAILABLE',
        () =>
          json(503, {
            error: {
              status: 'UNAVAILABLE',
              details: [fcmError('UNAVAILABLE')],
            },
          }),
        false,
      ],
      [
        'INTERNAL',
        () =>
          json(500, {
            error: { status: 'INTERNAL', details: [fcmError('INTERNAL')] },
          }),
        false,
      ],
      [
        'RESOURCE_EXHAUSTED',
        () =>
          json(429, {
            error: {
              status: 'RESOURCE_EXHAUSTED',
              details: [fcmError('QUOTA_EXCEEDED')],
            },
          }),
        false,
      ],
      [
        'HTTP 401',
        () => json(401, { error: { status: 'UNAUTHENTICATED' } }),
        false,
      ],
      [
        'HTTP 403 sem código de token',
        () =>
          json(403, {
            error: {
              status: 'PERMISSION_DENIED',
              details: [fcmError('THIRD_PARTY_AUTH_ERROR')],
            },
          }),
        false,
      ],
      [
        'resposta malformada',
        () => new Response('<html>', { status: 502 }),
        false,
      ],
    ];

    it.each(cases)('%s', async (_label, respond, removes) => {
      const http = jest.fn(async (url: string) =>
        url.includes('oauth2')
          ? json(200, { access_token: 'ACCESS', expires_in: 3600 })
          : respond(),
      );
      const transport = new FcmPushTransport(account, http as typeof fetch);
      const warn = jest
        .spyOn((transport as any).logger, 'warn')
        .mockImplementation(() => undefined);

      const result = await transport.send(['token-0123456789abcdef'], {
        title: 't',
        body: 'b',
      });

      expect(result.invalidTokens).toEqual(
        removes ? ['token-0123456789abcdef'] : [],
      );
      if (!removes) expect(warn).toHaveBeenCalled();
      for (const [message] of warn.mock.calls) {
        expect(String(message)).not.toContain('token-0123456789abcdef');
        expect(String(message)).not.toContain('ACCESS');
      }
    });
  });

  describe('isolamento de falhas por aparelho', () => {
    const transportWith = (
      behaviour: Record<string, () => Promise<Response>>,
    ) => {
      const http = jest.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('oauth2'))
          return json(200, { access_token: 'ACCESS', expires_in: 3600 });
        const token = JSON.parse(String(init?.body)).message.token as string;
        return behaviour[token]();
      });
      const transport = new FcmPushTransport(account, http as typeof fetch);
      const warn = jest
        .spyOn((transport as any).logger, 'warn')
        .mockImplementation(() => undefined);
      return { transport, http, warn };
    };
    const ok = async () => json(200, { name: 'projects/x/messages/1' });
    const timeout = async (): Promise<Response> => {
      throw Object.assign(
        new Error('The operation was aborted due to timeout'),
        {
          name: 'TimeoutError',
        },
      );
    };
    const unregistered = async () =>
      json(404, {
        error: {
          status: 'NOT_FOUND',
          details: [{ errorCode: 'UNREGISTERED' }],
        },
      });

    it('todos válidos: nenhum token removido', async () => {
      const { transport, http } = transportWith({ a: ok, b: ok, c: ok });

      await expect(
        transport.send(['a', 'b', 'c'], { title: 't', body: 'b' }),
      ).resolves.toEqual({ invalidTokens: [] });
      expect(http).toHaveBeenCalledTimes(4);
    });

    it('A entrega, B dá timeout e C é inválido', async () => {
      const { transport, warn } = transportWith({
        'device-a': ok,
        'device-b': timeout,
        'device-c': unregistered,
      });

      const result = await transport.send(
        ['device-a', 'device-b', 'device-c'],
        {
          title: 't',
          body: 'b',
        },
      );

      expect(result.invalidTokens).toEqual(['device-c']);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('TimeoutError'),
      );
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('falhas simultâneas em aparelhos diferentes não se contaminam', async () => {
      const { transport, warn } = transportWith({
        a: timeout,
        b: async () => {
          throw new TypeError('fetch failed');
        },
        c: unregistered,
        d: ok,
        e: async () => new Response('não é json', { status: 500 }),
      });

      const result = await transport.send(['a', 'b', 'c', 'd', 'e'], {
        title: 't',
        body: 'b',
      });

      expect(result.invalidTokens).toEqual(['c']);
      expect(warn).toHaveBeenCalledTimes(3);
    });

    it('falha global do OAuth rejeita sem enviar a nenhum aparelho', async () => {
      const http = jest.fn(async () => json(401, { error: 'invalid_grant' }));
      const transport = new FcmPushTransport(account, http as typeof fetch);

      await expect(
        transport.send(['a', 'b'], { title: 't', body: 'b' }),
      ).rejects.toThrow('Falha ao autenticar no FCM (401)');
      expect(http).toHaveBeenCalledTimes(1);
    });

    it('sem aparelhos não autentica nem envia', async () => {
      const http = jest.fn();
      const transport = new FcmPushTransport(account, http as typeof fetch);

      await expect(
        transport.send([], { title: 't', body: 'b' }),
      ).resolves.toEqual({ invalidTokens: [] });
      expect(http).not.toHaveBeenCalled();
    });
  });
});
