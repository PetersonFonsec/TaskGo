import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  GetOrderDetailsQuery,
  GetOrderSummaryQuery,
  ListClientOrdersQuery,
  ListOrdersQuery,
  ListProviderOrdersQuery,
} from './queries';
import {
  CancelOrderByProviderCommand,
  ConfirmOrderByProviderCommand,
  ConfirmOrderCompletionCommand,
  CreateOrderCommand,
  CreateOrderReviewCommand,
  FinishOrderCommand,
  RemoveOrderCommand,
  ScheduleOrderCommand,
  UpdateOrderCommand,
} from './commands';

describe('OrderController', () => {
  let controller: OrderController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  beforeEach(async () => {
    jest.clearAllMocks();
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
        {
          provide: QueryBus,
          useValue: queryBus,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates all reads to QueryBus', async () => {
    const pagination = { page: 2, limit: 20 } as never;

    await controller.findAll(pagination);
    await controller.findOne(10n);
    await controller.getSummary(11n);
    await controller.findByClient(12n);
    await controller.findByProvider(13n);

    const queries = queryBus.execute.mock.calls.map(([query]) => query);
    expect(queries[0]).toEqual(expect.objectContaining({ pagination }));
    expect(queries[0]).toBeInstanceOf(ListOrdersQuery);
    expect(queries[1]).toBeInstanceOf(GetOrderDetailsQuery);
    expect(queries[2]).toBeInstanceOf(GetOrderSummaryQuery);
    expect(queries[3]).toBeInstanceOf(ListClientOrdersQuery);
    expect(queries[4]).toBeInstanceOf(ListProviderOrdersQuery);
  });

  it('delegates CRUD and scheduling writes to CommandBus', async () => {
    const createPayload = { serviceId: '2', clientId: '3' } as never;
    const updatePayload = { finalPrice: 150 } as never;
    const schedulePayload = { scheduledFor: '2026-08-10T12:00:00.000Z' };

    await controller.create(createPayload);
    await controller.update(14n, updatePayload);
    await controller.remove(15n);
    await controller.schedule(16n, schedulePayload);
    await controller.confirmByProvider(17n, 18n);
    await controller.cancelByProvider(19n, 20n);

    const commands = commandBus.execute.mock.calls.map(([command]) => command);
    expect(commands[0]).toBeInstanceOf(CreateOrderCommand);
    expect(commands[1]).toBeInstanceOf(UpdateOrderCommand);
    expect(commands[2]).toBeInstanceOf(RemoveOrderCommand);
    expect(commands[3]).toBeInstanceOf(ScheduleOrderCommand);
    expect(commands[4]).toBeInstanceOf(ConfirmOrderByProviderCommand);
    expect(commands[5]).toBeInstanceOf(CancelOrderByProviderCommand);
  });

  it('delegates lifecycle writes to CommandBus with authenticated identities', async () => {
    const finishPayload = { finalPrice: 120, photos: [] } as never;
    const confirmationPayload = {} as never;
    const reviewPayload = { rating: 5 } as never;

    await controller.finish(22n, '23', finishPayload);
    await controller.confirmCompletion(24n, '25', confirmationPayload);
    await controller.createReview(26n, '27', reviewPayload);

    const [finish, confirmation, review] = commandBus.execute.mock.calls.map(
      ([command]) => command,
    );
    expect(finish).toBeInstanceOf(FinishOrderCommand);
    expect(finish).toEqual(
      expect.objectContaining({ orderId: 22n, providerId: 23n }),
    );
    expect(confirmation).toBeInstanceOf(ConfirmOrderCompletionCommand);
    expect(confirmation).toEqual(
      expect.objectContaining({ orderId: 24n, clientId: 25n }),
    );
    expect(review).toBeInstanceOf(CreateOrderReviewCommand);
    expect(review).toEqual(
      expect.objectContaining({ orderId: 26n, clientId: 27n }),
    );
  });
});
