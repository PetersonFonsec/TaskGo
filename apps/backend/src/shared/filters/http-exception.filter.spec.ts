import { ArgumentsHost, BadRequestException } from '@nestjs/common';

import { CustomExceptionFilter } from './http-exception.filter';

describe('CustomExceptionFilter', () => {
  const filter = new CustomExceptionFilter();

  function context() {
    const status = jest.fn();
    const json = jest.fn();
    status.mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/resource', requestId: 'req-1' }),
      }),
    } as ArgumentsHost;
    return { host, status, json };
  }

  it('normalizes class-validator message arrays', () => {
    const { host, status, json } = context();

    filter.catch(new BadRequestException(['name must be a string']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['name must be a string'],
        path: '/resource',
        requestId: 'req-1',
      }),
    );
  });

  it('hides unexpected exception details', () => {
    const { host, status, json } = context();

    filter.catch(new Error('database password leaked'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: ['Internal server error'],
        errorCode: 'INTERNAL_SERVER_ERROR',
      }),
    );
  });
});
