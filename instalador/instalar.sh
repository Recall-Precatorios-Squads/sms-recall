#!/bin/bash
# Instala e sobe o sms-recall no Ubuntu (WSL) SEM internet: Docker, imagens e código vêm desta pasta.
# Uso (no terminal do Ubuntu):  bash /mnt/c/sms-recall-instalador/instalar.sh
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
DESTINO="$HOME/sms-recall"
passo() { printf '\n== %s\n' "$*"; }

if [ "$(id -u)" -eq 0 ]; then echo "Rode com o seu usuário, sem sudo (o script pede a senha quando precisa)."; exit 1; fi

passo "1/6 Conferindo o systemd"
if [ "$(ps -p 1 -o comm=)" != "systemd" ]; then
  printf '[boot]\nsystemd=true\n' | sudo tee /etc/wsl.conf >/dev/null
  echo "Ativei o systemd. Agora, no PowerShell, rode:  wsl --shutdown"
  echo "Depois abra o Ubuntu de novo e rode este mesmo comando outra vez."
  exit 0
fi

passo "2/6 Instalando o Docker (sem internet)"
if command -v docker >/dev/null 2>&1; then
  echo "Docker já instalado: $(docker --version)"
else
  lista=()
  for f in "$AQUI"/debs/*.deb; do
    p=$(dpkg-deb -f "$f" Package); v=$(dpkg-deb -f "$f" Version)
    atual=$(dpkg-query -W -f='${Status} ${Version}' "$p" 2>/dev/null || true)
    # Pula o que já está instalado em versão igual ou mais nova.
    if [[ "$atual" == "install ok installed "* ]] && dpkg --compare-versions "${atual##* }" ge "$v"; then continue; fi
    lista+=("$f")
  done
  echo "Instalando ${#lista[@]} pacote(s)..."
  sudo dpkg -i "${lista[@]}" >/dev/null
  sudo systemctl enable --now containerd docker >/dev/null
  sudo usermod -aG docker "$USER"
  echo "Docker instalado: $(docker --version)"
fi

passo "3/6 Carregando as imagens da aplicação (1 a 3 minutos)"
gunzip -c "$AQUI/imagens.tar.gz" | sudo docker load

passo "4/6 Copiando o código para $DESTINO"
tar -xzf "$AQUI/codigo.tar.gz" -C "$HOME"   # mantém .env e backups de uma instalação anterior

passo "5/6 Configuração (.env)"
cd "$DESTINO"
if [ -f .env ]; then
  echo ".env já existe: mantido."
else
  cp .env.example .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 16)|" .env
  sed -i "s|^APP_SECRET=.*|APP_SECRET=$(openssl rand -hex 32)|" .env
  read -r -p "E-mail do administrador: " email
  sed -i "s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=${email}|" .env
  while true; do
    read -r -s -p "Senha do administrador (8+ caracteres, sem |): " senha; echo
    if [ ${#senha} -ge 8 ] && [[ "$senha" != *"|"* ]]; then break; fi
    echo "Senha curta ou com |. Tente de novo."
  done
  sed -i "s|^ADMIN_SENHA=.*|ADMIN_SENHA=${senha}|" .env
  unset senha
  chmod 600 .env
  echo ".env criado. Para alertas no Telegram, depois edite com: nano $DESTINO/.env"
fi

passo "6/6 Subindo"
sudo docker compose up -d --pull never --no-build
porta=$(grep -E '^PORTA=' .env | cut -d= -f2); porta=${porta:-3000}
for i in $(seq 1 30); do
  if curl --noproxy '*' -fs "http://localhost:${porta}/health" >/dev/null 2>&1; then break; fi
  sleep 3
done
sudo docker compose ps --format 'table {{.Service}}\t{{.Status}}'
if curl --noproxy '*' -fs "http://localhost:${porta}/health" >/dev/null 2>&1; then
  echo
  echo "PRONTO. Abra de outro computador da rede:"
  for ip in $(hostname -I); do [[ "$ip" == *.*.*.* ]] && echo "  http://${ip}:${porta}"; done
else
  echo
  echo "A aplicação ainda não respondeu. Veja:  cd $DESTINO && sudo docker compose logs --tail 50"
fi
