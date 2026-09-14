import { CreateProviderCommand } from './create-provider.command';
import { CreateProviderHandler } from './create-provider.handler';

describe('CreateProviderHandler', () => {
  it('rejects the legacy route that could attach another provider’s services', async () => {
    await expect(
      new CreateProviderHandler().execute(
        new CreateProviderCommand({ services: [101n] } as never),
      ),
    ).rejects.toThrow('Use /auth/register');
  });
});
