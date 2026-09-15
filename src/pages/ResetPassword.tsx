import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';

export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    void navigate({ to: '/perfil' });
  }

  if (loading) return <p className="text-sm text-slate-400">Validando recuperação...</p>;
  if (!user) return <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[.035] p-6 text-center"><h1 className="text-2xl font-black">Link de recuperação inválido ou expirado</h1><Link to="/auth" className="mt-5 inline-flex rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Voltar ao login</Link></div>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[.035] p-6">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Segurança</p>
      <h1 className="mt-1 text-3xl font-black">Nova senha</h1>
      <label className="mt-5 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nova senha</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 outline-none focus:border-amber-300/40" /></label>
      <label className="mt-4 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirmar senha</span><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 outline-none focus:border-amber-300/40" /></label>
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      <button disabled={busy} className="mt-5 w-full rounded-2xl bg-amber-300 py-3.5 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? 'Salvando...' : 'Atualizar senha'}</button>
    </form>
  );
}
