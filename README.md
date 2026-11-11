# Serviço de SMS · MVP

Disparo de SMS **pelos chips de celulares Android** (app [SMS Gateway for Android](https://sms-gate.app)), com planilha, roleta de chips, roleta de mensagens, painel e logs. Node 22+, **sem dependências**.

> A tela só abre em `localhost`. O estado (disparos, mensagens, logs) é gravado em `data/estado.json` e volta depois de um reinício.

## Como rodar no dia a dia

Dê dois cliques em **`iniciar-servico.cmd`** e deixe a janela aberta. Ela sobe o serviço com o **supervisor**:

- se o serviço cair, ele religa sozinho (2 s, 4 s, 8 s… até 30 s) e anota em `data/supervisor.log`;
- se um disparo estava no meio, ele **continua de onde parou**: o que já saiu não é reenviado; a mensagem que estava saindo na hora da queda vira **Incerta** (confira no celular) — nunca um SMS em dobro;
- de 15 em 15 s confere os celulares no ADB e **refaz a porta sozinho** quando o cabo volta (`ADB_PATH` e `ADB_PORTAS` no `.env`, ex.: `ADB_PORTAS="SERIAL1:8080,SERIAL2:8081"`).

Não rode o serviço de dentro de uma conversa do Claude ou de um terminal temporário: quando ele fecha, o serviço cai junto.

## Telas

| Tela | Para quê |
|---|---|
| **Visão geral** `/` | Números de hoje (enviadas, entregues, falhas, taxa), um cartão por chip (operadora, número, bateria, internet, contadores), últimos disparos e eventos |
| **Disparos** `/disparos` | Histórico e **Novo disparo**: planilha `.xlsx`/`.csv` → mensagens da roleta (até 20, digitadas ou importadas de uma planilha de abordagens, com `{nome}`) → intervalo sorteado entre um mínimo e um máximo (padrão 45 a 80 s) → acompanhamento ao vivo, cancelar e exportar o resultado |
| **Envio avulso** `/avulso` | Uma mensagem para um número, pela roleta ou por um chip escolhido |
| **Aparelhos e chips** `/aparelhos` | Saúde de cada celular e os chips que ele informa; teste de conexão (não envia SMS) |
| **Logs** `/logs` | Envios, entregas, falhas, disparos, celulares fora do ar e configuração. Filtro por nível e chip, exportar CSV |
| **Configurações** `/config` | Endereço, usuário e senha do app em cada celular (até 2) |

## Planilha

- Coluna obrigatória: **telefone** (aceita também *celular*, *fone*, *número*, *whatsapp*). Opcionais: **nome** e **mensagem**.
- Sem cabeçalho reconhecido: coluna A = telefone, B = nome, C = mensagem.
- Telefone inválido fica de fora (a tela mostra as linhas); telefone repetido entra uma vez.
- A linha com mensagem própria usa a dela; as outras recebem o próximo texto da roleta.
- Até 500 contatos por disparo. Um disparo por vez. A tela tem **Baixar planilha modelo**.

## Planilha de abordagens (roleta de mensagens)

- Uma mensagem por linha, na coluna **abordagem** (aceita também *mensagem*, *texto*, *modelo*). Sem cabeçalho: coluna A.
- Linha vazia e texto repetido ficam de fora; texto com mais de 640 caracteres também. Até 20 abordagens.
- Importar **substitui** a lista da tela. A tela tem **Baixar modelo de abordagens**.
- Prefira texto **sem acento**: acento muda a codificação e cada SMS passa a ser cobrado como 2.

## Intervalo entre mensagens

- Cada mensagem espera um tempo **sorteado** entre o mínimo e o máximo (padrão 45 a 80 s), para o chip não disparar num ritmo fixo.
- Cancelar não espera o intervalo acabar. Depois de uma queda, a retomada também espera um intervalo antes da primeira mensagem.

## Rodar

```bash
npm run simular   # ensaio: nenhum SMS real sai
npm test          # 32 testes (lib, planilha de abordagens, intervalo sorteado, servidor simulado, dois celulares falsos, queda e retomada, supervisor)
npm run servico   # modo real com supervisor (o mesmo que iniciar-servico.cmd)
npm start         # modo real sem supervisor (só para desenvolver)
```

## Ligar os celulares (pelo cabo USB)

1. No celular: instalar o app, ligar **Local Server**, anotar usuário e senha. Em Xiaomi, liberar as permissões de SMS pelo ADB.
2. No PC: `adb forward tcp:8080 tcp:8080` (celular 1) e `adb -s <serial> forward tcp:8081 tcp:8080` (celular 2).
3. Em **Configurações**: `http://127.0.0.1:8080` e `http://127.0.0.1:8081`, com usuário e senha de cada um. **Testar conexão**.

Se o cabo sair, o redirecionamento cai: o celular sai da roleta, o painel e os logs avisam, e é só refazer o `adb forward`.

## Estrutura

```
src/
  servidor.mjs     rotas das telas e da API, travas de origem
  smsgate.mjs      celulares: chips, saúde, roleta, envio, status
  disparos.mjs     envio avulso, disparo por planilha, cancelamento, painel
  estado.mjs       mensagens em memória, status, log de eventos
  config.mjs       campos da tela de Configurações e gravação do .env
  lib.mjs          telefone, máscara, segmentos, {nome}
  web/paginas.mjs  telas (design system da Recall)
public/
  tokens.css       tokens oficiais do design system
  planilha.js      leitor de .xlsx/.csv no navegador
tests/             node --test
```

## Cuidados

- Telefone sempre mascarado na tela e no log; o texto das mensagens e os nomes nunca vão para o log.
- Outro site aberto no navegador não consegue disparar SMS nem mudar a configuração (Host, Origin e `application/json` conferidos).
- A tela de Configurações recusa quebra de linha e aspas (não deixa injetar variável no `.env`).
- Chip que dispara rápido demais tem mais chance de ser bloqueado pela operadora: use o intervalo sorteado (45 a 80 s).
