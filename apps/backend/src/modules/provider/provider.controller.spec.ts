import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import {
  CreateProviderCommand,
  RemoveProviderCommand,
  UpdateProviderCommand,
} from './commands';
import { ProviderController } from './provider.controller';
import {
  GetProviderAvailabilityQuery,
  GetProviderQuery,
  GetProvidersByCategoryQuery,
  ListProvidersQuery,
} from './queries';

describe('ProviderController', () => {
  let controller: ProviderController;
  let app: INestApplication;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [ProviderController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();
    controller = module.get(ProviderController);
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(() => app.close());

  it('delegates provider writes to CommandBus', async () => {
    const create = {
      provider: { name: 'Provider' },
      services: [101n],
    } as never;
    const update = { bio: 'Updated' } as never;

    await controller.create(create);
    await controller.update(42n, update);
    await controller.remove(43n);

    const commands = commandBus.execute.mock.calls.map(([command]) => command);
    expect(commands[0]).toBeInstanceOf(CreateProviderCommand);
    expect(commands[1]).toBeInstanceOf(UpdateProviderCommand);
    expect(commands[2]).toBeInstanceOf(RemoveProviderCommand);
  });

  it('delegates provider reads to QueryBus', async () => {
    const filters = { from: '2026-06-21', to: '2026-06-28' };

    await controller.findAll('true', '123');
    await controller.getAvailability('42', filters);
    await controller.findByCategory('limpeza');
    await controller.findOne(42n);

    const queries = queryBus.execute.mock.calls.map(([query]) => query);
    expect(queries[0]).toEqual(new ListProvidersQuery(true, '123'));
    expect(queries[1]).toEqual(new GetProviderAvailabilityQuery('42', filters));
    expect(queries[2]).toEqual(new GetProvidersByCategoryQuery('limpeza'));
    expect(queries[3]).toEqual(new GetProviderQuery(42n));
  });

  describe('GET /provider/:id/availability', () => {
    it('binds a valid availability query without shadowing category routes', async () => {
      queryBus.execute.mockResolvedValue({ days: [] });

      await request(app.getHttpServer())
        .get('/provider/42/availability')
        .query({ from: '2026-06-21', to: '2026-06-28' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/provider/by-category/limpeza')
        .expect(200);

      expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(
        GetProviderAvailabilityQuery,
      );
      expect(queryBus.execute.mock.calls[1][0]).toBeInstanceOf(
        GetProvidersByCategoryQuery,
      );
    });

    it('rejects missing or invalid date-only query params', async () => {
      await request(app.getHttpServer())
        .get('/provider/42/availability')
        .query({ to: '2026-06-28' })
        .expect(400);
      await request(app.getHttpServer())
        .get('/provider/42/availability')
        .query({ from: '2026-06-21T10:00:00Z', to: '2026-06-28' })
        .expect(400);
    });
  });
});
