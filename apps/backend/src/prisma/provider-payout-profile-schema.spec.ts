import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('provider payout profile schema', () => {
  const schema = readFileSync(resolve(__dirname, 'schema.prisma'), 'utf8');
  const model = schema.match(
    /model ProviderPayoutProfile \{([\s\S]*?)\n\}/,
  )?.[1];

  it('stores only approved payout synchronization and masked metadata', () => {
    expect(model).toBeDefined();
    expect(model).toContain('pagarmeRecipientId');
    expect(model).toContain('syncStatus');
    expect(model).toContain('bankAccountStatus');
    expect(model).toContain('branchLastDigits');
    expect(model).toContain('accountLastDigits');
    expect(model).toContain('lastErrorCode');
  });

  it('does not define raw financial credentials or provider documents', () => {
    expect(model).not.toMatch(
      /\b(accountNumber|branchNumber|holderDocument|password|pixKey)\b/,
    );
  });

  it('uses safe defaults that do not infer payout readiness', () => {
    expect(model).toContain('@default(UNKNOWN)');
    expect(model).toContain('@default(UNCONFIRMED)');
  });
});
