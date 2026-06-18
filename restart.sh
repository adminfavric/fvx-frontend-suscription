#!/bin/bash
#
# FVX Suscription Admin Frontend (Docker) — reinicio rápido
# Uso: ./restart.sh [local|prod]
#
set -e

MODE=${1:-local}

echo "========================================="
echo "FVX Suscription Admin Frontend — Restarting"
echo "Mode: $MODE"
echo "========================================="

if [ "$MODE" = "local" ]; then
  docker compose restart web 2>/dev/null || docker compose up -d web
  echo ""
  echo "✅ Servicio web reiniciado — http://localhost:4201"
  echo "Logs: docker compose logs -f web"

elif [ "$MODE" = "prod" ]; then
  docker compose --profile prod restart nginx 2>/dev/null || docker compose --profile prod up -d nginx
  echo ""
  echo "✅ Servicio nginx reiniciado — http://localhost:8081"
  echo "Logs: docker compose --profile prod logs -f nginx"

else
  echo "❌ Modo no válido: $MODE"
  echo "Uso: ./restart.sh [local|prod]"
  exit 1
fi
