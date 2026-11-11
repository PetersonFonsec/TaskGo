import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Length(32, 256)
  refresh_token!: string;
}
