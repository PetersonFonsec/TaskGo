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
});
