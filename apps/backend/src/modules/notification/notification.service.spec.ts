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
});
