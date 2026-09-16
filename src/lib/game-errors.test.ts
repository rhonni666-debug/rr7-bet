import { describe, expect, it } from 'vitest';
import { roundErrorMessage } from './game-errors';

describe('roundErrorMessage', () => {
  it('traduz saldo insuficiente', () => {
    expect(roundErrorMessage(new Error('INSUFFICIENT_DEMO_CREDITS'))).toBe('Créditos DEMO insuficientes.');
  });

  it('traduz limite de rodadas', () => {
    expect(roundErrorMessage(new Error('RATE_LIMIT'))).toContain('Muitas rodadas');
  });

  it('traduz sessão expirada ou inativa', () => {
    expect(roundErrorMessage(new Error('SESSION_EXPIRED'))).toContain('sessão DEMO expirou');
    expect(roundErrorMessage(new Error('SESSION_NOT_ACTIVE'))).toContain('sessão DEMO expirou');
  });

  it('traduz autenticação expirada', () => {
    expect(roundErrorMessage(new Error('AUTH_REQUIRED'))).toContain('sessão de login expirou');
  });

  it('não expõe erro desconhecido ao usuário', () => {
    expect(roundErrorMessage(new Error('database internals'))).toBe('Não foi possível concluir a rodada DEMO.');
  });
});
