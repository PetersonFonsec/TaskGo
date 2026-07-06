import {
  buildCorsOptions,
  isCorsOriginAllowed,
  parseCorsOrigins,
} from './cors.config';

describe('CORS runtime configuration', () => {
  it('accepts configured public and Backoffice origins outside development', () => {
    const config = {
      nodeEnv: 'production',
      publicOrigins: 'https://app.proxi.test',
      backofficeOrigins: 'https://backoffice.proxi.test,http://localhost:4300',
    };

    expect(parseCorsOrigins(config)).toEqual([
      'https://app.proxi.test',
      'https://backoffice.proxi.test',
      'http://localhost:4300',
    ]);
    expect(isCorsOriginAllowed('https://app.proxi.test', config)).toBe(true);
    expect(isCorsOriginAllowed('https://backoffice.proxi.test', config)).toBe(
      true,
    );
    expect(isCorsOriginAllowed('https://evil.example', config)).toBe(false);
  });

  it('rejects unlisted production origins through the Nest CORS callback', () => {
    const options = buildCorsOptions({
      nodeEnv: 'production',
      publicOrigins: 'https://app.proxi.test',
      backofficeOrigins: 'https://backoffice.proxi.test',
    });
    const callback = jest.fn();

    (options.origin as Function)('https://evil.example', callback);

    expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
  });

  it('keeps development permissive for local tooling', () => {
    expect(
      isCorsOriginAllowed('http://unlisted.localhost:4300', {
        nodeEnv: 'development',
      }),
    ).toBe(true);
  });
});
