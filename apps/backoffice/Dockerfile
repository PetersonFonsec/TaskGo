FROM node:22-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/backoffice/package.json apps/backoffice/package.json
RUN npm ci --workspace apps/backoffice --include-workspace-root

COPY apps/backoffice apps/backoffice
WORKDIR /workspace/apps/backoffice
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/backoffice/config/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/backoffice/config/docker-entrypoint.sh /docker-entrypoint-backoffice.sh
COPY --from=build /workspace/apps/backoffice/dist/backoffice/browser/ /usr/share/nginx/html/
RUN chmod +x /docker-entrypoint-backoffice.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint-backoffice.sh"]
