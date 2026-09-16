import { Gauge, Minus, Plus, RotateCw, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { useDemo } from '../lib/demo-store';
import { GameLauncher } from '../lib/game-launcher';
import { roundErrorMessage } from '../lib/game-errors';
import { useSlotConfig } from '../lib/slot-config';
import type { DemoGame, GameSession, Provider, SlotConfig, SlotSpinOutcome } from '../types';

const bets = [1, 2, 5, 10, 20, 50, 100];

function idleGrid(config: SlotConfig) {
  const ids = config.symbols.map((symbol) => symbol.id);
  return config.layout.map((rows) => Array.from({ length: rows }, (_, index) => ids[(index + Math.floor(Math.random() * ids.length)) % ids.length] ?? ''));
}

function featureMessage(feature: Record<string, unknown>) {
  if (!feature.active) return null;
  const kind = String(feature.kind ?? '');
  if (kind === 'TIGER_RESPIN') return `RESPIN DO TIGRE • multiplicador ${Number(feature.multiplier ?? 1)}x`;
  if (kind === 'DRAGON_MULTIPLIER') {
    const bonus = Number(feature.bonusSpins ?? 0);
    const mult = Number(feature.multiplier ?? 1);
    return bonus ? `DRAGÃO • ${bonus} giros bônus + ${mult}x` : `MULTIPLICADOR DO DRAGÃO • ${mult}x`;
  }
  if (kind === 'RABBIT_BONUS') return `PRÊMIO DO COELHO • ${Number(feature.bonusSpins ?? 8)} giros bônus`;
  if (kind === 'OX_RESPIN') return `RESPINS DO BOI • ${Number(feature.respins ?? 0)} tentativa(s)${feature.fullScreen ? ' • TELA CHEIA' : ''}`;
  if (kind === 'SNAKE_WILD') return `SERPENTE WILD • ${String(feature.selectedIcon ?? '✨')} escolhido • ${Number(feature.respins ?? 0)} respin(s)`;
  return 'RECURSO ESPECIAL ATIVADO';
}

export function OriginalSlotMachine({ game, provider, session }: { game: DemoGame; provider: Provider; session: GameSession | null }) {
  const configQuery = useSlotConfig(game.id);
  const config = configQuery.data;
  const { user } = useAuth();
  const { balance, refresh } = useDemo();
  const navigate = useNavigate();
  const [bet, setBet] = useState(5);
  const [turbo, setTurbo] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState<string[][]>([]);
  const [outcome, setOutcome] = useState<SlotSpinOutcome | null>(null);
  const [message, setMessage] = useState('Toque em GIRAR para iniciar.');

  useEffect(() => {
    if (config) setGrid(idleGrid(config));
  }, [config?.gameId, config?.version]);

  const symbols = useMemo(() => new Map((config?.symbols ?? []).map((symbol) => [symbol.id, symbol])), [config?.symbols]);
  const winningIds = useMemo(() => new Set(outcome?.wins.map((win) => win.symbolId) ?? []), [outcome?.wins]);
  const primary = config?.theme.primary ?? '#fbbf24';
  const secondary = config?.theme.secondary ?? '#dc2626';
  const background = config?.theme.background ?? '#190b05';
  const glow = config?.theme.glow ?? primary;
  const maxRows = Math.max(...(config?.layout ?? [3]));

  function adjustBet(direction: -1 | 1) {
    const index = bets.indexOf(bet);
    setBet(bets[Math.min(bets.length - 1, Math.max(0, index + direction))] ?? bet);
  }

  async function spin() {
    if (!user) {
      void navigate({ to: '/auth' });
      return;
    }
    if (!config || !session) {
      setMessage('A sessão do slot ainda está sendo preparada.');
      return;
    }
    if (bet > balance) {
      setMessage('Créditos DEMO insuficientes para essa rodada.');
      return;
    }

    setSpinning(true);
    setOutcome(null);
    setMessage(turbo ? 'Turbo...' : 'Girando...');
    const startedAt = Date.now();
    const timer = window.setInterval(() => setGrid(idleGrid(config)), turbo ? 55 : 90);

    try {
      const next = await GameLauncher.spinSlot(provider, session.id, bet);
      const minimum = turbo ? 280 : 850;
      const elapsed = Date.now() - startedAt;
      if (elapsed < minimum) await new Promise((resolve) => window.setTimeout(resolve, minimum - elapsed));
      window.clearInterval(timer);
      setGrid(next.grid);
      setOutcome(next);
      await refresh();

      const special = featureMessage(next.feature);
      if (next.win > 0) {
        setMessage(`${next.result} • ${next.multiplier.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x • +${next.win.toLocaleString('pt-BR')} créditos${special ? ` • ${special}` : ''}`);
      } else {
        setMessage(special ?? 'Sem prêmio nesta rodada.');
      }
    } catch (error) {
      window.clearInterval(timer);
      setMessage(roundErrorMessage(error));
    } finally {
      window.clearInterval(timer);
      setSpinning(false);
    }
  }

  if (configQuery.isLoading) return <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-10 text-center text-sm text-slate-400">Carregando motor do slot...</div>;
  if (!config || configQuery.isError) return <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-400/5 p-8 text-center text-sm text-rose-200">Configuração do slot indisponível.</div>;

  return (
    <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 shadow-2xl shadow-black/30" style={{ background, boxShadow: `0 25px 80px -35px ${glow}` }}>
      <div className="relative overflow-hidden px-4 pb-5 pt-4 sm:px-6 sm:pt-5" style={{ backgroundImage: `radial-gradient(circle at 50% 0%, ${secondary}55, transparent 42%), linear-gradient(180deg, ${background}, #05090d)` }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${primary}, transparent)` }} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><span className="text-2xl">{game.art}</span><div><p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: primary }}>RR7 ORIGINALS</p><h2 className="text-xl font-black sm:text-2xl">{game.name}</h2></div></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300"><ShieldCheck className="h-3 w-3" /> somente DEMO</span>
            <button onClick={() => setTurbo((value) => !value)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${turbo ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-400'}`}><Zap className="h-3 w-3" /> Turbo</button>
          </div>
        </div>

        <div className="mx-auto mt-5 max-w-xl rounded-[24px] border border-white/10 bg-black/35 p-2 shadow-inner shadow-black/70 sm:p-3">
          <div className="flex items-center justify-center gap-2 rounded-[18px] border border-white/8 bg-black/35 p-2 sm:gap-3" style={{ minHeight: `${maxRows * 68 + 16}px` }}>
            {grid.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-1 flex-col justify-center gap-2">
                {column.map((symbolId, rowIndex) => {
                  const symbol = symbols.get(symbolId);
                  const winning = winningIds.has(symbolId) || Boolean(symbol?.scatter && outcome && outcome.scatterCount >= 3);
                  return <div key={`${columnIndex}-${rowIndex}`} className={`grid h-14 place-items-center rounded-xl border text-3xl transition-all duration-200 sm:h-16 sm:text-4xl ${spinning ? 'scale-95 border-white/5 bg-white/[.04] blur-[.4px]' : winning ? 'scale-[1.03] border-amber-300/60 bg-amber-300/15 shadow-lg shadow-amber-400/15' : 'border-white/10 bg-gradient-to-b from-white/[.10] to-white/[.035]'}`} style={winning ? { borderColor: primary, boxShadow: `0 0 24px ${glow}35` } : undefined} title={symbol?.label}>{symbol?.icon ?? '✦'}</div>;
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-center">
          <p className={`text-sm font-black ${outcome?.win ? 'text-amber-200' : 'text-slate-300'}`}>{message}</p>
          {outcome && <div className="mt-2 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Prêmio {outcome.win.toLocaleString('pt-BR')}</span><span>{outcome.multiplier.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x</span><span>Saldo {outcome.newBalance.toLocaleString('pt-BR')}</span></div>}
        </div>

        <div className="mx-auto mt-4 grid max-w-xl grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-2xl border border-white/8 bg-black/25 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Saldo</p><p className="mt-1 text-sm font-black" style={{ color: primary }}>{user ? balance.toLocaleString('pt-BR') : '—'} <span className="text-[9px] text-slate-500">DEMO</span></p></div>
          <button disabled={spinning || Boolean(user && !session)} onClick={() => void spin()} className="group grid h-20 w-20 place-items-center rounded-full border-4 text-slate-950 shadow-xl transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:h-24 sm:w-24" style={{ background: `linear-gradient(145deg, ${primary}, ${secondary})`, borderColor: `${primary}aa`, boxShadow: `0 10px 35px ${glow}45` }}><div className="text-center"><RotateCw className={`mx-auto h-7 w-7 sm:h-8 sm:w-8 ${spinning ? 'animate-spin' : 'transition group-hover:rotate-45'}`} /><span className="mt-1 block text-[9px] font-black uppercase tracking-wider">{spinning ? '...' : 'Girar'}</span></div></button>
          <div className="rounded-2xl border border-white/8 bg-black/25 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Aposta</p><div className="mt-1 flex items-center justify-between gap-1"><button onClick={() => adjustBet(-1)} disabled={spinning || bet === bets[0]} className="grid h-7 w-7 place-items-center rounded-lg bg-white/8 text-slate-300 disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-8 text-center text-sm font-black">{bet}</span><button onClick={() => adjustBet(1)} disabled={spinning || bet === bets[bets.length - 1]} className="grid h-7 w-7 place-items-center rounded-lg bg-white/8 text-slate-300 disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button></div></div>
        </div>

        <div className="mx-auto mt-5 max-w-xl">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><Gauge className="h-3.5 w-3.5" /> Tabela DEMO</div>
          <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">{config.symbols.map((symbol) => <div key={symbol.id} className="min-w-[78px] rounded-xl border border-white/8 bg-black/20 px-2 py-2 text-center"><div className="text-2xl">{symbol.icon}</div><p className="mt-1 truncate text-[9px] font-bold text-slate-400">{symbol.wild ? 'WILD' : symbol.scatter ? 'BÔNUS' : `${symbol.pay}x`}</p></div>)}</div>
        </div>

        <div className="mx-auto mt-4 flex max-w-xl items-start gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/5 px-3 py-2 text-[10px] leading-4 text-slate-400"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> Slot original RR7, sem dinheiro real. Arte, símbolos e matemática são próprios; a inspiração está apenas no tipo de experiência e nas mecânicas gerais.</div>
      </div>
    </section>
  );
}
