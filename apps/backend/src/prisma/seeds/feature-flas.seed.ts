import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const favoritesFlag = await prisma.featureFlag.upsert({
        where: { name: 'favorites' } as any,
        update: {},
        create: {
            name: 'favorites',
            description: 'Habilita a funcionalidade de favoritos para clientes e prestadores',
            isActive: true,
        },
    });
    console.log('Adicionado feature flag para favoritos');

    console.log('✅ Seeds feature flag criado com sucesso!');
    return favoritesFlag;
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });