import { FormatedProviderParamPipe } from './formated-provider-param-pipe';

describe('FormatedProviderParamPipe', () => {
  const pipe = new FormatedProviderParamPipe();

  it('maps the provider display fields', () => {
    expect(
      pipe.transform({
        user: { name: 'Ana', photoUrl: '/ana.png' },
        verified: true,
        services: [{ basePrice: '120' }],
      }),
    ).toEqual({ title: 'Ana', thumb: '/ana.png', verified: true, price: 120, favorite: false });
  });

  it('handles missing user and service data', () => {
    for (const value of [undefined, {}, { services: [] }]) {
      expect(pipe.transform(value)).toEqual({
        title: 'Profissional Proxi',
        thumb: '',
        verified: false,
        price: 0,
        favorite: false,
      });
    }
  });

  it('uses the alternate price and nested verification fields', () => {
    expect(
      pipe.transform({ user: { provider: { verified: true } }, services: [{ price: '75' }] }),
    ).toEqual(jasmine.objectContaining({ price: 75, verified: true }));
    expect(pipe.transform({ services: [{ basePrice: 'invalid' }] }).price).toBe(0);
  });
});
