import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface FeeSource {
  category: string;
  platformFeePct: Prisma.Decimal | number | null;
}

/**
 * Taxa da plataforma aplicada ao serviço: a do serviço, senão a da categoria,
 * senão a padrão de `payment.defaultPlatformFeePct`.
 */
export async function resolvePlatformFeePct(
  prisma: Pick<PrismaService, 'category'>,
  service: FeeSource,
  defaultFeePct: number,
) {
  const category =
    service.platformFeePct === null
      ? await prisma.category.findFirst({
          where: {
            OR: [{ slug: service.category }, { name: service.category }],
          },
          select: { platformFeePct: true },
        })
      : null;
  const feePct = Number(
    service.platformFeePct ?? category?.platformFeePct ?? defaultFeePct,
  );
  if (!Number.isFinite(feePct) || feePct < 0 || feePct > 1) {
    throw new BadRequestException('Taxa da plataforma inválida');
  }
  return feePct;
}

/** Divide o valor em centavos como na cobrança: a plataforma arredonda primeiro. */
export function splitPlatformFee(amount: number, feePct: number) {
  const amountCents = Math.round(amount * 100);
  const platformAmountCents = Math.round(amountCents * feePct);
  return {
    amountCents,
    platformAmountCents,
    providerAmountCents: amountCents - platformAmountCents,
  };
}
