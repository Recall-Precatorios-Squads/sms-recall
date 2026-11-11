// Receptor de TESTE dos avisos (webhook) da API /v1: mostra cada aviso e confere a assinatura.
// Uso (no PC que vai receber, terminal comum):
//   set SMS_API_KEY=sms_...        (cmd)   ou   $env:SMS_API_KEY="sms_..."   (PowerShell)
//   node scripts/receber-webhook.mjs
// Depois, na tela Times (API), cadastre no time a URL que ele mostrar (http://<ip-deste-pc>:8090/webhook).
// É só para teste: em produção quem recebe é o sistema do time (ex.: o CRM), com a mesma conferência de assinatura.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';

const chave = process.env.SMS_API_KEY ?? '';
const porta = Number(process.env.PORTA_WEBHOOK ?? 8090);
if (!chave.startsWith('sms_')) console.warn('Aviso: SMS_API_KEY não definida; a assinatura não será conferida.');
const chaveHmac = createHash('sha256').update(chave).digest('hex');
const vistos = new Set();

function assinaturaOk(corpo, recebida) {
  if (!chave || !recebida) return false;
  const esperada = createHmac('sha256', chaveHmac).update(corpo).digest('hex');
  return esperada.length === recebida.length && timingSafeEqual(Buffer.from(esperada), Buffer.from(recebida));
}

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.statusCode = 404;
    return res.end();
  }
  let corpo = '';
  req.on('data', (d) => (corpo += d));
  req.on('end', () => {
    const ok = assinaturaOk(corpo, req.headers['x-sms-assinatura']);
    let aviso = {};
    try {
      aviso = JSON.parse(corpo);
    } catch {}
    const repetido = vistos.has(aviso.avisoId);
    vistos.add(aviso.avisoId);
    console.log(
      `${new Date().toLocaleTimeString('pt-BR')}  mensagem ${aviso.id}  ${aviso.status} (${aviso.rotulo})` +
        `  chave=${aviso.chaveIdempotencia ?? '-'}  assinatura=${ok ? 'OK' : 'INVÁLIDA'}${repetido ? '  (repetido, ignorado)' : ''}`,
    );
    // 2xx confirma o recebimento; assinatura inválida → 401 (4xx: o serviço não repete)
    res.statusCode = ok || !chave ? 204 : 401;
    res.end();
  });
}).listen(porta, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('Recebendo avisos. Cadastre no time (tela Times (API) → Editar → Webhook) uma destas URLs:');
  for (const ip of ips) console.log(`  http://${ip}:${porta}/webhook`);
});
