import { ConfigService } from '@nestjs/config';

import { EmailTransport } from './email-transport';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const provider = { email: 'prestador@proxi.test', name: 'Prestador' };
  let transport: { send: jest.Mock };
  let service: NotificationService;

  beforeEach(() => {
    transport = { send: jest.fn().mockResolvedValue(undefined) };
    service = new NotificationService(transport as unknown as EmailTransport);
  });

  it('notifica o prestador sobre uma nova avaliação', async () => {
    await service.notifyProviderReviewReceived(provider, 42n, 5);

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: provider.email,
        subject: 'Você recebeu uma nova avaliação',
        text: expect.stringContaining('#42'),
      }),
    );
  });

  it('não propaga falhas das notificações do atendimento', async () => {
    transport.send.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.notifyProviderOrderConfirmed(provider, 7n),
    ).resolves.toBeUndefined();
  });

  it('propaga falhas do convite administrativo', async () => {
    transport.send.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.sendAdminInvitation(
        provider,
        'http://localhost:4300/admin/activate#token=x',
        new Date('2026-10-01T12:00:00Z'),
      ),
    ).rejects.toThrow('smtp down');
  });

  it('envia o código de verificação para o novo e-mail', async () => {
    await service.sendEmailVerificationCode('novo@proxi.test', 'ABC123');

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'novo@proxi.test',
        text: expect.stringContaining('ABC123'),
      }),
    );
  });

  describe('ciclo do pedido', () => {
    const client = { email: 'cliente@proxi.test', name: 'Cliente' };
    const order = {
      id: 42n,
      serviceTitle: 'Instalação elétrica',
      scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
    };
    const config = (values: Record<string, string>) =>
      ({ get: (key: string) => values[key] }) as unknown as ConfigService;
    const sent = () => transport.send.mock.calls[0][0];

    beforeEach(() => {
      service = new NotificationService(
        transport as unknown as EmailTransport,
        config({ FRONTEND_URL: 'https://app.proxi.test/' }),
      );
    });

    it('avisa o prestador sobre a nova solicitação com link de aceite', async () => {
      await service.notifyProviderNewOrder(provider, order);

      expect(sent()).toEqual(
        expect.objectContaining({
          to: provider.email,
          subject: 'Nova solicitação de serviço',
        }),
      );
      expect(sent().text).toContain('Instalação elétrica');
      expect(sent().text).toContain('22/06/2026');
      expect(sent().text).toContain('09:00');
      expect(sent().text).toContain(
        'https://app.proxi.test/provider/42/aprovacao',
      );
    });

    it('convida o cliente a pagar após o aceite', async () => {
      await service.notifyClientOrderAccepted(client, order);

      expect(sent().to).toBe(client.email);
      expect(sent().subject).toBe('Seu pedido foi aceito');
      expect(sent().text).toContain('https://app.proxi.test/orders/42/payment');
    });

    it('avisa cliente e prestador quando o pedido expira', async () => {
      await service.notifyOrderExpired(client, provider, order, 'PROVIDER');

      const [toClient, toProvider] = transport.send.mock.calls.map(([m]) => m);
      expect(toClient.to).toBe(client.email);
      expect(toClient.subject).toBe('Seu pedido expirou');
      expect(toClient.text).toContain('prestador não respondeu');
      expect(toClient.text).toContain('https://app.proxi.test/customer/search');
      expect(toProvider.to).toBe(provider.email);
      expect(toProvider.text).toContain('sem resposta');
    });

    it('diferencia recusa de cancelamento e informa o estorno', async () => {
      await service.notifyClientOrderCanceledByProvider(client, order, {
        refused: true,
        refunded: false,
      });
      await service.notifyClientOrderCanceledByProvider(client, order, {
        refused: false,
        refunded: true,
      });

      const [refused, canceled] = transport.send.mock.calls.map(([m]) => m);
      expect(refused.subject).toBe('Seu pedido foi recusado');
      expect(refused.text).not.toContain('estornado');
      expect(canceled.subject).toBe('Seu pedido foi cancelado');
      expect(canceled.text).toContain('estornado');
      expect(canceled.text).toContain('https://app.proxi.test/orders/42');
    });

    it('confirma o pagamento com a data do agendamento', async () => {
      await service.notifyClientPaymentConfirmed(client, order);

      expect(sent().subject).toBe('Pagamento confirmado: serviço agendado');
      expect(sent().text).toContain('agendado para 22/06/2026');
    });

    it('avisa que o prestador está a caminho', async () => {
      await service.notifyClientProviderOnTheWay(client, order);

      expect(sent().subject).toBe('O prestador está a caminho');
      expect(sent().text).toContain('https://app.proxi.test/orders/42');
    });

    it('pede a confirmação da conclusão com link', async () => {
      await service.notifyClientServiceFinished(client, order);

      expect(sent().subject).toBe('Serviço finalizado: confirme a conclusão');
      expect(sent().text).toContain('https://app.proxi.test/orders/42/confirm');
    });

    it('usa a primeira origem pública quando FRONTEND_URL não existe', async () => {
      service = new NotificationService(
        transport as unknown as EmailTransport,
        config({
          PUBLIC_FRONTEND_ORIGINS:
            'https://www.proxi.test, https://m.proxi.test',
        }),
      );

      await service.notifyClientServiceFinished(client, order);

      expect(sent().text).toContain('https://www.proxi.test/orders/42/confirm');
    });

    it('não inclui contatos da outra parte nos avisos ao cliente', async () => {
      await service.notifyClientOrderAccepted(client, order);

      expect(sent().text).not.toContain(provider.email);
    });

    it('não propaga falhas de entrega nem de montagem da mensagem', async () => {
      transport.send.mockRejectedValue(new Error('smtp down'));
      await expect(
        service.notifyProviderNewOrder(provider, order),
      ).resolves.toBeUndefined();

      await expect(
        service.notifyClientServiceFinished(client, {
          id: undefined as unknown as bigint,
          serviceTitle: 'x',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
