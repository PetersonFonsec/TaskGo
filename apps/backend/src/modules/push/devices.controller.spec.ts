import { UnauthorizedException } from '@nestjs/common';

import { DevicesController } from './devices.controller';
import { PushService } from './push.service';

describe('DevicesController', () => {
  let push: { registerDevice: jest.Mock; unregisterDevice: jest.Mock };
  let controller: DevicesController;
  const body = {
    token: 'fcm-token-0123456789abcdef',
    platform: 'ANDROID' as const,
  };

  beforeEach(() => {
    push = {
      registerDevice: jest.fn().mockResolvedValue(true),
      unregisterDevice: jest.fn().mockResolvedValue(undefined),
    };
    controller = new DevicesController(push as unknown as PushService);
  });

  it('registra com a sessão do access token', async () => {
    await controller.register(body, {
      id: '7',
      role: 'CLIENTE',
      sessionId: 'family-1',
    });

    expect(push.registerDevice).toHaveBeenCalledWith(
      7n,
      body.token,
      'ANDROID',
      'family-1',
    );
  });

  it('recusa access token sem sid sem consultar o banco', async () => {
    await expect(
      controller.register(body, { id: '7', role: 'CLIENTE' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(push.registerDevice).not.toHaveBeenCalled();
  });

  it('recusa quando a sessão não está ativa', async () => {
    push.registerDevice.mockResolvedValue(false);

    await expect(
      controller.register(body, {
        id: '7',
        role: 'CLIENTE',
        sessionId: 'family-revogada',
      }),
    ).rejects.toThrow('Session is not active');
  });
});
