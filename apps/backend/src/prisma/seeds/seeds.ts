import {
  PrismaClient,
  UserType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  AdminRole,
  ProviderStatus,
} from '@prisma/client';
import { CategorySeeds } from './category.seed';
import * as bcrypt from 'bcrypt';
import {
  SEARCH_LOCATIONS,
  SEARCH_PROVIDERS,
  seedAddress,
} from './search-fixtures';

const prisma = new PrismaClient();

const SEED_EMAIL_DOMAIN = 'teste.com';
const SEED_PASSWORD = '123456';
const SEED_ADMIN_EMAIL = 'admin@teste.com';
const SEED_NOW = new Date('2026-01-05T12:00:00.000Z');
const REVIEW_TAGS = [
  { name: 'Pontual', slug: 'pontual' },
  { name: 'Preço justo', slug: 'preco-justo' },
  { name: 'Boa comunicação', slug: 'boa-comunicacao' },
  { name: 'Serviço limpo', slug: 'servico-limpo' },
  { name: 'Resolveu o problema', slug: 'resolveu-o-problema' },
  { name: 'Prestador educado', slug: 'prestador-educado' },
  { name: 'Voltaria a contratar', slug: 'voltaria-a-contratar' },
  { name: 'Atendimento rápido', slug: 'atendimento-rapido' },
];

const defaultServiceAvailability = {
  timezone: 'America/Sao_Paulo',
  weekdays: {
    monday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    tuesday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    wednesday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    thursday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    friday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
  },
};

