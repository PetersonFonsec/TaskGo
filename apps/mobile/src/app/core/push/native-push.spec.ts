import { NativePush } from './native-push';

describe('NativePush', () => {
  it('reports no push platform in the browser', () => {
    expect(new NativePush().platform()).toBeNull();
  });
});
