import { useQuery } from '@tanstack/react-query';
import { Activity, CircleDollarSign, Gamepad2 } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';

type Section = 'sessions' | 'transactions';

export function AdminOperationsPage({ section }: { section: Section }) {
  return <AdminGate><AdminShell>{section === 'sessions' ? <Sessions /> : <Transactions />}</AdminShell></AdminGate>;
}

function Sessions() {
  const query = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_sessions').select('id,user_id,status,started_at,ended_at,expires_at,metadata,games(name),providers(name)').order('started_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  return <div className="space-y-5"><Header icon={<Gamepad2 />} title="Sessões" description="Acompanhe sessões DEMO abertas, finalizadas e expiradas." /><div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[.025]"><div className="grid grid-cols-[1.2fr_.8fr_.8fr] gap-3 border-b border-white/8 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 md:grid-cols-[1.2fr_1fr_.8fr_1fr]"><span>Jogo</span><span>Usuário</span><span>Status</span><span className="hidden md:block">Início</span></div>{query.isLoading ? <p className="p-5 text-sm text-slate-500">Carregando...</p> : query.isError ? <p className="p-5 text-sm text-rose-300">Falha ao carregar sessões.</p> : (query.data ?? []).map((row) => { const game = relation(row.games); return <div key={row.id} className="grid grid-cols-[1.2fr_.8fr_.8fr] gap-3 border-b border-white/5 px-4 py-4 text-sm last:border-0 md:grid-cols-[1.2fr_1fr_.8fr_1fr]"><div><p className="font-black">{game?.name ?? 'Jogo'}</p><p className="mt-1 text-[10px] text-slate-600">{row.id.slice(0, 8)}</p></div><span className="truncate text-xs text-slate-400">{String(row.user_id).slice(0, 8)}</span><span className={row.status === 'ACTIVE' ? 'font-black text-emerald-300' : 'font-bold text-slate-400'}>{row.status}</span><span className="hidden text-xs text-slate-500 md:block">{new Date(row.started_at).toLocaleString('pt-BR')}</span></div>; })}</div></div>;
}

function Transactions() {
  const query = useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('wallet_transactions').select('id,user_id,type,amount,description,reference_type,reference_id,created_at').order('created_at', { ascending: false }).limit(150);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  return <div className="space-y-5"><Header icon={<CircleDollarSign />} title="Transações DEMO" description="Ledger imutável de créditos fictícios. Nenhuma transação representa dinheiro real." /><div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[.025]">{query.isLoading ? <p className="p-5 text-sm text-slate-500">Carregando...</p> : query.isError ? <p className="p-5 text-sm text-rose-300">Falha ao carregar transações.</p> : (query.data ?? []).map((row) => { const amount = Number(row.amount); return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-4 last:border-0"><div><div className="flex items-center gap-2"><span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-slate-400">{row.type}</span><p className="text-sm font-black">{row.description}</p></div><p className="mt-1 text-[10px] text-slate-600">Usuário {String(row.user_id).slice(0, 8)} • {new Date(row.created_at).toLocaleString('pt-BR')}</p></div><p className={`text-base font-black ${amount > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{amount > 0 ? '+' : ''}{amount.toLocaleString('pt-BR')}</p></div>; })}</div></div>;
}

function Header({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <header><div className="flex items-center gap-2 text-amber-300">{icon}<p className="text-xs font-bold uppercase tracking-[.16em]">Operação</p></div><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 text-sm text-slate-400">{description}</p><div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1 text-[10px] font-black uppercase text-emerald-300"><Activity className="h-3 w-3" /> Atualização automática</div></header>;
}

function relation(value: unknown): { name?: string } | null {
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined) ?? null;
  if (value && typeof value === 'object') return value as { name?: string };
  return null;
}
