import type { ReactNode } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return <div className="mx-auto max-w-xl rounded-3xl border border-white/8 bg-white/[.035] p-8 text-center text-sm text-slate-400">Validando acesso administrativo...</div>;
  }

  if (!user) {
    return <div className="mx-auto max-w-xl rounded-3xl border border-amber-300/15 bg-white/[.035] p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-amber-300" /><h1 className="mt-4 text-2xl font-black">Área administrativa</h1><p className="mt-2 text-sm text-slate-400">Entre com uma conta autorizada para acessar o painel.</p><Link to="/auth" className="mt-5 inline-flex rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Entrar</Link></div>;
  }

  if (!isAdmin) {
    return <div className="mx-auto max-w-xl rounded-3xl border border-rose-400/20 bg-rose-400/5 p-8 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-rose-300" /><h1 className="mt-4 text-2xl font-black">Acesso restrito</h1><p className="mt-2 text-sm text-slate-400">Sua conta está autenticada, mas não possui o papel ADMIN.</p><Link to="/perfil" className="mt-5 inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-white">Voltar ao perfil</Link></div>;
  }

  return children;
}