async function main() {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ALLOW_DEMO_SEED !== 'true'
  ) {
    throw new Error(
      'Demo seed requires ALLOW_DEMO_SEED=true and is forbidden in production',
    );
  }
  const adminPasswordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  await prisma.adminUser.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {
      name: 'Administrador Proxi',
      passwordHash: adminPasswordHash,
      role: AdminRole.ADMINISTRATOR,
      active: true,
      tokenVersion: 0,
      invitationTokenHash: null,
      invitationExpiresAt: null,
      activatedAt: SEED_NOW,
    },
    create: {
      name: 'Administrador Proxi',
      email: SEED_ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: AdminRole.ADMINISTRATOR,
      active: true,
      activatedAt: SEED_NOW,
    },
  });

  await Promise.all(
    REVIEW_TAGS.map((tag) =>
      prisma.reviewTag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name, isActive: true },
        create: tag,
      }),
    ),
  );

  // Keep the development dataset repeatable without touching non-seed users.
  // Orders must be removed first because the client relation is restrictive.
  const seedUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map(({ id }) => id);

  if (seedUserIds.length > 0) {
    await prisma.order.deleteMany({
      where: {
        OR: [
          { clientId: { in: seedUserIds } },
          { service: { providerId: { in: seedUserIds } } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: seedUserIds } } });
  }

  await CategorySeeds(prisma);

  // Um cliente por localização, com endereço alternativo para troca na busca.
  const clientes = await Promise.all(
    SEARCH_LOCATIONS.map(async (location, i) => {
      return prisma.user.create({
        data: {
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@teste.com`,
          passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
          type: UserType.CLIENTE,
          cpf: `123.456.78${(i < 10 ? 10 + i : 50 + i).toString().padStart(2, '0')}-90`,
          phone: `+55 11 91${(100000 + i).toString().padStart(6, '0')}`,
          emailVerified: true,
          phoneVerified: true,
          addresses: {
            create: [
              { ...seedAddress(location), label: 'Casa', isDefault: true },
              {
                ...seedAddress(
                  SEARCH_LOCATIONS[(i + 1) % SEARCH_LOCATIONS.length],
                ),
                label: 'Trabalho',
                isDefault: false,
              },
            ],
          },
        },
      });
    }),
  );

  // Fixtures determinísticas para cobertura, categorias e exclusões da busca.
  const prestadores = await Promise.all(
    SEARCH_PROVIDERS.map(async (fixture, i) => {
      const location = SEARCH_LOCATIONS[fixture.locationIndex];
      const verified = fixture.status === ProviderStatus.APPROVED;

      return prisma.provider.create({
        data: {
          user: {
            create: {
              cpf: `123.456.78${(20 + i).toString().padStart(2, '0')}-90`,
              name: `Prestador ${i + 1}`,
              email: `prestador${i + 1}@teste.com`,
              passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
              type: UserType.PRESTADOR,
              phone: `+55 11 92${(100000 + i).toString().padStart(6, '0')}`,
              photoUrl: 'https://dummyimage.com/600x400/000/fff',
              addresses: {
                create: {
                  ...seedAddress(location),
                  label: 'Atendimento',
                  isDefault: true,
                },
              },
            },
          },
          locations: {
            create: {
              lat: location.lat,
              lng: location.lng,
            },
          },
          serviceAreas: {
            create: fixture.areaLocationIndices.map((index) => ({
              mode: 'RADIUS',
              centerLat: SEARCH_LOCATIONS[index].lat,
              centerLng: SEARCH_LOCATIONS[index].lng,
              radiusKm: fixture.radiusKm,
              active: fixture.areaActive,
            })),
          },
          bio: `Atendimento em ${location.city}: ${fixture.services.map((service) => service.title).join(', ')}.`,
          verified,
          status: fixture.status,
          acceptPix: i % 3 !== 1,
          acceptsCard: i % 3 !== 2,
          emergencyCare: i % 4 === 0,
          isAvailable24h: i % 5 === 0,
          services: {
            create: fixture.services.map((service) => ({
              ...service,
              availability: defaultServiceAvailability,
            })),
          },
        },
        include: {
          user: true,
          services: true,
        },
      });
    }),
  );

  // cria pedidos ligando clientes e serviços
  for (let i = 0; i < 10; i++) {
    const cliente = clientes[i];
    const prestador = prestadores[i];
    const servico = prestador.services[0];
    const isProviderFlowFixture = i === 0;

    const order = await prisma.order.create({
      data: {
        clientId: cliente.id,
        serviceId: servico.id,
        // Prestador 1 começa com um atendimento pronto para ser iniciado.
        status: isProviderFlowFixture
          ? OrderStatus.EM_DESLOCAMENTO
          : OrderStatus.AGUARDANDO_APROVACAO,
        finalPrice: servico.basePrice,
        priceAdjusted: false,
        scheduledFor: new Date(
          SEED_NOW.getTime() + (i + 1) * 24 * 60 * 60 * 1000,
        ),
        payment: {
          create: {
            method: PaymentMethod.PIX,
            status: isProviderFlowFixture
              ? PaymentStatus.AUTHORIZED
              : PaymentStatus.CREATED,
            amount: servico.basePrice,
            authorizedAt: isProviderFlowFixture ? SEED_NOW : null,
          },
        },
        addressSnap: {
          create: {
            ...seedAddress(SEARCH_LOCATIONS[SEARCH_PROVIDERS[i].locationIndex]),
          },
        },
      },
    });

    // Mantém as avaliações de exemplo fora do pedido usado no fluxo ativo.
    if (i > 0 && i < 5) {
      const rating = 3 + (i % 3); // 3..5, deterministic
      await prisma.avaliacao.create({
        data: {
          orderId: order.id,
          clientId: cliente.id,
          providerId: prestador.id,
          rating,
          comment: `Avaliação automática: nota ${rating} para o prestador ${prestador.user.name}`,
          // reviewedAt will default to now()
        },
      });
      await prisma.provider.update({
        where: { id: prestador.id },
        data: { ratingAvg: rating, ratingCount: 1 },
      });
    }
  }

  // Segundo cenário do Prestador 1: serviço já iniciado e pronto para que ele
  // finalize o atendimento e solicite a confirmação do cliente.
  const providerFlowService = prestadores[0].services[1];
  await prisma.order.create({
    data: {
      clientId: clientes[1].id,
      serviceId: providerFlowService.id,
      status: OrderStatus.EM_ANDAMENTO,
      finalPrice: providerFlowService.basePrice,
      estimatedPrice: providerFlowService.basePrice,
      priceAdjusted: false,
      scheduledFor: new Date(SEED_NOW.getTime() + 2 * 24 * 60 * 60 * 1000),
      payment: {
        create: {
          method: PaymentMethod.PIX,
          status: PaymentStatus.AUTHORIZED,
          amount: providerFlowService.basePrice,
          authorizedAt: SEED_NOW,
        },
      },
      addressSnap: {
        create: {
          ...seedAddress(SEARCH_LOCATIONS[0]),
        },
      },
    },
  });

  console.log('✅ Seeds inseridos com sucesso!');
  console.log(`🔐 Backoffice: ${SEED_ADMIN_EMAIL} / ${SEED_PASSWORD}`);
  console.log(
    `🛠️ Fluxo do prestador: prestador1@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}`,
  );
  console.log(
    '   Há um pedido para iniciar e outro em andamento para finalizar e solicitar confirmação.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
