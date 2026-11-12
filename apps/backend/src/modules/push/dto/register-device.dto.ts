import { DevicePlatform } from '@prisma/client';
import { IsEnum, IsString, Length } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @Length(20, 4096)
  token!: string;

  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
