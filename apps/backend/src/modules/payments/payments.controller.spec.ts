import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { PaymentMethod } from '@prisma/client';

import {
  CreateOrderPaymentCommand,
  ProcessPagarmeWebhookCommand,
} from './commands';
import { PaymentsController } from './payments.controller';
import { GetOrderPaymentQuery } from './queries';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();
    controller = module.get(PaymentsController);
  });

  it('delegates payment creation to CommandBus with the authenticated client', async () => {
    const payload = { method: PaymentMethod.PIX };
    await controller.create(10n, '20', payload);

    const command = commandBus.execute.mock.calls[0][0];
    expect(command).toBeInstanceOf(CreateOrderPaymentCommand);
    expect(command).toEqual(
      expect.objectContaining({ orderId: 10n, clientId: 20n, payload }),
    );
  });

  it('delegates payment reads to QueryBus', async () => {
    await controller.findOne(11n, '21');

    const query = queryBus.execute.mock.calls[0][0];
    expect(query).toBeInstanceOf(GetOrderPaymentQuery);
    expect(query).toEqual(
      expect.objectContaining({ orderId: 11n, clientId: 21n }),
    );
  });

  it('delegates the public webhook to its command handler', async () => {
    const payload = {
      id: 'evt_1',
      type: 'charge.paid',
      data: { id: 'ch_1' },
    };
    await controller.webhook(payload);

    const command = commandBus.execute.mock.calls[0][0];
    expect(command).toBeInstanceOf(ProcessPagarmeWebhookCommand);
    expect(command.payload).toBe(payload);
  });
});
