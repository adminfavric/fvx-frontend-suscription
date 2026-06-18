#!/bin/bash
#
# FVX Suscription Admin Frontend (Docker) — arranque
# Uso: ./start.sh [local|prod]
#
# local: ng serve en http://localhost:4201 (servicio web)
# prod:  nginx + build estático en http://localhost:8081 (requiere red fvx_suscription_shared y backend)
#
set -e

MODE=${1:-local}

echo "========================================="
echo "FVX Suscription Admin Frontend — Starting"
echo "Mode: $MODE"
echo "========================================="

if ! docker network inspect fvx_suscription_shared >/dev/null 2>&1; then
  echo "⚠️  Red Docker 'fvx_suscription_shared' no existe. Créala con:"
  echo "    docker network create fvx_suscription_shared"
  echo ""
fi

if [ "$MODE" = "local" ]; then
  echo "Modo LOCAL (dev server Angular en :4201)..."
  docker compose build web
  docker compose up -d web
  echo ""
  echo "✅ Frontend local: http://localhost:4201"
  echo "   (API por defecto en environment.ts → http://localhost:8080)"
  echo ""
  echo "Logs: docker compose logs -f web"
  echo "Parar: docker compose stop web"

elif [ "$MODE" = "prod" ]; then
  echo "Modo PROD (nginx + build en :8081)..."
  docker compose stop web 2>/dev/null || true
  docker compose --profile prod build nginx
  docker compose --profile prod up -d nginx
  echo ""
  echo "✅ Frontend prod: http://localhost:8081"
  echo "   (proxy /api → fvx_suscription_backend_web en red fvx_suscription_shared)"
  echo ""
  echo "Logs: docker compose --profile prod logs -f nginx"
  echo "Parar: docker compose --profile prod stop nginx"

else
  echo "❌ Modo no válido: $MODE"
  echo "Uso: ./start.sh [local|prod]"
  exit 1
fi
