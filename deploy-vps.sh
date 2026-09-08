#!/usr/bin/env bash
#
# Despliegue de la plataforma (sitio público + panel) al VPS.
#
#   ./deploy-vps.sh            → compila y publica una release nueva
#   ./deploy-vps.sh --rollback → vuelve a la release anterior (sin compilar)
#   ./deploy-vps.sh --list     → muestra las releases y cuál está activa
#
# Publica por RELEASES con un symlink `current`, igual que hacía Firebase con
# sus versiones: el cambio es atómico (se mueve el symlink, no se copian
# archivos sobre el sitio en vivo) y volver atrás es instantáneo. Sin esto, un
# despliegue a medias deja el sitio roto mientras dura la copia.
set -euo pipefail

HOST="${DEPLOY_HOST:-root@147.93.68.99}"
SSH_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_ed25519_amalia}"
REMOTE_DIR="/opt/exp-lita-web"
LOCAL_DIST="dist/fvx-frontend/browser"
KEEP=5   # releases que se conservan para poder volver atrás

SSH=(ssh -i "$SSH_KEY" -o IdentitiesOnly=yes "$HOST")

listar() {
  "${SSH[@]}" "ls -1 $REMOTE_DIR/releases | sort; echo '--- activa:'; readlink $REMOTE_DIR/current"
}

rollback() {
  "${SSH[@]}" "set -e
    cd $REMOTE_DIR
    actual=\$(basename \$(readlink current))
    anterior=\$(ls -1 releases | sort | grep -B1 -x \"\$actual\" | head -1)
    if [ -z \"\$anterior\" ] || [ \"\$anterior\" = \"\$actual\" ]; then
      echo 'No hay una release anterior a la que volver.'; exit 1
    fi
    ln -sfn releases/\$anterior current
    nginx -t && systemctl reload nginx
    echo \"Vuelto a: \$anterior\""
}

publicar() {
  echo "==> Compilando (producción)"
  npx ng build --configuration production

  [ -f "$LOCAL_DIST/index.html" ] || { echo "No se generó $LOCAL_DIST/index.html"; exit 1; }

  local rel commit
  commit=$(git rev-parse --short HEAD 2>/dev/null || echo nogit)
  rel="$(date +%Y%m%d-%H%M%S)-$commit"

  echo "==> Subiendo release $rel"
  # --delete dentro de la carpeta nueva (no toca la que está en vivo).
  rsync -az --delete -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes" \
    "$LOCAL_DIST/" "$HOST:$REMOTE_DIR/releases/$rel/"

  echo "==> Activando"
  "${SSH[@]}" "set -e
    cd $REMOTE_DIR
    test -f releases/$rel/index.html
    ln -sfn releases/$rel current
    nginx -t >/dev/null && systemctl reload nginx
    # Conserva las últimas $KEEP releases; el resto se borra.
    ls -1 releases | sort -r | tail -n +$((KEEP + 1)) | while read -r vieja; do
      rm -rf \"releases/\$vieja\"
    done
    echo 'Activa: '\$(readlink current)"

  echo "==> Listo → https://exp-lita.favric.cl"
}

case "${1:-}" in
  --rollback) rollback ;;
  --list)     listar ;;
  "")         publicar ;;
  *)          echo "Uso: $0 [--rollback|--list]"; exit 1 ;;
esac
