## Como startar o ambiente de desenvolvimento

# 1) Na pasta onde está o docker-compose.yml e o .env
docker compose up -d db

# 2) Rodar a API (dev)
docker compose up api
# (ou -d para rodar em background)

# 3) (Opcional) Subir o pgAdmin
docker compose --profile tools up -d pgadmin


## Como rodar as migrations
# Abrir um shell no container da API
docker exec -it proxi_api sh

# Dentro do container:
npx prisma generate
npx prisma migrate dev --name init
