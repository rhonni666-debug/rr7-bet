import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { useDemo } from '../lib/demo-store';
import { GameLauncher } from '../lib/game-launcher';
import { roundErrorMessage } from '../lib/game-errors';
import { useSlotConfig } from '../lib/slot-config';
import type { DemoGame, GameSession, Provider, SlotConfig, SlotSpinOutcome } from '../types';
import { RipcomSlotPresentation } from './RipcomSlotPresentation';

const bets = [1, 2, 5, 10, 20, 50, 100];

function randomGrid(config: SlotConfig) {
  const ids = config.symbols.map((symbol) => symbol.id);
  return config.layout.map((rows) => Array.from({ length: rows }, () => ids[Math.floor(Math.random() * ids.length)] ?? ''));
}

function featureMessage(feature: Record<string, unknown>) {
  if (!feature.active) return null;
  if (String(feature.kind ?? '') === 'SNAKE_WILD') {
    return `ECLIPSE WILD • ${String(feature.selectedIcon ?? '◆')} selecionado • ${Number(feature.respins ?? 0)} respin(s)`;
  }
  return 'PROTOCOLO ECLIPSE ATIVADO';
}

export function RipcomInternalSlot({ game, provider, session }: { game: DemoGame; provider: Provider; session: GameSession | null }) {
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
  const [message, setMessage] = useState('Toque em GIRAR para iniciar o protocolo Eclipse.');

  useEffect(() => {
    if (config) setGrid(randomGrid(config));
  }, [config?.gameId, config?.version]);

  const winningIds = useMemo(() => new Set(outcome?.wins.map((item) => item.symbolId) ?? []), [outcome?.wins]);

  async function spin() {
    if (!user) {
      void navigate({ to: '/auth' });
      return;
    }
    if (!config || !session) {
      setMessage('A sessão RIPCOM ainda está sendo preparada.');
      return;
    }
    if (bet > balance) {
      setMessage('Créditos DEMO insuficientes.');
      return;
    }

    setSpinning(true);
    setOutcome(null);
    setMessage(turbo ? 'Eclipse Turbo...' : 'Sincronizando os rolos...');
    const started = Date.now();
    const timer = window.setInterval(() => setGrid(randomGrid(config)), turbo ? 52 : 78);

    try {
      const next = await GameLauncher.spinSlot(provider, session.id, bet);
      const minimum = turbo ? 330 : 1150;
      const elapsed = Date.now() - started;
      if (elapsed < minimum) await new Promise((resolve) => window.setTimeout(resolve, minimum - elapsed));
      window.clearInterval(timer);
      setGrid(next.grid);
      setOutcome(next);
      await refresh();
      const feature = featureMessage(next.feature);
      setMessage(next.win > 0
        ? `ECLIPSE WIN • +${next.win.toLocaleString('pt-BR')} • ${next.multiplier.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x${feature ? ` • ${feature}` : ''}`
        : feature ?? 'A serpente recuou. Próximo giro pronto.');
    } catch (error) {
      window.clearInterval(timer);
      setMessage(roundErrorMessage(error));
    } finally {
      window.clearInterval(timer);
      setSpinning(false);
    }
  }

  if (configQuery.isLoading) return <div className="mt-5 rounded-3xl border border-violet-400/15 bg-violet-400/5 p-12 text-center text-sm text-violet-200">Inicializando RIPCOM Runtime...</div>;
  if (!config || configQuery.isError) return <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-400/5 p-8 text-center text-sm text-rose-200">Configuração RIPCOM indisponível.</div>;

  return (
    <div className="mt-5">
      <RipcomSlotPresentation
        title={game.name}
        config={config}
        grid={grid}
        balance={user ? balance : null}
        bet={bet}
        bets={bets}
        spinning={spinning}
        turbo={turbo}
        message={message}
        win={outcome?.win ?? 0}
        multiplier={outcome?.multiplier ?? 0}
        winningIds={winningIds}
        disabled={Boolean(user && !session)}
        onBet={setBet}
        onSpin={() => void spin()}
        onTurbo={() => setTurbo((value) => !value)}
      />
    </div>
  );
}
