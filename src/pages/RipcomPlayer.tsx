import { useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { RipcomSlotPresentation } from '../components/RipcomSlotPresentation';
import { RipcomPublicPlayer, type RipcomPlayerSpin, type RipcomPlayerState } from '../lib/ripcom-public-player';

const bets = [1, 2, 5, 10, 20, 50, 100];

function randomGrid(state: RipcomPlayerState) {
  const ids = state.config.symbols.map((symbol) => symbol.id);
  return state.config.layout.map((rows) => Array.from({ length: rows }, () => ids[Math.floor(Math.random() * ids.length)] ?? ''));
}

function featureMessage(feature: Record<string, unknown>) {
  if (!feature.active) return null;
  return `ECLIPSE WILD • ${String(feature.selectedIcon ?? '◆')} selecionado • ${Number(feature.respins ?? 0)} respin(s)`;
}

export function RipcomPlayerPage() {
  const { token } = useParams({ from: '/ripcom/play/$token' });
  const [state, setState] = useState<RipcomPlayerState | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [bet, setBet] = useState(5);
  const [turbo, setTurbo] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<RipcomPlayerSpin | null>(null);
  const [message, setMessage] = useState('Carregando sessão RIPCOM...');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void RipcomPublicPlayer.state(token)
      .then((next) => {
        if (!active) return;
        setState(next);
        setGrid(randomGrid(next));
        setMessage('Sessão B2B validada. Toque em GIRAR.');
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'SESSION_LOAD_FAILED');
      });
    return () => { active = false; };
  }, [token]);

  const winningIds = useMemo(() => new Set(outcome?.wins.map((item) => item.symbolId) ?? []), [outcome?.wins]);

  async function spin() {
    if (!state || spinning) return;
    if (bet > state.session.balance) {
      setMessage('Saldo DEMO insuficiente.');
      return;
    }

    setSpinning(true);
    setOutcome(null);
    setMessage(turbo ? 'Eclipse Turbo...' : 'Sincronizando os rolos RIPCOM...');
    const timer = window.setInterval(() => setGrid(randomGrid(state)), turbo ? 50 : 78);
    const started = Date.now();

    try {
      const next = await RipcomPublicPlayer.spin(token, bet);
      const minimum = turbo ? 320 : 1150;
      const elapsed = Date.now() - started;
      if (elapsed < minimum) await new Promise((resolve) => window.setTimeout(resolve, minimum - elapsed));
      window.clearInterval(timer);
      setGrid(next.grid);
      setOutcome(next);
      setState((current) => current ? { ...current, session: { ...current.session, balance: next.balance } } : current);
      const special = featureMessage(next.feature);
      setMessage(next.win > 0
        ? `ECLIPSE WIN • +${next.win.toLocaleString('pt-BR')} • ${next.multiplier.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x${special ? ` • ${special}` : ''}`
        : special ?? 'Nenhuma combinação. Próximo giro pronto.');
    } catch (reason) {
      window.clearInterval(timer);
      setMessage(reason instanceof Error ? reason.message : 'SPIN_FAILED');
    } finally {
      window.clearInterval(timer);
      setSpinning(false);
    }
  }

  if (error) {
    return <div className="grid min-h-dvh place-items-center bg-[#03040a] p-6 text-center"><div><p className="text-xs font-black uppercase tracking-[.25em] text-violet-300">RIPCOM PROVIDER</p><h1 className="mt-3 text-2xl font-black">Sessão indisponível</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></div>;
  }

  if (!state) {
    return <div className="grid min-h-dvh place-items-center bg-[#03040a] text-sm font-black uppercase tracking-[.2em] text-violet-200">Inicializando RIPCOM...</div>;
  }

  return (
    <div className="min-h-dvh bg-[#03040a] px-3 py-4 sm:px-5 sm:py-6">
      <RipcomSlotPresentation
        title={state.game.name}
        config={state.config}
        grid={grid}
        balance={state.session.balance}
        bet={bet}
        bets={bets}
        spinning={spinning}
        turbo={turbo}
        message={message}
        win={outcome?.win ?? 0}
        multiplier={outcome?.multiplier ?? 0}
        winningIds={winningIds}
        onBet={setBet}
        onSpin={() => void spin()}
        onTurbo={() => setTurbo((value) => !value)}
      />
    </div>
  );
}
