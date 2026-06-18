#!/bin/sh
set -e
# El volumen nombrado sobre /app/node_modules puede quedar desfasado respecto al
# package-lock.json del bind mount (p. ej. tras agregar echarts/ngx-echarts).
# Comparar lock del host con una copia guardada en el volumen tras el último npm ci.
MARKER="node_modules/.fvx-package-lock.json"
if [ ! -f package-lock.json ]; then
  echo "[fvx-frontend] Falta package-lock.json en /app" >&2
  exit 1
fi
if [ ! -f "$MARKER" ] || ! cmp -s package-lock.json "$MARKER"; then
  echo "[fvx-frontend] package-lock distinto o node_modules nuevo — ejecutando npm ci..."
  npm ci
  cp package-lock.json "$MARKER"
fi
exec "$@"
