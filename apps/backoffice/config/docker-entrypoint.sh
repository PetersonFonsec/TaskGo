#!/bin/sh
set -eu

cat > /usr/share/nginx/html/assets/backoffice-runtime-config.js <<EOF
window.__BACKOFFICE_CONFIG__ = {
  production: ${BACKOFFICE_PRODUCTION:-true},
  apiUrl: "${BACKOFFICE_API_URL:-/admin}",
  adminTokenStorageKey: "${BACKOFFICE_ADMIN_TOKEN_STORAGE_KEY:-proxi.backoffice.adminToken}"
};
EOF

exec nginx -g "daemon off;"
