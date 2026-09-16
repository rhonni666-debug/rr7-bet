import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';

type PocMetric = {
  id: string;
  created_at: string;
  aggregator: string;
  operation: string;
  provider_code: string | null;
  game_code: string | null;
  device_type: string | null;
  success: boolean;
  latency_ms: number | string | null;
  error_code: string | null;
  environment: string;
  country: string | null;
};

type Summary = {
  key: string;
  aggregator: string;
  operation: string;
  provider: string;
  total: number;
  successRate: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
};

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function formatMs(value: number | null) {
  return value === null ? '—' : `${Math.round(value)} ms`;
}

export function AdminPocMetricsPage() {
  const [rows, setRows] = useState<PocMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('aggregator_poc_metrics')
      .select('id,created_at,aggregator,operation,provider_code,game_code,device_type,success,latency_ms,error_code,environment,country')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as PocMetric[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const summaries = useMemo<Summary[]>(() => {
    const groups = new Map<string, PocMetric[]>();
    for (const row of rows) {
      const provider = row.provider_code || 'todos';
      const key = `${row.aggregator}|${row.operation}|${provider}`;
      const current = groups.get(key) ?? [];
      current.push(row);
      groups.set(key, current);
    }

    return [...groups.entries()].map(([key, metrics]) => {
      const successfulLatencies = metrics
        .filter((metric) => metric.success && metric.latency_ms !== null)
        .map((metric) => Number(metric.latency_ms))
        .filter(Number.isFinite);
      const successes = metrics.filter((metric) => metric.success).length;
      const [aggregator, operation, provider] = key.split('|');
      return {
        key,
        aggregator,
        operation,
        provider,
        total: metrics.length,
        successRate: metrics.length ? (successes / metrics.length) * 100 : 0,
        p50: percentile(successfulLatencies, 0.5),
        p95: percentile(successfulLatencies, 0.95),
        p99: percentile(successfulLatencies, 0.99),
      };
    }).sort((a, b) => a.aggregator.localeCompare(b.aggregator) || a.operation.localeCompare(b.operation) || a.provider.localeCompare(b.provider));
  }, [rows]);

  const total = rows.length;
  const successful = rows.filter((row) => row.success).length;
  const overallRate = total ? (successful / total) * 100 : 0;
  const aggregators = new Set(rows.map((row) => row.aggregator)).size;

  return (
    <AdminGate>
      <AdminShell>
        <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-300"><Activity className="h-4 w-4" /> POC Benchmark</div>
                <h1 className="mt-2 text-3xl font-black">Performance dos agregadores</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">Métricas técnicas sem PII para comparar sandboxes autorizados. Percentis são calculados apenas sobre chamadas bem-sucedidas.</p>
              </div>
              <button disabled={loading} onClick={() => void load()} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black hover:bg-white/5 disabled:opacity-50"><RefreshCw className="mr-2 inline h-4 w-4" />Atualizar</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Amostras</p><p className="mt-1 text-2xl font-black">{total}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Taxa de sucesso</p><p className="mt-1 text-2xl font-black text-emerald-300">{overallRate.toFixed(1)}%</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Agregadores medidos</p><p className="mt-1 text-2xl font-black">{aggregators}</p></div>
            </div>

            {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
            <div className="border-b border-white/8 px-6 py-4"><h2 className="font-black">p50 / p95 / p99</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-black/20 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Agregador</th><th className="px-5 py-3">Operação</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">N</th><th className="px-5 py-3">Sucesso</th><th className="px-5 py-3">p50</th><th className="px-5 py-3">p95</th><th className="px-5 py-3">p99</th></tr></thead>
                <tbody>
                  {summaries.map((item) => <tr key={item.key} className="border-t border-white/5"><td className="px-5 py-3 font-black uppercase">{item.aggregator}</td><td className="px-5 py-3 text-slate-300">{item.operation}</td><td className="px-5 py-3 text-slate-400">{item.provider}</td><td className="px-5 py-3">{item.total}</td><td className="px-5 py-3"><span className={item.successRate >= 99 ? 'text-emerald-300' : item.successRate >= 95 ? 'text-amber-300' : 'text-rose-300'}>{item.successRate.toFixed(1)}%</span></td><td className="px-5 py-3">{formatMs(item.p50)}</td><td className="px-5 py-3">{formatMs(item.p95)}</td><td className="px-5 py-3">{formatMs(item.p99)}</td></tr>)}
                  {!loading && summaries.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Ainda não há amostras. Elas serão registradas quando um sandbox autorizado estiver ativo.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-400/10 bg-emerald-400/[.035] p-5 text-sm text-slate-300">
            <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><p>O painel não executa carga automática. Os dados vêm de operações normais de POC; qualquer teste de volume só deve ser feito com autorização escrita do agregador.</p></div>
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
