import { sanitizeForStructuredLog } from './log-sanitizer';

describe('sanitizeForStructuredLog', () => {
  it('redacts passwords, JWTs, authorization values, and invitation tokens', () => {
    expect(
      sanitizeForStructuredLog({
        password: 'secret',
        jwt: 'header.payload.signature',
        authorization: 'Bearer token',
        invitationToken: 'invite-secret',
        nested: { apiKey: 'key', safe: 'value' },
      }),
    ).toEqual({
      password: '[REDACTED]',
      jwt: '[REDACTED]',
      authorization: '[REDACTED]',
      invitationToken: '[REDACTED]',
      nested: { apiKey: '[REDACTED]', safe: 'value' },
    });
  });

  it('collapses complete personal records while keeping minimal fields', () => {
    expect(
      sanitizeForStructuredLog({
        requestId: 'req-1',
        adminId: '42',
        operator: {
          name: 'Admin Operator',
          email: 'admin@example.com',
          cpf: '00000000000',
          phone: '+5511999999999',
        },
        target: { entityType: 'Provider', entityId: '10' },
      }),
    ).toEqual({
      requestId: 'req-1',
      adminId: '42',
      operator: { redacted: 'complete_personal_record' },
      target: { entityType: 'Provider', entityId: '10' },
    });
  });
});
