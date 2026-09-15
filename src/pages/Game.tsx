import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useDemo } from '../lib/demo-store';
import { useAuth } from '../lib/auth';
import { useCatalog } from '../lib/catalog';

const bets = [1, 2, 5, 10, 20, 50, 100];

export function GamePage() {
  const { slug } = useParams({ from: '/jogo/$slug' });
  const catalog = useCatalog();
  const game = (catalog.data?.games ?? []).find((item) => item.slug === slug);
  const provider = (catalog.data?.providers ?? []).find((item) => item.id === game?.providerId);
  const { balance, playDemo, markRecent } = useDemo();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('Escolha um valor e rode a demonstração.');

  useEffect(() => {
    if (user && game) void markRecent(game.slug);
  }, [game, markRecent, user]);

  if (catalog.isLoading) return <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-400">Carregando jogo...</div>;
  if (!game) return <div className="rounded-2xl border border-white/10 p-8 text-center"><p>Jogo demo não encontrado.</p><Link to="/" className="mt-4 inline-flex text-amber-300">Voltar ao lobby</Link></div>;

  const selectedGame = game;

  async function runDemo() {
    if (!user) {
      void navigate({ to: '/auth' });
      return;
    }
    setBusy(true);
    const outcome = await playDemo(selectedGame.slug, selectedGame.name, bet);
    setBusy(false);
    if (outcome.needsAuth) {
      void navigate({ to: '/auth' });
      return;
    }
    setResult(outcome.message);
  }

  return <div className="mx-auto max-w-3xl"><Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</Link><section className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br ${selectedGame.accent} p-6 shadow-2xl shadow-black/30 md:p-8`} style={selectedGame.bannerUrl ? { backgroundImage: `linear-gradient(to top,rgba(0,0,0,.82),rgba(0,0,0,.18)),url(${selectedGame.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,.25),transparent_25%),linear-gradient(to_top,rgba(0,0,0,.78),transparent_60%)]" /><div className="relative z-10 flex min-h-72 flex-col justify-between"><div><span className="rounded-full bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/90">{provider?.name ?? 'RR7 Demo'}</span></div>{!selectedGame.bannerUrl && <div className="grid place-items-center text-8xl drop-shadow-2xl">{selectedGame.art}</div>}<div><h1 className="text-3xl font-black">{selectedGame.name}</h1><p className="mt-1 text-sm text-white/70">{selectedGame.description ?? 'Simulação persistida no Supabase • sem dinheiro real'}</p></div></div></section><section className="mt-5 rounded-3xl border border-white/8 bg-white/[.035] p-5"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Seu saldo</p><p className="mt-1 text-xl font-black text-amber-300">{user ? balance.toLocaleString('pt-BR') : '—'} créditos</p></div><div className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> DEMO</div></div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Valor da rodada</p><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{bets.map((value) => <button key={value} onClick={() => setBet(value)} className={`rounded-xl border py-2.5 text-sm font-black transition ${bet === value ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-white/10 bg-white/5 text-slate-300'}`}>{value}</button>)}</div><button disabled={busy} onClick={() => void runDemo()} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/10 transition hover:brightness-105 disabled:opacity-60">{busy ? 'Processando...' : user ? 'Rodar demonstração' : 'Entrar para jogar DEMO'}</button><p className="mt-4 rounded-xl bg-black/20 px-4 py-3 text-center text-sm text-slate-300">{result}</p></section></div>;
}
