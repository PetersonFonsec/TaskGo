import { Prisma } from '@prisma/client';

/**
 * Bloqueio transacional por sessão (família de refresh tokens), compartilhado
 * por todas as instâncias via PostgreSQL. Encerrar a sessão e registrar um
 * aparelho nela tomam este bloqueio, então nunca se intercalam: ou o registro
 * vem antes e o encerramento apaga o aparelho, ou o encerramento vem antes e
 * o registro encontra a sessão revogada. Liberado no fim da transação.
 */
export async function lockSession(
  tx: Prisma.TransactionClient,
  familyId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${familyId}, 0))::text`;
}
