import { Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GameCard } from '../components/GameCard';
import { Brand } from '../components/Brand';
import { useCatalog } from '../lib/catalog';

export function HomePage() {
  const catalog = useCatalog();
  const [category, setCategory] = useState('all');
  const [provider, setProvider] = useState('all');
  const [search, setSearch] = useState('');

  const providers = catalog.data?.providers ?? [];
  const categories = catalog.data?.categories ?? [];
  const games = catalog.data?.games ?? [];
  const hero = (catalog.data?.banners ?? []).find((banner) => banner.position === 'HOME_HERO') ?? catalog.data?.banners[0];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return games.filter((game) => {
      const matchesCategory = category === 'all' || game.categoryId === category;
      const matchesProvider = provider === 'all' || game.providerId === provider;
      const providerName = providers.find((item) => item.id === game.providerId)?.name.toLowerCase() ?? '';
      const matchesSearch = !term || game.name.toLowerCase().includes(term) || providerName.includes(term);
      return matchesCategory && matchesProvider && matchesSearch;
    });
  }, [category, games, provider, providers, search]);

  return (
    <div className="space-y-7">
      <section
        className="relative overflow-hidden rounded-[28px] border border-amber-300/15 bg-[radial-gradient(circle_at_78%_24%,rgba(245,158,11,.26),transparent_25%),linear-gradient(125deg,#0d3744_0%,#09212b_52%,#07171f_100%)] px-5 py-7 shadow-2xl shadow-black/20 md:px-9 md:py-10"
        style={hero?.imageUrl ? { backgroundImage: `linear-gradient(90deg,rgba(4,18,25,.96),rgba(4,18,25,.48)),url(${hero.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="relative z-10 max-w-xl">
          <div className="mb-4"><Brand /></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-amber-300"><Sparkles className="h-3 w-3" /> laboratório demonstrativo</span>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">{hero?.title ?? 'Explore. Teste. Entenda a plataforma por dentro.'}</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300 md:text-base">{hero?.subtitle ?? 'Catálogo, favoritos, histórico e carteira com créditos exclusivamente DEMO. Sem depósito, saque ou dinheiro real.'}</p>
          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> Ambiente educacional seguro</div>
        </div>
        <div className="pointer-events-none absolute -bottom-12 -right-8 text-[170px] font-black leading-none text-white/[.035]">7</div>
      </section>

      <section>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jogo ou provedor" className="w-full rounded-2xl border border-white/10 bg-white/[.055] py-3.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-500 focus:border-amber-300/40 focus:bg-white/[.075]" />
        </div>
      </section>

      {catalog.isLoading ? <LobbySkeleton /> : catalog.isError ? <CatalogError /> : <>
        <section>
          <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Provedores</p><h2 className="mt-1 text-xl font-black">Escolha uma coleção</h2></div></div>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
            <button onClick={() => setProvider('all')} className={`min-w-20 rounded-2xl border px-3 py-3 text-left transition ${provider === 'all' ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/8 bg-white/[.035]'}`}><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-600 text-sm font-black text-slate-950">ALL</div><p className="mt-2 whitespace-nowrap text-xs font-bold">Todos</p></button>
            {providers.map((item) => <button key={item.id} onClick={() => setProvider(item.id)} className={`min-w-24 rounded-2xl border px-3 py-3 text-left transition ${provider === item.id ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/8 bg-white/[.035]'}`}><div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${item.accent} text-xs font-black text-white shadow-lg`}>{item.shortName}</div><p className="mt-2 whitespace-nowrap text-xs font-bold">{item.name}</p></button>)}
          </div>
        </section>

        <section>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setCategory('all')} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition ${category === 'all' ? 'border-amber-300/40 bg-amber-300 text-slate-950' : 'border-white/10 bg-white/[.045] text-slate-300'}`}><span>✦</span>Todos</button>
            {categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition ${category === item.id ? 'border-amber-300/40 bg-amber-300 text-slate-950' : 'border-white/10 bg-white/[.045] text-slate-300'}`}><span>{item.icon}</span>{item.name}</button>)}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Lobby</p><h2 className="mt-1 text-xl font-black">Jogos demonstrativos</h2></div><span className="text-xs text-slate-500">{filtered.length} jogos</span></div>
          {filtered.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{filtered.map((game) => <GameCard key={game.id} game={game} provider={providers.find((item) => item.id === game.providerId)} />)}</div> : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-slate-400">Nenhum jogo encontrado com esses filtros.</div>}
        </section>
      </>}
    </div>
  );
}

function LobbySkeleton() {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/[.055]" />)}</div>;
}

function CatalogError() {
  return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-5 py-8 text-center text-sm text-rose-200">Não foi possível carregar o catálogo agora.</div>;
}
