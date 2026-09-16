import { describe, expect, it } from 'vitest';
import { validatePassword } from './password';

describe('validatePassword', () => {
  it('rejeita senha curta', () => {
    expect(validatePassword('Abc123')).toBe('Use pelo menos 10 caracteres.');
  });

  it('exige letra e número', () => {
    expect(validatePassword('abcdefghij')).toBe('Use pelo menos uma letra e um número.');
    expect(validatePassword('1234567890')).toBe('Use pelo menos uma letra e um número.');
  });

  it('aceita senha que cumpre a política', () => {
    expect(validatePassword('rr7Seguro2026')).toBeNull();
  });
});
