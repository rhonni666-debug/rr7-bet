import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, GitBranch, RefreshCw, ShieldCheck } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';

type ReleaseStatus = 'DRAFT' | 'SANDBOX' | 'RELEASED' | 'RETIRED';

type ReleaseRow = {
  id: string;
  game_id: string;
  version: string;
  status: ReleaseStatus;
  manifest: Record<string, unknown>;
  notes: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
  games: { name: string; slug: string; external_game_id: string | null } | null;
};

type EntitlementRow = {
  operator_id: string;
  game_id: string;
  release_id: string | null;
  enabled: boolean;
};

export function AdminRipcomReleasesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Cada operador pode ficar fixado em uma release específica do jogo.');

  const releasesQuery = useQuery({
    queryKey: ['ripcom-game-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_game_releases')
        .select('id,game_id,version,status,manifest,notes,released_at,created_at,updated_at,games(name,slug,external_game_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        manifest: row.manifest && typeof row.manifest === 'object' ? row.manifest as Record<string, unknown> : {},
      })) as unknown as ReleaseRow[];
    },
  });

  const entitlementsQuery = useQuery({
    queryKey: ['ripcom-release-entitlements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_operator_games')
        .select('operator_id,game_id,release_id,enabled');
      if (error) throw error;
      return (data ?? []) as EntitlementRow[];
    },
  });

  const releases = releasesQuery.data ?? [];
  const selected = releases.find((release) => release.id === selectedId) ?? releases[0] ?? null;
  const pinnedCount = useMemo(() => {
    if (!selected) return 0;
    return (entitlementsQuery.data ?? []).filter((row) => row.enabled && row.release_id === selected.id).length;
  }, [entitlementsQuery.data, selected]);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ripcom-game-releases'] }),
      queryClient.invalidateQueries({ queryKey: ['ripcom-release-entitlements'] }),
    ]);
  }

  async function changeStatus(status: ReleaseStatus) {
    if (!selected) return;
    setBusy('status');
    try {
      const { error } = await supabase
        .from('ripcom_game_releases')
        .update({ status, released_at: status === 'RELEASED' ? new Date().toISOString() : selected.released_at, updated_at: new Date().toISOString() })
        .eq('id', selected.id);
      if (error) throw error;
      setMessage(`Release ${selected.version} alterada para ${status}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao atualizar a release.');
    } finally {
      setBusy('');
    }
  }

  const sandboxCount = releases.filter((release) => release.status === 'SANDBOX').length;
  const releasedCount = releases.filter((release) => release.status === 'RELEASED').length;

  return (
    <AdminGate>
      <AdminShell>
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-300"><GitBranch className="h-4 w-4" /> RIPCOM • Releases</div>
                <h1 className="mt-2 text-3xl font-black">Versionamento dos jogos</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">Controle a versão entregue a cada plataforma. Uma atualização nova não precisa alterar automaticamente operadores que ainda estão homologando uma versão anterior.</p>
              </div>
              <button onClick={() => void refresh()} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black hover:bg-white/5"><RefreshCw className="mr-2 inline h-4 w-4" />Atualizar</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-4"><Boxes className="h-5 w-5 text-cyan-300" /><p className="mt-2 text-xs uppercase text-slate-500">Releases</p><p className="font-black">{releases.length}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><ShieldCheck className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs uppercase text-slate-500">Sandbox</p><p className="font-black">{sandboxCount}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-2 text-xs uppercase text-slate-500">Released</p><p className="font-black">{releasedCount}</p></div>
            </div>
            <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-300">{message}</p>
          </section>

          <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-3">
              <p className="px-2 py-2 text-xs font-black uppercase tracking-wider text-slate-500">Releases cadastradas</p>
              <div className="space-y-1">
                {releases.map((release) => <button key={release.id} onClick={() => setSelectedId(release.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${selected?.id === release.id ? 'border-violet-300/40 bg-violet-300/10' : 'border-transparent hover:bg-white/5'}`}><div className="flex items-center justify-between gap-2"><span className="font-black">{release.games?.name ?? release.game_id}</span><span className="font-mono text-xs text-violet-200">v{release.version}</span></div><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{release.status}</p></button>)}
                {!releasesQuery.isLoading && !releases.length && <p className="p-5 text-center text-sm text-slate-500">Nenhuma release cadastrada.</p>}
              </div>
            </div>

            {!selected ? <div className="rounded-3xl border border-white/10 bg-white/[.035] p-10 text-center text-slate-500">Selecione uma release.</div> : <div className="space-y-5">
              <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-violet-300">{selected.games?.external_game_id ?? selected.game_id}</p><h2 className="mt-1 text-2xl font-black">{selected.games?.name ?? 'Jogo RIPCOM'} <span className="text-violet-300">v{selected.version}</span></h2><p className="mt-2 text-sm text-slate-500">{selected.notes ?? 'Sem notas de release.'}</p></div><div className="rounded-2xl bg-black/20 px-4 py-3 text-right"><p className="text-[10px] uppercase text-slate-500">Operadores fixados</p><p className="text-xl font-black text-cyan-300">{pinnedCount}</p></div></div>
                <div className="mt-5 flex flex-wrap gap-2">{(['DRAFT','SANDBOX','RELEASED','RETIRED'] as ReleaseStatus[]).map((status) => <button key={status} disabled={busy === 'status' || selected.status === status} onClick={() => void changeStatus(status)} className={`rounded-xl border px-3 py-2 text-xs font-black ${selected.status === status ? 'border-violet-300/40 bg-violet-300/15 text-violet-200' : 'border-white/10 text-slate-400 hover:bg-white/5'} disabled:opacity-60`}>{status}</button>)}</div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
                <h2 className="text-xl font-black">Game Manifest</h2>
                <p className="mt-1 text-sm text-slate-500">Snapshot técnico associado à release. Isso permite saber exatamente qual runtime e capacidades estavam previstas nessa versão.</p>
                <pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-xs leading-5 text-slate-300">{JSON.stringify(selected.manifest, null, 2)}</pre>
              </section>
            </div>}
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
