import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Brand } from '../components/Brand';
import { useAuth } from '../lib/auth';

type Mode = 'entrar' | 'cadastro' | 'recuperar';

export function AuthPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user && mode !== 'recuperar') void navigate({ to: '/' });
  }, [loading, mode, navigate, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!email.trim()) return setError('Informe o e-mail.');
    if (mode === 'cadastro' && !name.trim()) return setError('Informe seu nome.');
    if (mode !== 'recuperar' && password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (mode === 'cadastro' && password !== confirm) return setError('As senhas não conferem.');

    setBusy(true);
    const result = mode === 'recuperar'
      ? await resetPassword(email.trim())
      : mode === 'cadastro'
        ? await signUp(name, email.trim(), password)
        : await signIn(email.trim(), password);
    setBusy(false);

    if (!result.ok) return setError(result.message);
    setMessage(result.message);
    if (mode === 'recuperar' || mode === 'cadastro') setMode('entrar');
    if (mode === 'entrar') void navigate({ to: '/' });
  }

  const title = mode === 'cadastro' ? 'Criar conta' : mode === 'recuperar' ? 'Recuperar senha' : 'Entrar';

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
      <form onSubmit={submit} className="w-full rounded-3xl border border-white/10 bg-white/[.035] p-6 shadow-2xl shadow-black/20">
        <Brand />
        <p className="mt-3 text-xs font-bold uppercase tracking-[.16em] text-amber-300">Conta DEMO</p>
        <h1 className="mt-1 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">A conta libera favoritos, histórico e a carteira de créditos sem valor monetário.</p>

        {mode === 'cadastro' && <Field label="Nome" value={name} onChange={setName} autoComplete="name" />}
        <Field label="E-mail" value={email} onChange={setEmail} type="email" autoComplete="email" />
        {mode !== 'recuperar' && <Field label="Senha" value={password} onChange={setPassword} type="password" autoComplete={mode === 'cadastro' ? 'new-password' : 'current-password'} />}
        {mode === 'cadastro' && <Field label="Confirmar senha" value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />}

        {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {message && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

        <button disabled={busy} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 disabled:opacity-60">
          {busy ? 'Aguarde...' : title}
        </button>

        <div className="mt-5 flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
          <button type="button" onClick={() => setMode(mode === 'cadastro' ? 'entrar' : 'cadastro')} className="hover:text-white">
            {mode === 'cadastro' ? 'Já tenho conta' : 'Criar conta'}
          </button>
          <button type="button" onClick={() => setMode(mode === 'recuperar' ? 'entrar' : 'recuperar')} className="hover:text-white">
            {mode === 'recuperar' ? 'Voltar' : 'Esqueci a senha'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        value={value}
        type={type}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 text-sm outline-none transition focus:border-amber-300/40"
      />
    </label>
  );
}
