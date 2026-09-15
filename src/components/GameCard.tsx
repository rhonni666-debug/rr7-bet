import { Heart, Play } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { providers } from '../data/demo';
import { useDemo } from '../lib/demo-store';
import type { DemoGame } from '../types';

export function GameCard({ game }: { game: DemoGame }) {
  const { favorites, toggleFavorite, markRecent } = useDemo();
  const provider = providers.find((item) => item.id === game.providerId);
  const favorite = favorites.includes(game.slug);

  return (
    <article className="group min-w-0">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${game.accent} shadow-lg shadow-black/20`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.22),transparent_28%),linear-gradient(to_top,rgba(0,0,0,.68),transparent_58%)]" />
        <div className="absolute inset-0 grid place-items-center pb-8 text-6xl drop-shadow-2xl transition-transform duration-300 group-hover:scale-110">{game.art}</div>
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {game.isNew && <span className="rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-slate-900">Novo</span>}
          {game.popular && <span className="rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase text-slate-950">Popular</span>}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            toggleFavorite(game.slug);
          }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/55 backdrop-blur"
          aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart className={`h-4 w-4 ${favorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>
        <Link
          to="/jogo/$slug"
          params={{ slug: game.slug }}
          onClick={() => markRecent(game.slug)}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-slate-950/70 px-3 py-2 text-white backdrop-blur transition hover:bg-slate-950/85"
        >
          <span className="truncate text-sm font-bold">Jogar demo</span>
          <Play className="h-4 w-4 fill-current" />
        </Link>
      </div>
      <h3 className="mt-2 truncate text-sm font-bold text-white">{game.name}</h3>
      <p className="truncate text-xs text-slate-400">{provider?.name ?? 'RR7 Demo'}</p>
    </article>
  );
}
