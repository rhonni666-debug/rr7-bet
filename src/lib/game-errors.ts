export function roundErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('INSUFFICIENT_DEMO_CREDITS')) return 'Créditos DEMO insuficientes.';
  if (message.includes('RATE_LIMIT')) return 'Muitas rodadas em pouco tempo. Aguarde alguns segundos.';
  if (message.includes('SESSION_EXPIRED') || message.includes('SESSION_NOT_ACTIVE')) return 'A sessão DEMO expirou. Volte ao lobby e abra o jogo novamente.';
  if (message.includes('AUTH_REQUIRED')) return 'Sua sessão de login expirou. Entre novamente.';
  return 'Não foi possível concluir a rodada DEMO.';
}
