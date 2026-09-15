import { GameCard } from '../components/GameCard';
import { useDemo } from '../lib/demo-store';
import { useCatalog } from '../lib/catalog';

export function GamesPage() {
  const { favorites, recent } = useDemo();
  const catalog = useCatalog();
  const games = catalog.data?.games ?? [];
  const providers = catalog.data?.providers ?? [];
  const favoriteGames = games.filter((game) => favorites.includes(game.slug));
  const recentGames = recent.map((slug) => games.find((game) => game.slug === slug)).filter((game): game is (typeof games)[number] => Boolean(game));

  if (catalog.isLoading) return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-8 text-sm text-slate-400">Carregando catálogo...</div>;
  if (catalog.isError) return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-8 text-sm text-rose-200">Não foi possível carregar os jogos.</div>;

  const card = (game: (typeof games)[number]) => <GameCard key={game.id} game={game} provider={providers.find((provider) => provider.id === game.providerId)} />;

  return (
    <div className="space-y-8">
      <header><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Catálogo</p><h1 className="mt-1 text-3xl font-black">Jogos</h1><p className="mt-2 text-sm text-slate-400">Todos os títulos desta fase são fictícios e demonstrativos.</p></header>
      {favoriteGames.length > 0 && <section><h2 className="mb-4 text-xl font-black">Favoritos</h2><div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{favoriteGames.map(card)}</div></section>}
      {recentGames.length > 0 && <section><h2 className="mb-4 text-xl font-black">Recentes</h2><div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{recentGames.map(card)}</div></section>}
      <section><h2 className="mb-4 text-xl font-black">Todos</h2><div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{games.map(card)}</div></section>
    </div>
  );
}
