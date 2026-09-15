import { CircleUserRound, Database, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AuthGateCard } from '../components/AuthGateCard';
import { Brand } from '../components/Brand';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../lib/auth';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('display_name,avatar_url,role,created_at').eq('id', user.id).single();
      if (error) throw error;
      return data;
    },
  });

  if (!user) return <AuthGateCard title="Seu perfil RR7.BET" description="Entre para manter seus favoritos, histórico e carteira DEMO sincronizados com segurança." />;

  const displayName = profileQuery.data?.display_name || user.user_metadata.display_name || user.email?.split('@')[0] || 'Jogador';
  const initial = displayName.slice(0, 1).toUpperCase();

  async function exit() {
    await signOut();
    void navigate({ to: '/' });
  }

  return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Conta</p><h1 className="mt-1 text-3xl font-black">Perfil</h1></header><section className="flex items-center gap-4 rounded-3xl border border-white/8 bg-white/[.035] p-5"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-2xl font-black text-slate-950">{initial || <CircleUserRound className="h-8 w-8" />}</div><div className="min-w-0"><Brand compact /><p className="mt-2 truncate text-base font-black">{displayName}</p><p className="truncate text-sm text-slate-400">{user.email}</p></div></section><section className="grid gap-3 sm:grid-cols-2"><Info icon={ShieldCheck} title="Perfil" value={profileQuery.data?.role ?? 'PLAYER'} /><Info icon={Database} title="Persistência" value="Supabase + RLS" /></section><div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm leading-6 text-slate-300">Favoritos, recentes, rodadas DEMO e transações agora ficam vinculados ao seu usuário no PostgreSQL. O acesso é isolado por políticas RLS.</div><button onClick={() => void exit()} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-200"><LogOut className="h-4 w-4" /> Sair da conta</button></div>;
}

function Info({ icon: Icon, title, value }: { icon: typeof ShieldCheck; title: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4"><Icon className="h-5 w-5 text-amber-300" /><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-1 text-sm font-black">{value}</p></div></div>;
}
