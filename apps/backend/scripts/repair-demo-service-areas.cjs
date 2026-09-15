// Add missing coverage to the existing demo dataset without resetting users or orders.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const host = new URL(process.env.DATABASE_URL).hostname;
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ALLOW_DEMO_SEED !== 'true' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(host)
  ) {
    throw new Error(
      'Repair requires ALLOW_DEMO_SEED=true and a local development database',
    );
  }
  const prisma = new PrismaClient();
  try {
    const created = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (let index = 1; index <= 10; index++) {
        const provider = await tx.provider.findFirst({
          where: {
            user: {
              email: `prestador${index}@teste.com`,
              name: `Prestador ${index}`,
            },
            serviceAreas: { none: {} },
          },
          select: {
            id: true,
            locations: {
              take: 1,
              orderBy: { capturedAt: 'desc' },
              select: { lat: true, lng: true },
            },
          },
        });
        const location = provider?.locations[0];
        if (
          !location ||
          !Number.isFinite(location.lat) ||
          !Number.isFinite(location.lng) ||
          Math.abs(location.lat) > 90 ||
          Math.abs(location.lng) > 180
        )
          continue;
        await tx.providerServiceArea.create({
          data: {
            providerId: provider.id,
            mode: 'RADIUS',
            active: true,
            centerLat: location.lat,
            centerLng: location.lng,
            radiusKm: 30,
          },
        });
        count++;
      }
      return count;
    });
    console.log(JSON.stringify({ createdDemoServiceAreas: created }));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
