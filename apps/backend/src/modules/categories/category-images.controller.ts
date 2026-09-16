import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../shared/decorators/public.decorator';
import { AdminAuthGuard } from '../admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../admin/authorization/admin-roles.guard';
import { AdminPermissions } from '../admin/authorization/admin-roles.decorator';
import { AdminCapability } from '../admin/authorization/admin-permissions';

interface ImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminPermissions(AdminCapability.ManageCatalog)
@Controller('admin/categories/images')
export class CategoryImagesController {
  constructor(private readonly config: ConfigService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  async upload(@UploadedFile() file?: ImageFile) {
    if (
      !file ||
      !file.size ||
      file.size > MAX_IMAGE_BYTES ||
      !this.isImage(file)
    ) {
      throw new BadRequestException(
        'Envie uma imagem JPEG, PNG, WebP ou GIF de até 10 MB.',
      );
    }
    const token =
      this.config.get<string>('CLOUDFLARE_IMAGES_API_TOKEN') ||
      this.config.get<string>('CDN_API_TOKEN');
    const account =
      this.config.get<string>('CLOUDFLARE_IMAGES_ACCOUNT_ID') ||
      '020e6063e3ac9ce4a76b09dbaa7705ec';
    const hash =
      this.config.get<string>('CLOUDFLARE_IMAGES_ACCOUNT_HASH') ||
      'Bpbv9d8J9NqFhm--zUdxEA';
    const variant =
      this.config.get<string>('CLOUDFLARE_IMAGES_VARIANT') || 'public';
    if (!token)
      throw new ServiceUnavailableException(
        'Configure o token do Cloudflare Images no backend para enviar imagens.',
      );
    const body = new FormData();
    body.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      'category-thumbnail',
    );
    body.append('requireSignedURLs', 'false');
    body.append('metadata', JSON.stringify({ purpose: 'category-thumbnail' }));
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/images/v1`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok) throw new Error('Upload rejected');
      const result = (await response.json()) as {
        success?: boolean;
        result?: { id?: string; variants?: string[] };
      };
      if (!result.success || !result.result?.id)
        throw new Error('Invalid upload response');
      const thumb = `https://imagedelivery.net/${encodeURIComponent(hash)}/${encodeURIComponent(result.result.id)}/${encodeURIComponent(variant)}`;
      if (!result.result.variants?.includes(thumb))
        throw new Error('Delivery variant is not configured');
      return { imageId: result.result.id, thumb };
    } catch {
      throw new BadGatewayException(
        'Não foi possível enviar a imagem. Verifique o token, a conta e a variante do Cloudflare Images e tente novamente.',
      );
    }
  }

  private isImage(file: ImageFile): boolean {
    const bytes = file.buffer;
    if (file.mimetype === 'image/jpeg')
      return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (file.mimetype === 'image/png')
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (file.mimetype === 'image/gif')
      return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
    if (file.mimetype === 'image/webp')
      return (
        bytes.subarray(0, 4).toString() === 'RIFF' &&
        bytes.subarray(8, 12).toString() === 'WEBP'
      );
    return false;
  }
}
