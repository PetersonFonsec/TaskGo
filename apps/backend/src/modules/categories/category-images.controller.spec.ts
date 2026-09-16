import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CategoryImagesController } from './category-images.controller';

describe('CategoryImagesController', () => {
  const thumb =
    'https://imagedelivery.net/Bpbv9d8J9NqFhm--zUdxEA/image-123/public';
  const file = {
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    size: 8,
    mimetype: 'image/png',
  };
  let controller: CategoryImagesController;
  let request: jest.SpyInstance;
  beforeEach(() => {
    controller = new CategoryImagesController(
      new ConfigService({ CLOUDFLARE_IMAGES_API_TOKEN: 'test-token' }),
    );
    request = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: { id: 'image-123', variants: [thumb] },
        }),
      ),
    );
  });
  afterEach(() => jest.restoreAllMocks());
  it('uploads privately to the configured account and returns the delivery URL', async () => {
    await expect(controller.upload(file)).resolves.toEqual({
      imageId: 'image-123',
      thumb,
    });
    expect(request).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/020e6063e3ac9ce4a76b09dbaa7705ec/images/v1',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        body: expect.any(FormData),
      }),
    );
  });
  it('rejects missing, oversized and spoofed files before making a request', async () => {
    for (const invalid of [
      undefined,
      { ...file, size: 11 * 1024 * 1024 },
      { ...file, buffer: Buffer.from('<script>') },
    ]) {
      await expect(controller.upload(invalid)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(request).not.toHaveBeenCalled();
  });
  it('requires server-side credentials', async () => {
    controller = new CategoryImagesController(new ConfigService({}));
    await expect(controller.upload(file)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(request).not.toHaveBeenCalled();
  });
  it('does not expose upstream errors or credentials', async () => {
    request.mockRejectedValue(new Error('sensitive upstream details'));
    await expect(controller.upload(file)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
  it('rejects a missing delivery variant', async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: { id: 'image-123', variants: [] },
        }),
      ),
    );
    await expect(controller.upload(file)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
