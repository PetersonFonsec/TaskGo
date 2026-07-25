import { UserAddressValidator } from './user-address.validator';
import { BadRequestException } from '@nestjs/common';

describe('UserAddressValidator ownership boundary', () => {
  it('connects registration address to the created user and strips injected ownership', async () => {
    const dataSource = {
      address: {
        create: jest.fn(),
      },
    };
    const validator = new UserAddressValidator();

    await validator.validate(
      {
        id: '10',
        address: {
          label: 'Home',
          street: 'Main Street',
          number: '10',
          city: 'Sao Paulo',
          state: 'SP',
          cep: '01001000',
          lat: -23.55,
          lng: -46.63,
          userId: BigInt(20),
          unexpected: 'ignored',
        },
      } as never,
      dataSource as never,
    );

    expect(dataSource.address.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        label: 'Home',
        user: { connect: { id: BigInt(10) } },
      }),
    });
    const data = dataSource.address.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('userId');
    expect(data).not.toHaveProperty('unexpected');
  });

  it('rejects registration without an address', async () => {
    const validator = new UserAddressValidator();

    await expect(
      validator.validate({ id: '10' } as never, {} as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects address persistence before the created user id exists', async () => {
    const validator = new UserAddressValidator();

    await expect(
      validator.validate(
        {
          address: {
            label: 'Home',
            street: 'Main Street',
            number: '10',
            city: 'Sao Paulo',
            state: 'SP',
            cep: '01001000',
            lat: -23.55,
            lng: -46.63,
          },
        } as never,
        {} as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
