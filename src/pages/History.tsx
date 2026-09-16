import { useQuery } from '@tanstack/react-query';
import { Clock3, Gamepad2, ReceiptText } from 'lucide-react';
import { AuthGateCard } from '../components/AuthGateCard';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../lib/auth';

export function HistoryPage() {
  const { user } = useAuth();
  const history = useQuery({
    queryKey: ['history', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [sessions, rounds] = await Promise.all([
        supabase.from('game_sessions').select('id,status,started_at,ended_at,expires_at,games(name,slug),providers(name)').eq('user_id', user!.id).order('started_at', { ascending: false }).limit(30),
        supabase.from('demo_rounds').select('id,session_id,bet_amount,win_amount,result,multiplier,created_at,games(name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
      ]);
      if (sessions.error) throw sessions.error;
      if (rounds.error) throw rounds.error;
      return { sessions: sessions.data ?? [], rounds: rounds.data ?? [] };
    },
  });

  if (!user) return <AuthGateCard title="Histórico RR7.BET" description="Entre para consultar suas sessões e rodadas demonstrativas." />;

  const sessions = history.data?.sessions ?? [];
  const rounds = history.data?.rounds ?? [];

  return <div className="space-y-8"><header><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Atividade DEMO</p><h1 className="mt-1 text-3xl font-black">Histórico</h1><p className="mt-2 text-sm text-slate-400">Sessões, rodadas e resultados persistidos no Supabase.</p></header>{history.isLoading ? <div className="rounded-2xl border border-white/8 p-8 text-sm text-slate-500">Carregando histórico...</div> : history.isError ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-sm text-rose-200">Não foi possível carregar o histórico.</div> : <><section><div className="mb-3 flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-amber-300" /><h2 className="text-xl font-black">Sessões de jogo</h2></div><div className="space-y-2">{sessions.length ? sessions.map((row) => { const game = relation(row.games); const provider = relation(row.providers); return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4"><div><p className="font-black">{game?.name ?? 'Jogo DEMO'}</p><p className="mt-1 text-xs text-slate-500">{provider?.name ?? 'Mock Provider'} • {new Date(row.started_at).toLocaleString('pt-BR')}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${row.status === 'ACTIVE' ? 'bg-emerald-300/10 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>{row.status}</span></div>; }) : <Empty text="Nenhuma sessão registrada ainda." />}</div></section><section><div className="mb-3 flex items-center gap-2"><ReceiptText className="h-5 w-5 text-amber-300" /><h2 className="text-xl font-black">Rodadas</h2></div><div className="space-y-2">{rounds.length ? rounds.map((row) => { const game = relation(row.games); const win = Number(row.win_amount); return <div key={row.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4"><div><p className="font-black">{game?.name ?? 'Jogo DEMO'}</p><p className="mt-1 text-xs text-slate-500">Aposta {Number(row.bet_amount).toLocaleString('pt-BR')} • {Number(row.multiplier).toLocaleString('pt-BR')}x • {new Date(row.created_at).toLocaleString('pt-BR')}</p></div><div className="text-right"><p className={`text-sm font-black ${win > 0 ? 'text-emerald-300' : 'text-slate-400'}`}>{win > 0 ? `+${win.toLocaleString('pt-BR')}` : '0'}</p><p className="mt-1 text-[10px] font-black uppercase text-slate-500">{row.result}</p></div></div>; }) : <Empty text="Nenhuma rodada registrada ainda." />}</div></section></>}</div>;
}

function relation(value: unknown): { name?: string; slug?: string } | null {
  if (Array.isArray(value)) return (value[0] as { name?: string; slug?: string } | undefined) ?? null;
  if (value && typeof value === 'object') return value as { name?: string; slug?: string };
  return null;
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500"><Clock3 className="h-4 w-4" />{text}</div>;
}
