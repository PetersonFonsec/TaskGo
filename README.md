## Como startar o ambiente de desenvolvimento

# 1) Na pasta onde está o docker-compose.yml e o .env
docker compose up -d postgres_db

# 2) Rodar a API (dev)
docker compose up backend
# (ou -d para rodar em background)

# 3) (Opcional) Subir o pgAdmin
docker compose --profile tools up -d pgadmin


## Como rodar as migrations
# Abrir um shell no container da API
docker exec -it proxi_api sh

# Dentro do container:
npx prisma generate
npx prisma migrate dev --name init

## Release notes
The new MVP favorites feature adds:

- Favorite toggle on professional cards and profile pages.
- A dedicated `Favorites` view for clients to browse saved professionals.
- A `Show only favorites` search filter to restrict results to saved providers.

See `RELEASE_NOTES.md` for a short launch summary.
