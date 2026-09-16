import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, CircleDollarSign, RefreshCw, Server, ShieldCheck, Undo2 } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { B2BSandbox, type B2BCallbackResult, type B2BEventType, type B2BProviderSession, type B2BSelfTestResult } from '../lib/b2b-sandbox';
import { useCatalog } from '../lib/catalog';
import { supabase } from '../integrations/supabase/client';

type EventRow = {
  id: string;
  external_event_id: string;
  event_type: B2BEventType;
  amount: number;
  status: 'APPLIED' | 'REJECTED';
  error_code: string | null;
  balance_after: number;
  original_event_id: string | null;
  created_at: string;
};

function callbackOf(result: B2BSelfTestResult | null) {
  if (!result || !result.response || typeof result.response !== 'object') return null;
  return result.response as B2BCallbackResult;
}

export function AdminB2BSandboxPage() {
  const catalog = useCatalog();
  const queryClient = useQueryClient();
  const [selectedGameId, setSelectedGameId] = useState('');
  const [providerSession, setProviderSession] = useState<B2BProviderSession | null>(null);
  const [amount, setAmount] = useState(5);
  const [lastBetEventId, setLastBetEventId] = useState('');
  const [lastResult, setLastResult] = useState<B2BSelfTestResult | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Crie uma sessão sandbox para testar callbacks assinados.');

  const statusQuery = useQuery({
    queryKey: ['b2b-sandbox-status'],
    queryFn: () => B2BSandbox.status(),
    staleTime: 15_000,
  });

  const eventsQuery = useQuery({
    queryKey: ['b2b-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_events')
        .select('id,external_event_id,event_type,amount,status,error_code,balance_after,original_event_id,created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!selectedGameId && catalog.data?.games?.length) setSelectedGameId(catalog.data.games[0].id);
  }, [catalog.data?.games, selectedGameId]);

  async function createSession() {
    if (!selectedGameId) {
      setMessage('Selecione um jogo do catálogo DEMO.');
      return;
    }
    setBusy('session');
    try {
      const next = await B2BSandbox.createSession(selectedGameId);
      setProviderSession(next);
      setLastBetEventId('');
      setLastResult(null);
      setMessage('Sessão B2B sandbox criada. O provider agora pode consultar saldo e enviar eventos.');
      await queryClient.invalidateQueries({ queryKey: ['b2b-sandbox-status'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao criar sessão B2B.');
    } finally {
      setBusy('');
    }
  }

  async function runEvent(eventType: B2BEventType) {
    if (!providerSession) {
      setMessage('Crie a sessão B2B primeiro.');
      return;
    }
    if (eventType === 'REFUND' && !lastBetEventId) {
      setMessage('Faça um BET aplicado antes de testar REFUND.');
      return;
    }
    setBusy(eventType);
    try {
      const result = await B2BSandbox.selfTestEvent(
        providerSession.id,
        eventType,
        eventType === 'BALANCE' ? 0 : amount,
        eventType === 'REFUND' ? lastBetEventId : undefined,
      );
      setLastResult(result);
      const callback = callbackOf(result);
      if (eventType === 'BET' && callback?.data?.status === 'APPLIED') setLastBetEventId(result.request.eventId);
      const suffix = callback?.data ? ` • saldo ${callback.data.balance.toLocaleString('pt-BR')} DEMO` : '';
      setMessage(callback?.error ? `${eventType}: ${callback.error}${suffix}` : `${eventType} processado via callback HMAC${suffix}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['b2b-events'] }),
        queryClient.invalidateQueries({ queryKey: ['b2b-sandbox-status'] }),
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Falha no evento ${eventType}.`);
    } finally {
      setBusy('');
    }
  }

  async function closeSession() {
    if (!providerSession) return;
    setBusy('close');
    try {
      await B2BSandbox.closeSession(providerSession.id);
      setProviderSession(null);
      setLastBetEventId('');
      setMessage('Sessão B2B encerrada.');
      await queryClient.invalidateQueries({ queryKey: ['b2b-sandbox-status'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao encerrar sessão.');
    } finally {
      setBusy('');
    }
  }

  const status = statusQuery.data;
  const callback = callbackOf(lastResult);

  return (
    <AdminGate>
      <AdminShell>
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300"><ShieldCheck className="h-4 w-4" /> B2B Gateway • Sandbox</div>
                <h1 className="mt-2 text-3xl font-black">Ponte genérica de provedores</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">Emula o fluxo server-to-server de um agregador: sessão, saldo, aposta, prêmio, estorno, HMAC e idempotência. Tudo usa créditos DEMO.</p>
              </div>
              <button onClick={() => void statusQuery.refetch()} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black hover:bg-white/5"><RefreshCw className="mr-2 inline h-4 w-4" />Atualizar</button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-black/20 p-4"><Server className="h-5 w-5 text-cyan-300" /><p className="mt-2 text-xs uppercase text-slate-500">Adapter</p><p className="font-black">{status?.integration.adapter ?? '—'}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-2 text-xs uppercase text-slate-500">Ambiente</p><p className="font-black">{status?.integration.environment?.toUpperCase() ?? '—'}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><Activity className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs uppercase text-slate-500">Sessões</p><p className="font-black">{status?.sessionCount ?? 0}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><CircleDollarSign className="h-5 w-5 text-violet-300" /><p className="mt-2 text-xs uppercase text-slate-500">Eventos B2B</p><p className="font-black">{status?.eventCount ?? 0}</p></div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs text-slate-400">
              <p className="font-black text-slate-200">Callback</p>
              <p className="mt-1 break-all font-mono">{status?.callbackUrl ?? 'Carregando...'}</p>
              <p className="mt-3 font-black text-slate-200">Assinatura</p>
              <p className="mt-1 font-mono">{status?.signature ?? 'HMAC-SHA256'}</p>
              <p className="mt-3">Headers: {(status?.headers ?? []).join(' • ') || '—'} · Key ID: {status?.integration.keyId ?? '—'}</p>
              <p className="mt-2 text-slate-600">O segredo de assinatura não é salvo no banco nem exibido nesta tela.</p>
            </div>
            <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-300">{message}</p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <h2 className="text-xl font-black">1. Criar sessão de provider</h2>
            <p className="mt-1 text-sm text-slate-500">A sessão externa é vinculada a uma sessão real do ledger DEMO.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <select value={selectedGameId} onChange={(event) => setSelectedGameId(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white">
                {(catalog.data?.games ?? []).map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
              </select>
              <button disabled={Boolean(busy) || !selectedGameId} onClick={() => void createSession()} className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy === 'session' ? 'Criando...' : 'Criar sessão B2B'}</button>
            </div>
            {providerSession && <div className="mt-4 grid gap-2 rounded-2xl bg-black/20 p-4 text-xs md:grid-cols-2"><p><span className="text-slate-500">Provider Session:</span> <span className="break-all font-mono">{providerSession.externalSessionId}</span></p><p><span className="text-slate-500">Player:</span> <span className="break-all font-mono">{providerSession.externalPlayerId}</span></p><p><span className="text-slate-500">Status:</span> <b className="text-emerald-300">{providerSession.status}</b></p><p><span className="text-slate-500">Expira:</span> {providerSession.expiresAt ? new Date(providerSession.expiresAt).toLocaleString('pt-BR') : '—'}</p></div>}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <h2 className="text-xl font-black">2. Simular callbacks do agregador</h2>
            <p className="mt-1 text-sm text-slate-500">Cada botão envia um request assinado para o endpoint público e passa pelo mesmo verificador HMAC usado por um provider.</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="min-w-36"><span className="text-xs font-bold uppercase text-slate-500">Valor DEMO</span><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(Math.max(0.01, Number(event.target.value) || 0.01))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm" /></label>
              <button disabled={!providerSession || Boolean(busy)} onClick={() => void runEvent('BALANCE')} className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-200 disabled:opacity-40">{busy === 'BALANCE' ? '...' : 'BALANCE'}</button>
              <button disabled={!providerSession || Boolean(busy)} onClick={() => void runEvent('BET')} className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-2.5 text-sm font-black text-rose-200 disabled:opacity-40">{busy === 'BET' ? '...' : 'BET'}</button>
              <button disabled={!providerSession || Boolean(busy)} onClick={() => void runEvent('WIN')} className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-black text-emerald-200 disabled:opacity-40">{busy === 'WIN' ? '...' : 'WIN'}</button>
              <button disabled={!providerSession || !lastBetEventId || Boolean(busy)} onClick={() => void runEvent('REFUND')} className="rounded-xl border border-violet-300/30 bg-violet-300/10 px-4 py-2.5 text-sm font-black text-violet-200 disabled:opacity-40"><Undo2 className="mr-1 inline h-4 w-4" />{busy === 'REFUND' ? '...' : 'REFUND'}</button>
              <button disabled={!providerSession || Boolean(busy)} onClick={() => void closeSession()} className="ml-auto rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-400 hover:bg-white/5 disabled:opacity-40">Encerrar sessão</button>
            </div>
            {lastBetEventId && <p className="mt-3 text-xs text-slate-500">Último BET elegível para refund: <span className="font-mono text-slate-300">{lastBetEventId}</span></p>}
            {lastResult && <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs font-black uppercase text-slate-500">Request assinado</p><pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">{JSON.stringify(lastResult.request, null, 2)}</pre></div><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs font-black uppercase text-slate-500">Resposta do wallet</p><pre className={`mt-2 overflow-auto whitespace-pre-wrap break-all text-xs ${callback?.error ? 'text-rose-300' : 'text-emerald-300'}`}>{JSON.stringify(lastResult.response, null, 2)}</pre></div></div>}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">3. Ledger B2B</h2><p className="mt-1 text-sm text-slate-500">Eventos idempotentes persistidos pelo backend.</p></div><button onClick={() => void eventsQuery.refetch()} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Atualizar</button></div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/5 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Horário</th><th className="px-4 py-3">Evento</th><th className="px-4 py-3">ID externo</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{(eventsQuery.data ?? []).map((row) => <tr key={row.id} className="border-t border-white/5"><td className="px-4 py-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="px-4 py-3 font-black">{row.event_type}</td><td className="max-w-52 truncate px-4 py-3 font-mono text-xs text-slate-400">{row.external_event_id}</td><td className="px-4 py-3">{Number(row.amount).toLocaleString('pt-BR')}</td><td className="px-4 py-3 text-amber-300">{Number(row.balance_after).toLocaleString('pt-BR')}</td><td className={`px-4 py-3 text-xs font-black ${row.status === 'APPLIED' ? 'text-emerald-300' : 'text-rose-300'}`}>{row.status}{row.error_code ? ` • ${row.error_code}` : ''}</td></tr>)}</tbody></table>
              {!eventsQuery.isLoading && !(eventsQuery.data ?? []).length && <p className="p-6 text-center text-sm text-slate-500">Nenhum callback B2B processado ainda.</p>}
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
