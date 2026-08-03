import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import {
  CreateServiceCommand,
  RemoveServiceCommand,
  UpdateServiceCommand,
} from './commands';
import { ServicesController } from './services.controller';
import { GetServiceQuery, ListServicesQuery } from './queries';

describe('ServicesController', () => {
  let controller: ServicesController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();
    controller = module.get(ServicesController);
  });

  it('delegates writes to CommandBus with bigint identifiers', async () => {
    const create = { title: 'Service' } as never;
    const update = { title: 'Updated' } as never;

    await controller.create(create);
    await controller.update(10n, update);
    await controller.remove(11n);

    const commands = commandBus.execute.mock.calls.map(([command]) => command);
    expect(commands[0]).toBeInstanceOf(CreateServiceCommand);
    expect(commands[1]).toEqual(
      expect.objectContaining({ id: 10n, payload: update }),
    );
    expect(commands[1]).toBeInstanceOf(UpdateServiceCommand);
    expect(commands[2]).toEqual(expect.objectContaining({ id: 11n }));
    expect(commands[2]).toBeInstanceOf(RemoveServiceCommand);
  });

  it('delegates reads to QueryBus', async () => {
    const pagination = { page: 2, limit: 20 };

    await controller.findAll(pagination);
    await controller.findOne(12n);

    const queries = queryBus.execute.mock.calls.map(([query]) => query);
    expect(queries[0]).toEqual(expect.objectContaining({ pagination }));
    expect(queries[0]).toBeInstanceOf(ListServicesQuery);
    expect(queries[1]).toEqual(expect.objectContaining({ id: 12n }));
    expect(queries[1]).toBeInstanceOf(GetServiceQuery);
  });
});
