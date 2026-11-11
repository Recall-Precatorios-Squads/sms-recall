# Atualizar e operar o sms-recall no mini PC

O mini PC (`RECALL-0169`, IP `192.168.172.214`) roda o sistema dentro do **Ubuntu (WSL)** do Windows, com Docker.
Ele fica atrás do **proxy da empresa**, que bloqueia downloads `https` (erro **407**): por isso a atualização
**não é baixada da internet no mini PC**. Ela é gerada no PC de desenvolvimento e copiada pela rede interna.

```
PC de desenvolvimento (internet)                         Mini PC (sem internet, atrás do proxy)
1. bash scripts/gerar-pacote.sh   → .tar  ──rede──►  3. curl --noproxy (baixa o .tar)
2. node scripts/servir-pacote.mjs (porta 8000)        4. instalar.sh (carrega a imagem e sobe)
```

Acesso: **`http://RECALL-0169:3000`** · documentação da API: **`http://RECALL-0169:3000/v1/docs`**.

## Atualizar para uma versão nova

### No PC de desenvolvimento

1. Código commitado e testes verdes: rode `npm run typecheck` e `npm test` no terminal de desenvolvimento.
2. No **Ubuntu (WSL)**, na raiz do repositório:
   ```bash
   bash scripts/gerar-pacote.sh
   ```
   Gera `../sms-recall-atualizacao.tar` (~170 MB: a imagem da aplicação + o código + o instalador).
3. Num **terminal comum do Windows** (PowerShell ou cmd), na raiz do repositório:
   ```
   node scripts/servir-pacote.mjs ..\sms-recall-atualizacao.tar
   ```
   Ele mostra o comando de download pronto, com o IP deste PC. Se o Windows perguntar sobre o firewall, permita em **rede privada**.

### No mini PC (Ubuntu)

Cole **um comando por vez** (colar vários juntos durante um download mistura as linhas):

```bash
cd ~
curl --noproxy '*' -o sms-recall-atualizacao.tar http://<IP-DO-PC-DE-DESENVOLVIMENTO>:8000/sms-recall-atualizacao.tar
tar -xf sms-recall-atualizacao.tar
bash ~/sms-recall-atualizacao/instalar.sh
```

- O instalador **mantém o `.env` e os dados** (não pergunta e-mail/senha de novo), carrega a imagem nova, aplica as
  migrações do banco sozinho (serviço `migrate`) e recria o app e o worker.
- No fim aparece `PRONTO` e o endereço.

Depois:
```bash
rm -rf ~/sms-recall-atualizacao ~/sms-recall-atualizacao.tar
```
e, no PC de desenvolvimento, feche o `servir-pacote` com **Ctrl+C**.

### Conferir

```bash
cd ~/sms-recall && sudo docker compose ps --format 'table {{.Service}}\t{{.Status}}'
curl --noproxy '*' http://localhost:3000/health; echo
```
Esperado: `traefik`, `postgres` e os dois `app` **healthy**, `worker` e `backup` **Up**, e `{"ok":true,"worker":{"vivo":true,...}}`.
Depois abra `http://RECALL-0169:3000` de outro computador.

## O mini PC não pode dormir (obrigatório)

O padrão de energia do Windows suspende a máquina quando ninguém mexe: aí a rede, o Ubuntu, o Docker e o envio param
(no navegador aparece "demorou muito para responder" ou `DNS_PROBE_FINISHED_NXDOMAIN`). No PowerShell **como administrador**:

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /hibernate off
powercfg /change monitor-timeout-ac 10
Get-NetAdapter -Physical | ForEach-Object { Disable-NetAdapterPowerManagement -Name $_.Name -NoRestart -ErrorAction SilentlyContinue }
```

Pedidos à TI: **reserva de IP fixo** para o mini PC (`192.168.172.214`) e, se a política de energia da empresa (GPO)
reativar a suspensão, uma **exceção** para esta máquina. Prefira o endereço por IP (`http://192.168.172.214:3000`):
ele não depende do DNS.

