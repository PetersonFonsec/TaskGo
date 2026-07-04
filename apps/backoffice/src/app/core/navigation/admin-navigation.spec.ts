import { navigationForRole } from './admin-navigation';

describe('admin navigation matrix', () => {
  it('shows Administrator-only and provider operations entries for administrators', () => {
    expect(navigationForRole('ADMINISTRATOR').map((item) => item.label)).toEqual([
      'Dashboard',
      'Providers',
      'Audit log',
      'Operators'
    ]);
  });

  it('shows only provider read workflow entries for support', () => {
    expect(navigationForRole('SUPPORT').map((item) => item.label)).toEqual([
      'Dashboard',
      'Providers'
    ]);
  });

  it('shows only finance navigation for finance operators', () => {
    expect(navigationForRole('FINANCE').map((item) => item.label)).toEqual(['Payments']);
  });

  it('shows only moderation navigation for moderators', () => {
    expect(navigationForRole('MODERATOR').map((item) => item.label)).toEqual(['Moderation']);
  });
});
