#!/bin/bash
# Gera o pacote de atualização do mini PC (sem internet lá): imagem da aplicação + código + instalador.
# Rode NO PC DE DESENVOLVIMENTO (Ubuntu/WSL, com internet e Docker), na raiz do repositório:
#   bash scripts/gerar-pacote.sh            → ../sms-recall-atualizacao.tar
#   bash scripts/gerar-pacote.sh --completo → inclui também Postgres, Traefik e o Docker (.deb) para instalação do zero
set -euo pipefail
cd "$(dirname "$0")/.."
COMPLETO=0; [ "${1:-}" = "--completo" ] && COMPLETO=1
NOME=$([ $COMPLETO = 1 ] && echo sms-recall-instalador || echo sms-recall-atualizacao)
SAIDA="$(cd .. && pwd)/$NOME"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ATENÇÃO: há mudanças não commitadas. O pacote leva só o que está commitado (git archive)."; read -r -p "Continuar? [s/N] " r; [ "$r" = "s" ] || exit 1
fi

# Testes: rode `npm test` antes, no terminal de desenvolvimento (aqui no WSL o node_modules do Windows não serve).
echo "== Build da imagem"; docker compose -p sms-recall build migrate
rm -rf "$SAIDA" && mkdir -p "$SAIDA/debs"
cp instalador/instalar.sh instalador/windows.ps1 instalador/LEIA-ME.txt "$SAIDA/"
git archive --format=tar --prefix=sms-recall/ HEAD | gzip > "$SAIDA/codigo.tar.gz"
if [ $COMPLETO = 1 ]; then
  echo "== Imagens (app, Postgres, Traefik)"; docker save sms-recall:latest traefik:v3.6 postgres:16-alpine | gzip -1 > "$SAIDA/imagens.tar.gz"
  echo "== Docker para Ubuntu 24.04 (.deb, sem internet)"
  docker run --rm -v "$SAIDA/debs:/saida" ubuntu:24.04 bash -c '
    set -e; export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq && apt-get install -y -qq --no-install-recommends ca-certificates curl >/dev/null
    install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq && apt-get install -y -qq --no-install-recommends --download-only docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null
    cp /var/cache/apt/archives/*.deb /saida/'
else
  echo "== Imagem da aplicação"; docker save sms-recall:latest | gzip -1 > "$SAIDA/imagens.tar.gz"
fi
tar -cf "$SAIDA.tar" -C "$(dirname "$SAIDA")" "$NOME"
echo
echo "Pronto: $SAIDA.tar ($(du -h "$SAIDA.tar" | cut -f1)), versão $(git log --oneline -1)"
echo "Para entregar no mini PC: node scripts/servir-pacote.mjs $SAIDA.tar   (veja docs/ATUALIZACAO.md)"
