import { OPERATOR_ROLE_OPTIONS } from './operator-admin.models';

describe('operator role options', () => {
  it('contains exactly the four fixed Backoffice roles', () => {
    expect(OPERATOR_ROLE_OPTIONS.map((role) => role.label)).toEqual([
      'Administrator',
      'Support',
      'Finance',
      'Moderator'
    ]);
    expect(OPERATOR_ROLE_OPTIONS.map((role) => role.value)).toEqual([
      'ADMINISTRATOR',
      'SUPPORT',
      'FINANCE',
      'MODERATOR'
    ]);
  });
});
