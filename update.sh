#!/bin/bash
#
# FVX Suscription Admin Frontend (Docker) — reconstruir y levantar
# Uso: ./update.sh [local|prod]
#
set -e

MODE=${1:-local}

echo "========================================="
echo "FVX Suscription Admin Frontend — Updating"
echo "Mode: $MODE"
echo "========================================="

if [ "$MODE" = "local" ]; then
  echo "Actualizando stack LOCAL..."
  # git pull origin main

  docker compose stop web 2>/dev/null || true
  docker compose rm -f web 2>/dev/null || true
  docker compose build --no-cache web
  docker compose up -d web

  echo ""
  echo "✅ Frontend local actualizado — http://localhost:4201"
  echo "Logs: docker compose logs -f web"

elif [ "$MODE" = "prod" ]; then
  echo "Actualizando stack PROD (nginx)..."
  # git pull origin main

  docker compose stop web 2>/dev/null || true
  docker compose --profile prod stop nginx 2>/dev/null || true
  docker compose --profile prod rm -f nginx 2>/dev/null || true
  docker compose --profile prod build --no-cache nginx
  docker compose --profile prod up -d nginx

  echo ""
  echo "✅ Frontend prod actualizado — http://localhost:8081"
  echo "Logs: docker compose --profile prod logs -f nginx"

else
  echo "❌ Modo no válido: $MODE"
  echo "Uso: ./update.sh [local|prod]"
  exit 1
fi
