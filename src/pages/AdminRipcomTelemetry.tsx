import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Clock3, Gauge, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';

type OperatorRow = {
  id: string;
  code: string;
  name: string;
  environment: string;
  status: string;
};

type RequestRow = {
  id: string;
  operator_id: string;
  request_id: string;
  method: string;
  path: string;
  response_status: number | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
};

type SessionRow = {
  id: string;
  operator_id: string;
  status: string;
  created_at: string;
};

type RoundRow = {
  id: string;
  session_id: string;
  bet: number;
  win: number;
  multiplier: number;
  created_at: string;
};

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(ordered.length * ratio) - 1));
  return ordered[index] ?? 0;
}

function durationLabel(value: number) {
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

export function AdminRipcomTelemetryPage() {
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const operatorsQuery = useQuery({
    queryKey: ['ripcom-telemetry-operators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_operators')
        .select('id,code,name,environment,status')
        .order('name');
      if (error) throw error;
      return (data ?? []) as OperatorRow[];
    },
  });

  const requestsQuery = useQuery({
    queryKey: ['ripcom-api-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_api_requests')
        .select('id,operator_id,request_id,method,path,response_status,duration_ms,created_at,completed_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        response_status: row.response_status == null ? null : Number(row.response_status),
        duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
      })) as RequestRow[];
    },
    refetchInterval: 15_000,
  });

  const sessionsQuery = useQuery({
    queryKey: ['ripcom-telemetry-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_b2b_sessions')
        .select('id,operator_id,status,created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
    refetchInterval: 20_000,
  });

  const roundsQuery = useQuery({
    queryKey: ['ripcom-telemetry-rounds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_b2b_rounds')
        .select('id,session_id,bet,win,multiplier,created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, bet: Number(row.bet), win: Number(row.win), multiplier: Number(row.multiplier) })) as RoundRow[];
    },
    refetchInterval: 20_000,
  });

  const operatorMap = useMemo(() => new Map((operatorsQuery.data ?? []).map((operator) => [operator.id, operator])), [operatorsQuery.data]);
  const sessionMap = useMemo(() => new Map((sessionsQuery.data ?? []).map((session) => [session.id, session])), [sessionsQuery.data]);

  const filteredRequests = useMemo(() => (requestsQuery.data ?? []).filter((row) => {
    if (operatorFilter !== 'all' && row.operator_id !== operatorFilter) return false;
    if (statusFilter === 'success' && (row.response_status == null || row.response_status >= 400)) return false;
    if (statusFilter === 'error' && (row.response_status == null || row.response_status < 400)) return false;
    if (statusFilter === 'pending' && row.response_status != null) return false;
    return true;
  }), [requestsQuery.data, operatorFilter, statusFilter]);

  const scopedSessions = useMemo(() => (sessionsQuery.data ?? []).filter((row) => operatorFilter === 'all' || row.operator_id === operatorFilter), [sessionsQuery.data, operatorFilter]);
  const scopedSessionIds = useMemo(() => new Set(scopedSessions.map((row) => row.id)), [scopedSessions]);
  const scopedRounds = useMemo(() => (roundsQuery.data ?? []).filter((row) => scopedSessionIds.has(row.session_id)), [roundsQuery.data, scopedSessionIds]);

  const completed = filteredRequests.filter((row) => row.response_status != null);
  const failures = completed.filter((row) => Number(row.response_status) >= 400);
  const durations = completed.map((row) => Number(row.duration_ms)).filter((value) => Number.isFinite(value) && value >= 0);
  const avgDuration = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
  const p95 = percentile(durations, 0.95);
  const errorRate = completed.length ? (failures.length / completed.length) * 100 : 0;
  const activeSessions = scopedSessions.filter((row) => row.status === 'ACTIVE').length;
  const totalBet = scopedRounds.reduce((sum, row) => sum + row.bet, 0);
  const totalWin = scopedRounds.reduce((sum, row) => sum + row.win, 0);

  async function refreshAll() {
    await Promise.all([
      operatorsQuery.refetch(),
      requestsQuery.refetch(),
      sessionsQuery.refetch(),
      roundsQuery.refetch(),
    ]);
  }

  return (
    <AdminGate>
      <AdminShell>
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-300"><Activity className="h-4 w-4" /> RIPCOM • Telemetria</div>
                <h1 className="mt-2 text-3xl font-black">Saúde da API B2B</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">Monitore chamadas assinadas, erros, latência, sessões e atividade DEMO por operador.</p>
              </div>
              <button onClick={() => void refreshAll()} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black hover:bg-white/5"><RefreshCw className="mr-2 inline h-4 w-4" />Atualizar</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl bg-black/20 p-4"><Server className="h-5 w-5 text-cyan-300" /><p className="mt-2 text-xs uppercase text-slate-500">Requests</p><p className="font-black">{filteredRequests.length}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><Clock3 className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs uppercase text-slate-500">Latência média</p><p className="font-black">{durationLabel(avgDuration)}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><Gauge className="h-5 w-5 text-violet-300" /><p className="mt-2 text-xs uppercase text-slate-500">P95</p><p className="font-black">{durationLabel(p95)}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><AlertTriangle className="h-5 w-5 text-rose-300" /><p className="mt-2 text-xs uppercase text-slate-500">Erros</p><p className="font-black">{errorRate.toFixed(1)}%</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-2 text-xs uppercase text-slate-500">Sessões ativas</p><p className="font-black">{activeSessions}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><Activity className="h-5 w-5 text-fuchsia-300" /><p className="mt-2 text-xs uppercase text-slate-500">Rounds DEMO</p><p className="font-black">{scopedRounds.length}</p></div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select value={operatorFilter} onChange={(event) => setOperatorFilter(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white">
                <option value="all">Todos os operadores</option>
                {(operatorsQuery.data ?? []).map((operator) => <option key={operator.id} value={operator.id}>{operator.name} ({operator.code})</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white">
                <option value="all">Todos os status HTTP</option>
                <option value="success">Sucesso</option>
                <option value="error">Erro</option>
                <option value="pending">Em processamento</option>
              </select>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
              <h2 className="text-xl font-black">Atividade DEMO</h2>
              <p className="mt-1 text-sm text-slate-500">Valores são créditos virtuais do sandbox, não dinheiro real.</p>
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Apostas DEMO</p><p className="mt-1 text-xl font-black text-amber-300">{totalBet.toLocaleString('pt-BR')}</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Prêmios DEMO</p><p className="mt-1 text-xl font-black text-emerald-300">{totalWin.toLocaleString('pt-BR')}</p></div></div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
              <h2 className="text-xl font-black">Status do recorte</h2>
              <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between rounded-xl bg-black/20 px-4 py-3"><span className="text-slate-500">Requests concluídos</span><b>{completed.length}</b></div><div className="flex justify-between rounded-xl bg-black/20 px-4 py-3"><span className="text-slate-500">Falhas HTTP</span><b className="text-rose-300">{failures.length}</b></div><div className="flex justify-between rounded-xl bg-black/20 px-4 py-3"><span className="text-slate-500">Sessões totais</span><b>{scopedSessions.length}</b></div></div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div><h2 className="text-xl font-black">Requests assinados recentes</h2><p className="mt-1 text-sm text-slate-500">Auditoria persistente do gateway `/v1`.</p></div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Horário</th><th className="px-4 py-3">Operador</th><th className="px-4 py-3">Método</th><th className="px-4 py-3">Rota</th><th className="px-4 py-3">HTTP</th><th className="px-4 py-3">Duração</th><th className="px-4 py-3">Request ID</th></tr></thead>
                <tbody>{filteredRequests.slice(0, 100).map((row) => { const operator = operatorMap.get(row.operator_id); const failed = row.response_status != null && row.response_status >= 400; return <tr key={row.id} className="border-t border-white/5"><td className="px-4 py-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="px-4 py-3"><b>{operator?.name ?? '—'}</b><p className="font-mono text-[10px] text-slate-600">{operator?.code ?? row.operator_id.slice(0, 8)}</p></td><td className="px-4 py-3 font-black">{row.method}</td><td className="px-4 py-3 font-mono text-xs text-slate-300">{row.path}</td><td className={`px-4 py-3 font-black ${row.response_status == null ? 'text-amber-300' : failed ? 'text-rose-300' : 'text-emerald-300'}`}>{row.response_status ?? 'PENDING'}</td><td className="px-4 py-3 text-xs text-slate-400">{row.duration_ms == null ? '—' : durationLabel(row.duration_ms)}</td><td className="max-w-48 truncate px-4 py-3 font-mono text-[10px] text-slate-600">{row.request_id}</td></tr>; })}</tbody>
              </table>
              {!requestsQuery.isLoading && !filteredRequests.length && <p className="p-6 text-center text-sm text-slate-500">Ainda não há requests B2B neste filtro.</p>}
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
