export function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Use pelo menos 10 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use pelo menos uma letra e um número.';
  return null;
}
