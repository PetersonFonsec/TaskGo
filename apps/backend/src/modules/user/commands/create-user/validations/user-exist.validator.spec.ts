import { BadRequestException } from '@nestjs/common';
import { CreateUserCommand } from '../create-user.command';
import { UserExistValidator } from './user-exist.validator';

describe('UserExistValidator', () => {
  it('reports duplicate account details in Portuguese', async () => {
    const validator = new UserExistValidator();
    const command = {
      cpf: '12345678901',
      email: 'existente@example.com',
    } as CreateUserCommand;
    const dataSource = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 1n }) },
    };

    await expect(
      validator.validate(command, dataSource as never),
    ).rejects.toMatchObject({
      message:
        'Já existe uma conta com este CPF ou e-mail. Entre ou use outros dados.',
    } satisfies Partial<BadRequestException>);
  });
});
