import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, KeyRound, Plus, RefreshCw, Server, ShieldCheck, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';
import { useCatalog } from '../lib/catalog';

type OperatorRow = {
  id: string;
  code: string;
  name: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  public_key_pem: string | null;
  allowed_origins: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type EntitlementRow = {
  operator_id: string;
  game_id: string;
  enabled: boolean;
};

type SessionRow = {
  id: string;
  operator_id: string;
  status: string;
  external_player_id: string;
  created_at: string;
  expires_at: string;
};

function normalizeCode(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseOrigins(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function AdminRipcomPage() {
  const queryClient = useQueryClient();
  const catalog = useCatalog();
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Gerencie operadores B2B da RIPCOM sem expor chaves privadas.');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftEnvironment, setDraftEnvironment] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [draftStatus, setDraftStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'PENDING'>('PENDING');
  const [draftPublicKey, setDraftPublicKey] = useState('');
  const [draftOrigins, setDraftOrigins] = useState('');

  const operatorsQuery = useQuery({
    queryKey: ['ripcom-operators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_operators')
        .select('id,code,name,environment,status,public_key_pem,allowed_origins,metadata,created_at,updated_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        allowed_origins: Array.isArray(row.allowed_origins) ? row.allowed_origins.map(String) : [],
        metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {},
      })) as OperatorRow[];
    },
  });

  const entitlementsQuery = useQuery({
    queryKey: ['ripcom-entitlements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ripcom_operator_games').select('operator_id,game_id,enabled');
      if (error) throw error;
      return (data ?? []) as EntitlementRow[];
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ['ripcom-b2b-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_b2b_sessions')
        .select('id,operator_id,status,external_player_id,created_at,expires_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
    refetchInterval: 20_000,
  });

  const ripcomProvider = catalog.data?.providers.find((provider) => provider.slug === 'ripcom');
  const ripcomGames = useMemo(
    () => (catalog.data?.games ?? []).filter((game) => game.providerId === ripcomProvider?.id),
    [catalog.data?.games, ripcomProvider?.id],
  );

  const selected = operatorsQuery.data?.find((operator) => operator.id === selectedId) ?? null;
  const selectedEntitlements = new Map(
    (entitlementsQuery.data ?? []).filter((row) => row.operator_id === selectedId).map((row) => [row.game_id, row.enabled]),
  );
  const selectedSessions = (sessionsQuery.data ?? []).filter((row) => row.operator_id === selectedId);

  useEffect(() => {
    if (!selectedId && operatorsQuery.data?.length) setSelectedId(operatorsQuery.data[0].id);
  }, [operatorsQuery.data, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setDraftName(selected.name);
    setDraftEnvironment(selected.environment);
    setDraftStatus(selected.status);
    setDraftPublicKey(selected.public_key_pem ?? '');
    setDraftOrigins(selected.allowed_origins.join(', '));
  }, [selected?.id, selected?.updated_at]);

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ripcom-operators'] }),
      queryClient.invalidateQueries({ queryKey: ['ripcom-entitlements'] }),
      queryClient.invalidateQueries({ queryKey: ['ripcom-b2b-sessions'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
    ]);
  }

  async function createOperator() {
    const code = normalizeCode(newCode || newName);
    const name = newName.trim();
    if (!name || !code) {
      setMessage('Informe nome e código do operador.');
      return;
    }
    setBusy('create');
    try {
      const { data, error } = await supabase
        .from('ripcom_operators')
        .insert({
          code,
          name,
          environment: 'SANDBOX',
          status: 'PENDING',
          metadata: { integration: 'ripcom-b2b-v1' },
        })
        .select('id')
        .single();
      if (error) throw error;
      setNewName('');
      setNewCode('');
      setSelectedId(data.id);
      setMessage(`Operador ${name} criado como PENDING. Configure a chave pública e libere os jogos antes de ativar.`);
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao criar operador.');
    } finally {
      setBusy('');
    }
  }

  async function saveOperator() {
    if (!selected) return;
    if (draftPublicKey && !draftPublicKey.includes('BEGIN PUBLIC KEY')) {
      setMessage('A chave deve ser uma chave pública PEM (BEGIN PUBLIC KEY). Nunca cole a chave privada aqui.');
      return;
    }
    setBusy('save');
    try {
      const { error } = await supabase
        .from('ripcom_operators')
        .update({
          name: draftName.trim(),
          environment: draftEnvironment,
          status: draftStatus,
          public_key_pem: draftPublicKey.trim() || null,
          allowed_origins: parseOrigins(draftOrigins),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);
      if (error) throw error;
      setMessage('Configuração do operador salva.');
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar operador.');
    } finally {
      setBusy('');
    }
  }

  async function toggleGame(gameId: string, enabled: boolean) {
    if (!selected) return;
    setBusy(`game:${gameId}`);
    try {
      const { error } = await supabase.from('ripcom_operator_games').upsert({
        operator_id: selected.id,
        game_id: gameId,
        enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'operator_id,game_id' });
      if (error) throw error;
      setMessage(enabled ? 'Jogo liberado para o operador.' : 'Jogo bloqueado para o operador.');
      await queryClient.invalidateQueries({ queryKey: ['ripcom-entitlements'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao atualizar catálogo do operador.');
    } finally {
      setBusy('');
    }
  }

  const activeCount = (operatorsQuery.data ?? []).filter((operator) => operator.status === 'ACTIVE').length;
  const sessionCount = (sessionsQuery.data ?? []).length;

  return (
    <AdminGate>
      <AdminShell>
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-300"><ShieldCheck className="h-4 w-4" /> RIPCOM • Provider B2B</div>
                <h1 className="mt-2 text-3xl font-black">Operadores e distribuição</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">Cadastre plataformas parceiras, armazene somente a chave pública RSA e defina quais jogos RIPCOM cada operador pode lançar.</p>
              </div>
              <button onClick={() => void refreshAll()} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black hover:bg-white/5"><RefreshCw className="mr-2 inline h-4 w-4" />Atualizar</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-black/20 p-4"><Users className="h-5 w-5 text-cyan-300" /><p className="mt-2 text-xs uppercase text-slate-500">Operadores</p><p className="font-black">{operatorsQuery.data?.length ?? 0}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-2 text-xs uppercase text-slate-500">Ativos</p><p className="font-black">{activeCount}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><Boxes className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs uppercase text-slate-500">Jogos RIPCOM</p><p className="font-black">{ripcomGames.length}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><Server className="h-5 w-5 text-violet-300" /><p className="mt-2 text-xs uppercase text-slate-500">Sessões B2B</p><p className="font-black">{sessionCount}</p></div>
            </div>
            <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-300">{message}</p>
          </section>

          <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
                <h2 className="text-lg font-black">Novo operador</h2>
                <p className="mt-1 text-xs text-slate-500">O cadastro nasce PENDING e SANDBOX.</p>
                <div className="mt-4 space-y-3">
                  <input value={newName} onChange={(event) => { setNewName(event.target.value); if (!newCode) setNewCode(normalizeCode(event.target.value)); }} placeholder="Nome da plataforma" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm" />
                  <input value={newCode} onChange={(event) => setNewCode(normalizeCode(event.target.value))} placeholder="codigo-operador" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 font-mono text-sm" />
                  <button disabled={busy === 'create'} onClick={() => void createOperator()} className="w-full rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"><Plus className="mr-1 inline h-4 w-4" />{busy === 'create' ? 'Criando...' : 'Criar operador'}</button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[.035] p-3">
                <p className="px-2 py-2 text-xs font-black uppercase tracking-wider text-slate-500">Operadores</p>
                <div className="space-y-1">
                  {(operatorsQuery.data ?? []).map((operator) => {
                    const enabledGames = (entitlementsQuery.data ?? []).filter((row) => row.operator_id === operator.id && row.enabled).length;
                    return <button key={operator.id} onClick={() => setSelectedId(operator.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedId === operator.id ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-transparent hover:bg-white/5'}`}><div className="flex items-center justify-between gap-2"><span className="font-black">{operator.name}</span><span className={`text-[9px] font-black ${operator.status === 'ACTIVE' ? 'text-emerald-300' : operator.status === 'PENDING' ? 'text-amber-300' : 'text-rose-300'}`}>{operator.status}</span></div><p className="mt-1 font-mono text-[10px] text-slate-500">{operator.code} • {operator.environment} • {enabledGames} jogo(s)</p></button>;
                  })}
                  {!operatorsQuery.isLoading && !(operatorsQuery.data ?? []).length && <p className="p-4 text-center text-sm text-slate-500">Nenhum operador cadastrado.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {!selected ? <div className="rounded-3xl border border-white/10 bg-white/[.035] p-10 text-center text-slate-500">Selecione um operador.</div> : <>
                <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
                  <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-cyan-300" /><h2 className="text-xl font-black">Credenciais de {selected.name}</h2></div>
                  <p className="mt-2 text-sm text-slate-500">A RIPCOM armazena somente a chave pública. A chave privada deve permanecer exclusivamente no backend da plataforma parceira.</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Nome<input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" /></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Código<input value={selected.code} readOnly className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 font-mono text-sm normal-case text-slate-500" /></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Ambiente<select value={draftEnvironment} onChange={(event) => setDraftEnvironment(event.target.value as 'SANDBOX' | 'PRODUCTION')} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white"><option value="SANDBOX">SANDBOX</option><option value="PRODUCTION">PRODUCTION</option></select></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Status<select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as 'ACTIVE' | 'SUSPENDED' | 'PENDING')} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white"><option value="PENDING">PENDING</option><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></label>
                  </div>
                  <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Chave pública RSA PEM<textarea value={draftPublicKey} onChange={(event) => setDraftPublicKey(event.target.value)} rows={7} placeholder="-----BEGIN PUBLIC KEY-----" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 font-mono text-xs normal-case text-white" /></label>
                  <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Allowed origins<input value={draftOrigins} onChange={(event) => setDraftOrigins(event.target.value)} placeholder="https://partner.example, https://staging.partner.example" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" /></label>
                  <button disabled={busy === 'save'} onClick={() => void saveOperator()} className="mt-4 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50">{busy === 'save' ? 'Salvando...' : 'Salvar operador'}</button>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
                  <h2 className="text-xl font-black">Catálogo liberado</h2>
                  <p className="mt-1 text-sm text-slate-500">A API `/v1/games` só retorna jogos habilitados aqui.</p>
                  <div className="mt-4 space-y-2">{ripcomGames.map((game) => { const enabled = selectedEntitlements.get(game.id) === true; const working = busy === `game:${game.id}`; return <div key={game.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 p-4"><div><p className="font-black">{game.name}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{game.externalGameId}</p></div><button disabled={working} onClick={() => void toggleGame(game.id, !enabled)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${enabled ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-500'}`}>{enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}{working ? '...' : enabled ? 'Liberado' : 'Bloqueado'}</button></div>; })}</div>
                  {!ripcomGames.length && <p className="mt-4 rounded-xl bg-black/20 p-4 text-sm text-slate-500">Nenhum jogo RIPCOM ativo no catálogo.</p>}
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
                  <h2 className="text-xl font-black">Sessões recentes</h2>
                  <p className="mt-1 text-sm text-slate-500">Sessões criadas pela API B2B deste operador.</p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-white/5 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Criada</th><th className="px-4 py-3">Player externo</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Expira</th></tr></thead><tbody>{selectedSessions.slice(0, 20).map((session) => <tr key={session.id} className="border-t border-white/5"><td className="px-4 py-3 text-xs text-slate-500">{new Date(session.created_at).toLocaleString('pt-BR')}</td><td className="px-4 py-3 font-mono text-xs">{session.external_player_id}</td><td className="px-4 py-3 font-black">{session.status}</td><td className="px-4 py-3 text-xs text-slate-500">{new Date(session.expires_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table>{!selectedSessions.length && <p className="p-5 text-center text-sm text-slate-500">Nenhuma sessão B2B deste operador.</p>}</div>
                </section>
              </>}
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
