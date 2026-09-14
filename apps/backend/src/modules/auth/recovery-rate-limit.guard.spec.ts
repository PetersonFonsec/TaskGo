import { RecoveryRateLimitGuard } from './recovery-rate-limit.guard';
describe('RecoveryRateLimitGuard', () => {
  it('bounds requests per source and expires the window', () => {
    jest.useFakeTimers();
    try {
      const guard = new RecoveryRateLimitGuard();
      const context: any = {
        switchToHttp: () => ({ getRequest: () => ({ ip: '127.0.0.1' }) }),
      };
      for (let n = 0; n < 5; n++) expect(guard.canActivate(context)).toBe(true);
      expect(() => guard.canActivate(context)).toThrow('Aguarde');
      jest.advanceTimersByTime(60001);
      expect(guard.canActivate(context)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
