// Log estruturado (uma linha JSON). Nunca registrar telefone completo, texto de mensagem nem senha.
export function log(evento: string, dados: Record<string, unknown> = {}, nivel: "info" | "error" = "info") {
  const linha = JSON.stringify({ em: new Date().toISOString(), nivel, evento, ...dados });
  if (nivel === 'error') console.error(linha);
  else console.log(linha);
}
