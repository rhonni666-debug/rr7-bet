import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { games, providers } from '../data/demo';
import { useDemo } from '../lib/demo-store';

const bets = [1, 2, 5, 10, 20, 50, 100];

export function GamePage() {
  const { slug } = useParams({ from: '/jogo/$slug' });
  const game = games.find((item) => item.slug === slug);
  const { balance, playDemo, markRecent } = useDemo();
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState('Escolha um valor e rode a demonstração.');

  if (!game) return <div className="rounded-2xl border border-white/10 p-8 text-center"><p>Jogo demo não encontrado.</p><Link to="/" className="mt-4 inline-flex text-amber-300">Voltar ao lobby</Link></div>;
  const provider = providers.find((item) => item.id === game.providerId);

  return <div className="mx-auto max-w-3xl"><Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</Link><section className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br ${game.accent} p-6 shadow-2xl shadow-black/30 md:p-8`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,.25),transparent_25%),linear-gradient(to_top,rgba(0,0,0,.78),transparent_60%)]" /><div className="relative z-10 flex min-h-72 flex-col justify-between"><div><span className="rounded-full bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/90">{provider?.name}</span></div><div className="grid place-items-center text-8xl drop-shadow-2xl">{game.art}</div><div><h1 className="text-3xl font-black">{game.name}</h1><p className="mt-1 text-sm text-white/70">Simulação local • sem dinheiro real</p></div></div></section><section className="mt-5 rounded-3xl border border-white/8 bg-white/[.035] p-5"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Seu saldo</p><p className="mt-1 text-xl font-black text-amber-300">{balance.toLocaleString('pt-BR')} créditos</p></div><div className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> DEMO</div></div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Valor da rodada</p><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{bets.map((value) => <button key={value} onClick={() => setBet(value)} className={`rounded-xl border py-2.5 text-sm font-black transition ${bet === value ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-white/10 bg-white/5 text-slate-300'}`}>{value}</button>)}</div><button onClick={() => { markRecent(game.slug); const outcome = playDemo(game.slug, game.name, bet); setResult(outcome.message); }} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/10 transition hover:brightness-105">Rodar demonstração</button><p className="mt-4 rounded-xl bg-black/20 px-4 py-3 text-center text-sm text-slate-300">{result}</p></section></div>;
}
