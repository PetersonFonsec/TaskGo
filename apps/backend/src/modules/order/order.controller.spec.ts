import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let controller: OrderController;
  const orderService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getSummary: jest.fn(),
    findByClient: jest.fn(),
    findByProvider: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    schedule: jest.fn(),
    confirmByProvider: jest.fn(),
    cancelByProvider: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
