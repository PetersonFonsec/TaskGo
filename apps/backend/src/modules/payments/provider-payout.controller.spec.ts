import { Reflector } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CUSTOMER_ROLES_KEY } from '../../shared/decorators/roles.decorator';
import { UpdateProviderPayoutCommand } from './commands';
import { UpdateProviderPayoutDto } from './dto/update-provider-payout.dto';
import { ProviderPayoutController } from './provider-payout.controller';
import { GetProviderPayoutQuery } from './queries';

describe('ProviderPayoutController', () => {
  let controller: ProviderPayoutController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  const payload = {
    holderName: ' Maria Prestadora ',
    holderType: 'INDIVIDUAL',
    holderDocument: '529.982.247-25',
    bankCode: '341',
    branchNumber: '1234',
    accountNumber: '98765-4',
    accountCheckDigit: '1',
    accountType: 'CHECKING',
  };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [ProviderPayoutController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();
    controller = module.get(ProviderPayoutController);
  });

  it('is restricted to providers', () => {
    expect(
      new Reflector().get(CUSTOMER_ROLES_KEY, ProviderPayoutController),
    ).toEqual(['PRESTADOR']);
  });

  it('reads the payout status of the authenticated provider', async () => {
    await controller.findMine('42');

    const query = queryBus.execute.mock.calls[0][0];
    expect(query).toBeInstanceOf(GetProviderPayoutQuery);
    expect(query.providerId).toBe(42n);
  });

  it('updates the payout account of the authenticated provider', async () => {
    const dto = plainToInstance(UpdateProviderPayoutDto, payload);
    await controller.updateMine('42', dto);

    const command = commandBus.execute.mock.calls[0][0];
    expect(command).toBeInstanceOf(UpdateProviderPayoutCommand);
    expect(command).toEqual(
      expect.objectContaining({ providerId: 42n, payload: dto }),
    );
  });

  describe('UpdateProviderPayoutDto', () => {
    const errorsFor = async (input: Record<string, unknown>) =>
      (await validate(plainToInstance(UpdateProviderPayoutDto, input))).map(
        (error) => error.property,
      );

    it('normalizes separators and accepts a complete account', async () => {
      const dto = plainToInstance(UpdateProviderPayoutDto, payload);

      expect(await validate(dto)).toEqual([]);
      expect(dto.holderName).toBe('Maria Prestadora');
      expect(dto.holderDocument).toBe('52998224725');
      expect(dto.accountNumber).toBe('987654');
    });

    it.each([
      ['holderName', 'AB'],
      ['holderType', 'PERSON'],
      ['holderDocument', '123'],
      ['bankCode', '34'],
      ['branchNumber', '12345'],
      ['branchCheckDigit', '12'],
      ['accountNumber', '12345678901234'],
      ['accountCheckDigit', '123'],
      ['accountType', 'PIX'],
    ])('rejects an invalid %s', async (field, value) => {
      expect(await errorsFor({ ...payload, [field]: value })).toEqual([field]);
    });

    it('requires every mandatory field', async () => {
      expect(await errorsFor({})).toEqual(
        expect.arrayContaining([
          'holderName',
          'holderType',
          'holderDocument',
          'bankCode',
          'branchNumber',
          'accountNumber',
          'accountCheckDigit',
          'accountType',
        ]),
      );
    });
  });
});
