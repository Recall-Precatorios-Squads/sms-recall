#!/bin/sh
# Backup diário do banco (roda no container "backup"). Guarda os últimos MANTER_DIAS dias em ./backups.
# Copie ./backups para fora do mini PC (disco externo ou outro mini PC): backup no mesmo disco não salva de disco queimado.
set -u
while true; do
  arquivo="/backups/sms-$(date -u +%Y%m%d-%H%M%S).dump"
  if pg_dump -h postgres -U sms -d sms -Fc -f "$arquivo"; then
    echo "$(date -u) backup ok: $arquivo"
  else
    echo "$(date -u) ERRO no backup" >&2
    rm -f "$arquivo"
  fi
  find /backups -name 'sms-*.dump' -mtime +"${MANTER_DIAS:-14}" -delete
  sleep 86400
done
