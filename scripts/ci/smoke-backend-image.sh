#!/usr/bin/env bash
# Uses a private Docker network and a new in-memory PostgreSQL. Run after docker build.
set -euo pipefail
image=${1:?Pass the backend image tag}
name="taskgo-smoke-$$-${RANDOM}"
network="${name}-net"
db="${name}-pg"
api="${name}-api"
cleanup() {
  docker rm -f "$api" "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$network" >/dev/null
docker run -d --name "$db" --network "$network" --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=fixture -e POSTGRES_DB=smoke postgres:17-alpine >/dev/null
for ((i=0; i<60; i++)); do
  if docker exec "$db" pg_isready -h 127.0.0.1 -U postgres -d smoke >/dev/null; then break; fi
  sleep 1
done
db_env=(--network "$network" -e "DATABASE_URL=postgresql://postgres:fixture@$db:5432/smoke?connect_timeout=2")
docker run --rm "${db_env[@]}" "$image" npm run prisma:deploy
docker run --rm "${db_env[@]}" "$image" npm run prisma:deploy
# The production validator requires payment credentials. These fixtures make no external calls.
vars=(-e PUBLIC_FRONTEND_ORIGINS=https://web.example.invalid -e BACKOFFICE_FRONTEND_ORIGINS=https://admin.example.invalid
      -e ABACATEPAY_API_KEY=smoke-fixture -e ABACATEPAY_WEBHOOK_SECRET=smoke-fixture -e PORT=8197)
if failure=$(docker run --rm "${db_env[@]}" "${vars[@]}" "$image" 2>&1); then
  echo 'API started without JWT_SECRET' >&2; exit 1
fi
[[ "$failure" == *'JWT_SECRET is required'* ]]
docker run -d --name "$api" "${db_env[@]}" "${vars[@]}" -e JWT_SECRET=smoke-fixture "$image" >/dev/null
probe() {
  docker exec "$api" node -e 'fetch("http://127.0.0.1:8197"+process.argv[1]).then(r=>process.exit(r.status===Number(process.argv[2])?0:1)).catch(()=>process.exit(1))' "$1" "$2"
}
for ((i=0; i<60; i++)); do
  if probe /health 200; then break; fi
  sleep 1
done
probe /health 200 || { docker logs --tail 30 "$api"; exit 1; }
docker exec "$api" node -e 'if (!process.getuid()) process.exit(1); require("bcrypt").hashSync("fixture",4)'
docker run --rm --network "$network" "$image" node -e \
  'fetch("http://"+process.argv[1]+":8197/health").then(async r=>{if (!r.ok || (await r.json()).status !== "ok") process.exit(1)})' "$api"
probe /admin/auth/me 401
docker stop "$db" >/dev/null
if docker run --rm "${db_env[@]}" "$image" npm run prisma:deploy; then
  echo 'Migration command succeeded with PostgreSQL offline' >&2; exit 1
fi
probe /health 503
probe / 200
docker stop --time 15 "$api" >/dev/null
code=$(docker inspect --format '{{.State.ExitCode}}' "$api")
[[ "$code" == 0 || "$code" == 143 ]]
echo 'Production image passed migrations, readiness, auth guard and shutdown checks.'
