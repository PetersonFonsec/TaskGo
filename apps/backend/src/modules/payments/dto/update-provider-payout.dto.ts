import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  ProviderBankAccountHolderType,
  ProviderBankAccountType,
  ProviderBankAccountUpdateRequest,
} from '@taskgo/shared';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const stripSeparators = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[\s./-]/g, '') : value;

/** Write-only: these values go to the gateway and are never persisted raw. */
export class UpdateProviderPayoutDto
  implements ProviderBankAccountUpdateRequest
{
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do titular' })
  @MinLength(3, { message: 'Nome do titular muito curto' })
  @MaxLength(128, { message: 'Nome do titular muito longo' })
  holderName: string;

  @IsIn(['INDIVIDUAL', 'COMPANY'], {
    message: 'Tipo de titular deve ser INDIVIDUAL ou COMPANY',
  })
  holderType: ProviderBankAccountHolderType;

  @Transform(stripSeparators)
  @IsString()
  @Matches(/^(\d{11}|\d{14})$/, {
    message: 'Documento do titular deve ser um CPF ou CNPJ',
  })
  holderDocument: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d{3}$/, { message: 'Código do banco deve ter 3 dígitos' })
  bankCode: string;

  @Transform(stripSeparators)
  @IsString()
  @Matches(/^\d{1,4}$/, { message: 'Agência deve ter até 4 dígitos' })
  branchNumber: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^\d?$/, { message: 'Dígito da agência deve ter 1 dígito' })
  branchCheckDigit?: string | null;

  @Transform(stripSeparators)
  @IsString()
  @Matches(/^\d{1,13}$/, { message: 'Conta deve ter até 13 dígitos' })
  accountNumber: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[0-9xX]{1,2}$/, {
    message: 'Dígito da conta deve ter 1 ou 2 caracteres',
  })
  accountCheckDigit: string;

  @IsIn(['CHECKING', 'SAVINGS'], {
    message: 'Tipo de conta deve ser CHECKING ou SAVINGS',
  })
  accountType: ProviderBankAccountType;
}