## Depois de reiniciar o mini PC ou rodar `wsl --shutdown`

A tarefa agendada **"sms-recall (WSL)"** liga o Ubuntu **quando o usuário entra no Windows** (a política da empresa
não deixa rodar sem login). Junto com o Ubuntu sobem o Docker e a aplicação (`restart: unless-stopped`).

- Reiniciou o mini PC: basta **entrar no Windows** com o usuário do Flávio. Nada mais.
- Rodou `wsl --shutdown` (ou o Ubuntu foi desligado): no PowerShell do mini PC,
  ```powershell
  Start-ScheduledTask -TaskName "sms-recall (WSL)"
  Start-Sleep 30
  wsl -l -v          # Ubuntu-24.04 precisa estar Running
  ```

Para voltar sozinho até depois de queda de energia, sem ninguém entrar: a TI liga o **login automático** do Windows no mini PC
(e a BIOS em "ligar ao voltar a energia").

## Quando algo não funciona

| Sintoma | Causa | O que fazer |
|---|---|---|
| `curl: (22) ... error: 407` no Ubuntu | Proxy da empresa pedindo login | Não baixe da internet: use o pacote (este guia). Para a rede interna use sempre `--noproxy '*'` |
| `curl localhost:3000` não responde no Ubuntu | O `curl` mandou o `localhost` para o proxy | `curl --noproxy '*' http://localhost:3000/health` |
| `404 page not found` | O Traefik subiu, mas o app ainda não está saudável | Espere 30 s; confira `docker compose ps` |
| Navegador de outro PC: "demorou muito para responder" ou `DNS_PROBE_FINISHED_NXDOMAIN` | Mini PC suspenso (dormindo) ou Ubuntu desligado | Acorde o mini PC, aplique "O mini PC não pode dormir" e rode `Start-ScheduledTask` |
| Abre no mini PC por `localhost` mas não pelo nome no próprio mini PC | Rede espelhada do WSL | Use `http://localhost:3000` no mini PC |
| Outro PC com proxy não abre | O navegador manda o endereço interno para o proxy | Exceção no proxy: `recall-0169;192.168.*` (melhor: a TI coloca para todos) |
| `Permission denied` ao baixar em `/mnt/c/...` | Pasta do Windows sem permissão de escrita | Baixe em `~` (pasta do Ubuntu), como neste guia |
| Celular "não respondeu" na tela | Celular fora da Wi-Fi, app fechado ou IP mudou | Confira o app (Local Server ligado), a Wi-Fi e o IP; `curl --noproxy '*' http://<ip-do-celular>:8080/health` no Ubuntu deve dar 200 ou 401 |
| Erro ao subir depois de atualizar | Ver o log | `cd ~/sms-recall && sudo docker compose logs --tail 50 app worker migrate` |

## Instalação do zero (outro mini PC)

1. No PC de desenvolvimento: `bash scripts/gerar-pacote.sh --completo` (inclui Postgres, Traefik e o Docker em `.deb`).
2. No mini PC: Windows com WSL e `Ubuntu-24.04` instalado; baixe o pacote como acima e rode:
   - PowerShell **como administrador**: `powershell -ExecutionPolicy Bypass -File \\wsl$\Ubuntu-24.04\home\<usuario>\sms-recall-instalador\windows.ps1`
     (rede espelhada, porta 3000 no firewall, tarefa ao fazer logon) e depois `wsl --shutdown`;
   - Ubuntu: `bash ~/sms-recall-instalador/instalar.sh` (instala o Docker sem internet, pergunta o e-mail e a senha do administrador e sobe tudo).
3. Se o `apt` do Ubuntu funcionar pelo proxy, o Docker também pode vir de lá: `sudo apt-get install -y docker.io docker-compose-v2`.
