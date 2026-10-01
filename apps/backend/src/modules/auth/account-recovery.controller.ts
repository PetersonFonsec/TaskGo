import { SafePassword } from '../../shared/security/password-policy';
import { RecoveryRateLimitGuard } from './recovery-rate-limit.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Public } from '../../shared/decorators/public.decorator';
import { AccountRecoveryService } from './account-recovery.service';
export class ResetPasswordDto {
  @IsString() @Length(64, 64) @Matches(/^[a-f0-9]+$/) token: string;
  @IsString() @MinLength(12) @MaxLength(72) @SafePassword() password: string;
}
@Controller('auth')
export class AccountRecoveryController {
  constructor(private readonly recovery: AccountRecoveryService) {}
  @Public()
  @UseGuards(RecoveryRateLimitGuard)
  @Post('reset-password')
  reset(@Body() body: ResetPasswordDto) {
    return this.recovery.reset(body.token, body.password);
  }
}
