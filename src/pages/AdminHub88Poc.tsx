import { useState } from 'react';
import { ExternalLink, Gauge, Play, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { Hub88Poc, type Hub88PocGame, type Hub88PocProduct } from '../lib/hub88-poc';

function labelOf(record: Record<string, unknown>) {
  for (const key of ['name', 'title', 'product_name', 'product_code', 'code']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return 'Item sem nome';
}

function codeOf(record: Record<string, unknown>) {
  for (const key of ['product_code', 'code', 'game_code']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

export function AdminHub88PocPage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<Hub88PocProduct[]>([]);
  const [games, setGames] = useState<Hub88PocGame[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('POC desativada até a configuração oficial do sandbox Hub88.');
  const [latency, setLatency] = useState<number | null>(null);

  async function loadStatus() {
    setBusy('status');
    try {
      const result = await Hub88Poc.status();
      setStatus(result.data ?? null);
      setMessage('Status do gateway atualizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao consultar status.');
    } finally {
      setBusy('');
    }
  }

  async function loadProducts() {
    setBusy('products');
    try {
      const result = await Hub88Poc.listProducts();
      setProducts(result.data ?? []);
      setLatency(result.meta?.latencyMs ?? null);
      setMessage(`${result.data?.length ?? 0} produtos retornados pelo staging.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao listar produtos.');
    } finally {
      setBusy('');
    }
  }

  async function loadGames(productCode: string) {
    if (!productCode) return;
    setSelectedProduct(productCode);
    setBusy('games');
    try {
      const result = await Hub88Poc.listGames(productCode);
      setGames(result.data ?? []);
      setLatency(result.meta?.latencyMs ?? null);
      setMessage(`${result.data?.length ?? 0} jogos DEMO habilitados.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao listar jogos.');
    } finally {
      setBusy('');
    }
  }

  async function launch(gameCode: string) {
    if (!gameCode) return;
    setBusy(gameCode);
    try {
      const result = await Hub88Poc.launchDemo(
        gameCode,
        window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
      );
      setLatency(result.meta?.latencyMs ?? null);
      const url = result.data?.url;
      if (!url) throw new Error('HUB88_NO_GAME_URL');
      window.open(url, '_blank', 'noopener,noreferrer');
      setMessage(`Demo ${gameCode} lançada em nova aba.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao lançar demo.');
    } finally {
      setBusy('');
    }
  }

  return (
    <AdminGate>
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300"><ShieldCheck className="h-4 w-4" /> Hub88 • DEMO POC</div>
              <h1 className="mt-2 text-3xl font-black">Validação PG SOFT + TaDa</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">Área administrativa para testar somente o staging autorizado. Nenhum dinheiro real é usado.</p>
            </div>
            <button onClick={() => void loadStatus()} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black hover:bg-white/5"><RefreshCw className="mr-2 inline h-4 w-4" />Status</button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-black/20 p-4"><Server className="h-5 w-5 text-cyan-300" /><p className="mt-2 text-xs uppercase text-slate-500">Gateway</p><p className="font-black">{status?.enabled === true ? 'Staging habilitado' : 'Desabilitado'}</p></div>
            <div className="rounded-2xl bg-black/20 p-4"><Gauge className="h-5 w-5 text-amber-300" /><p className="mt-2 text-xs uppercase text-slate-500">Última latência API</p><p className="font-black">{latency === null ? '—' : `${latency} ms`}</p></div>
            <div className="rounded-2xl bg-black/20 p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-2 text-xs uppercase text-slate-500">Moeda</p><p className="font-black">XXX • fun-money</p></div>
          </div>
          <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-300">{message}</p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Produtos habilitados</h2><button disabled={Boolean(busy)} onClick={() => void loadProducts()} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">{busy === 'products' ? 'Carregando...' : 'Consultar Hub88'}</button></div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product, index) => {
              const code = codeOf(product);
              return <button key={`${code}-${index}`} disabled={!code || Boolean(busy)} onClick={() => void loadGames(code)} className={`rounded-2xl border p-4 text-left transition ${selectedProduct === code ? 'border-amber-300/60 bg-amber-300/10' : 'border-white/8 bg-black/15 hover:bg-white/5'}`}><p className="font-black">{labelOf(product)}</p><p className="mt-1 text-xs text-slate-500">{code || 'Código não exposto'}</p></button>;
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <h2 className="text-xl font-black">Jogos DEMO</h2>
          <p className="mt-1 text-sm text-slate-500">Somente registros retornados como habilitados e com suporte a demo.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {games.map((game, index) => {
              const code = String(game.game_code ?? '');
              const thumb = typeof game.url_thumb === 'string' ? game.url_thumb : '';
              return <article key={`${code}-${index}`} className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">{thumb ? <img src={thumb} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-white/5 text-xs text-slate-600">Sem thumbnail</div>}<div className="p-4"><p className="truncate font-black">{labelOf(game)}</p><p className="mt-1 truncate text-xs text-slate-500">{code}</p><button disabled={!code || Boolean(busy)} onClick={() => void launch(code)} className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/15 disabled:opacity-50"><Play className="mr-1 inline h-3.5 w-3.5" />{busy === code ? 'Abrindo...' : 'Jogar DEMO'} <ExternalLink className="ml-1 inline h-3.5 w-3.5" /></button></div></article>;
            })}
          </div>
        </section>
      </div>
    </AdminGate>
  );
}
