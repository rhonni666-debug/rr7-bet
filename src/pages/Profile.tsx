import { CircleUserRound, Clock3, Database, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AuthGateCard } from '../components/AuthGateCard';
import { Brand } from '../components/Brand';
import { useAuth } from '../lib/auth';

export function ProfilePage() {
  const { user, profile, isAdmin, profileLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return <AuthGateCard title="Seu perfil RR7.BET" description="Entre para manter seus favoritos, histórico e carteira DEMO sincronizados com segurança." />;

  const displayName = profile?.displayName || user.user_metadata.display_name || user.email?.split('@')[0] || 'Jogador';
  const initial = displayName.slice(0, 1).toUpperCase();

  async function exit() {
    await signOut();
    void navigate({ to: '/' });
  }

  return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Conta</p><h1 className="mt-1 text-3xl font-black">Perfil</h1></header><section className="flex items-center gap-4 rounded-3xl border border-white/8 bg-white/[.035] p-5"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-2xl font-black text-slate-950">{initial || <CircleUserRound className="h-8 w-8" />}</div><div className="min-w-0"><Brand compact /><p className="mt-2 truncate text-base font-black">{displayName}</p><p className="truncate text-sm text-slate-400">{user.email}</p></div></section><section className="grid gap-3 sm:grid-cols-2"><Info icon={ShieldCheck} title="Perfil" value={profileLoading ? 'CARREGANDO' : profile?.role ?? 'PLAYER'} /><Info icon={Database} title="Persistência" value="Supabase + RLS" /></section><Link to="/historico" className="flex items-center justify-between rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-cyan-50"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-cyan-300" /><div><p className="text-sm font-black">Histórico DEMO</p><p className="text-xs text-cyan-100/50">Sessões e rodadas persistidas</p></div></div><span className="text-sm font-black">Abrir →</span></Link>{isAdmin && <Link to="/admin" className="flex items-center justify-between rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100"><div className="flex items-center gap-3"><Settings className="h-5 w-5 text-amber-300" /><div><p className="text-sm font-black">Painel administrativo</p><p className="text-xs text-amber-100/60">Catálogo, usuários, sessões, transações e auditoria</p></div></div><span className="text-sm font-black">Abrir →</span></Link>}<div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm leading-6 text-slate-300">Favoritos, recentes, sessões, rodadas DEMO e transações ficam vinculados ao seu usuário no PostgreSQL. O acesso é isolado por políticas RLS.</div><button onClick={() => void exit()} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-200"><LogOut className="h-4 w-4" /> Sair da conta</button></div>;
}

function Info({ icon: Icon, title, value }: { icon: typeof ShieldCheck; title: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4"><Icon className="h-5 w-5 text-amber-300" /><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-1 text-sm font-black">{value}</p></div></div>;
}
