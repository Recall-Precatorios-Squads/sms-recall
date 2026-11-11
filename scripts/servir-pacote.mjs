// Entrega UM arquivo (o pacote .tar) na rede interna, porta 8000, para o mini PC baixar sem passar pelo proxy.
// Uso (no PC de desenvolvimento, terminal comum):  node scripts/servir-pacote.mjs ../sms-recall-atualizacao.tar
// Qualquer outro endereço responde 404. Feche com Ctrl+C assim que o download terminar.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { basename, resolve } from 'node:path';

const arquivo = resolve(process.argv[2] ?? '');
if (!process.argv[2]) {
  console.error('Uso: node scripts/servir-pacote.mjs <arquivo.tar>');
  process.exit(1);
}
const nome = basename(arquivo);
const tamanho = statSync(arquivo).size;
const porta = Number(process.env.PORTA_PACOTE ?? 8000);

createServer((req, res) => {
  console.log(new Date().toLocaleTimeString('pt-BR'), req.socket.remoteAddress, req.method, req.url);
  if (req.url !== `/${nome}`) {
    res.statusCode = 404;
    return res.end('nada aqui');
  }
  res.writeHead(200, { 'Content-Type': 'application/x-tar', 'Content-Length': tamanho, 'Content-Disposition': `attachment; filename="${nome}"` });
  createReadStream(arquivo).pipe(res);
}).listen(porta, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`Servindo ${nome} (${(tamanho / 1048576).toFixed(0)} MB). No Ubuntu do mini PC:`);
  for (const ip of ips) console.log(`  curl --noproxy '*' -o ~/${nome} http://${ip}:${porta}/${nome}`);
});
