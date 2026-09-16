import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, Sparkles, Volume2, VolumeX, XCircle } from 'lucide-react';
import { getPlayerState, spinPlayer, type RipcomPlayerState, type RipcomSpin, type RipcomSymbol } from '../api';
import { AnimatedAmount } from './AnimatedAmount';
import { AnimatedBackground } from './AnimatedBackground';
import { BonusIntroOverlay } from './BonusIntroOverlay';
import { BonusTeaseOverlay } from './BonusTeaseOverlay';
import { SymbolArt } from './SymbolArt';
import { eclipseAudio } from './audio';
import { classifyWin, WinCelebration } from './WinCelebration';

type GamePhase = 'idle' | 'spinning' | 'tease' | 'bonus' | 'free-spins' | 'free-spinning' | 'bonus-outro' | 'reveal';
type LineWinCue = { line: number; symbolId: string; payPerLine: number; amount: number };

const BET_VALUES = [0.5, 1, 1.5, 2, 2.5, 5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40];
const PAYLINES: Record<number, [number, number, number]> = {
  1: [1, 1, 1],
  2: [0, 0, 0],
  3: [2, 2, 2],
  4: [0, 1, 2],
  5: [2, 1, 0],
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatMultiplier(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBet(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Brand() {
  return <div className="brand"><div className="brand-mark">R</div><div><strong>RIPCOM</strong><span>ORIGINAL</span></div></div>;
}

function BetPicker({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div className={`bet-picker-stage16 ${open ? 'is-open' : ''}`}>
      <button
        className="bet-picker-trigger"
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{formatBet(value)}</strong><span>⌄</span>
      </button>
      {open && (
        <div className="bet-picker-menu" role="listbox" aria-label="Valores de aposta">
          {BET_VALUES.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option === value}
              className={option === value ? 'active' : ''}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {formatBet(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function randomGrid(state: RipcomPlayerState) {
  const ids = state.config.symbols.map((symbol) => symbol.id);
  return state.config.layout.map((rows) => Array.from({ length: rows }, () => ids[Math.floor(Math.random() * ids.length)] ?? ''));
}

function randomColumn(state: RipcomPlayerState, columnIndex: number) {
  const ids = state.config.symbols.map((symbol) => symbol.id);
  const rows = state.config.layout[columnIndex] ?? 3;
  return Array.from({ length: rows }, () => ids[Math.floor(Math.random() * ids.length)] ?? '');
}

function findTeaseColumn(result: RipcomSpin, scatterId?: string) {
  if (!scatterId || result.scatterCount < 2) return null;
  const counts = result.grid.map((column) => column.filter((symbolId) => symbolId === scatterId).length);
  if (result.scatterCount === 2) {
    const emptyColumn = counts.findIndex((count) => count === 0);
    return emptyColumn >= 0 ? emptyColumn : null;
  }
  const qualifying = counts.findIndex((count) => result.scatterCount - count >= 2 && count > 0);
  return qualifying >= 0 ? qualifying : null;
}

function BonusHud({ state }: { state: RipcomPlayerState }) {
  const session = state.session;
  const total = Math.max(8, session.freeSpinsTotal || 8);
  return (
    <div className="eclipse-bonus-hud">
      <div className="bonus-hud-label"><Sparkles size={15} /><span>ECLIPSE BONUS</span></div>
      <div className="bonus-hud-count"><strong>{session.freeSpinsRemaining}</strong><span>/ {total} FREE SPINS</span></div>
      <div className="bonus-hud-win"><small>GANHO NO BÔNUS</small><b><AnimatedAmount value={session.bonusTotalWin} duration={760} suffix=" CR" /></b></div>
    </div>
  );
}

function BonusOutro({ totalWin }: { totalWin: number }) {
  return (
    <div className="bonus-outro-overlay">
      <div className="bonus-outro-eclipse" />
      <div className="bonus-outro-card">
        <small>ECLIPSE BONUS CONCLUÍDO</small>
        <strong>8 RODADAS GRÁTIS</strong>
        <span>TOTAL GANHO</span>
        <b><AnimatedAmount value={totalWin} duration={2100} suffix=" CR" /></b>
      </div>
    </div>
  );
}

export function EclipsePlayer({ token }: { token: string }) {
  const [state, setState] = useState<RipcomPlayerState | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [outcome, setOutcome] = useState<RipcomSpin | null>(null);
  const [celebration, setCelebration] = useState<RipcomSpin | null>(null);
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [teaseColumn, setTeaseColumn] = useState<number | null>(null);
  const [bonusScatterCount, setBonusScatterCount] = useState(3);
  const [activeWinLine, setActiveWinLine] = useState<LineWinCue | null>(null);
  const [shownWinAmount, setShownWinAmount] = useState(0);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('Preparando Eclipse Serpent…');

  const symbols = useMemo(() => new Map((state?.config.symbols ?? []).map((symbol) => [symbol.id, symbol])), [state]);
  const scatterId = useMemo(() => state?.config.symbols.find((symbol) => symbol.scatter)?.id, [state]);
  const wildId = useMemo(() => state?.config.symbols.find((symbol) => symbol.wild)?.id, [state]);
  const bonusActive = Boolean(state?.session.freeSpinsRemaining && state.session.freeSpinsRemaining > 0);
  const activeLineRows = activeWinLine ? PAYLINES[activeWinLine.line] : null;

  useEffect(() => {
    eclipseAudio.setEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    let alive = true;
    const labels = ['Validando sessão…', 'Carregando matemática…', 'Despertando a serpente…', 'Alinhando sol e lua…'];
    let index = 0;
    const timer = window.setInterval(() => {
      setLoadingText(labels[index % labels.length]);
      index += 1;
    }, 680);

    getPlayerState(token)
      .then((next) => {
        if (!alive) return;
        setState(next);
        setGrid(randomGrid(next));
        if (next.session.bonusBet) setBet(next.session.bonusBet);
        if (next.session.freeSpinsRemaining > 0) setPhase('free-spins');
      })
      .catch((reason) => {
        if (alive) setError(reason instanceof Error ? reason.message : 'SESSION_LOAD_FAILED');
      })
      .finally(() => window.clearInterval(timer));

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [token]);

  function applyResult(result: RipcomSpin) {
    setState((current) => current ? {
      ...current,
      session: {
        ...current.session,
        balance: result.balance,
        freeSpinsRemaining: result.freeSpinsRemaining,
        freeSpinsTotal: result.bonusAwarded > 0 ? result.bonusAwarded : current.session.freeSpinsTotal,
        bonusBet: result.bonusBet ?? current.session.bonusBet,
        bonusTotalWin: result.bonusTotalWin,
        bonusRoundsPlayed: result.bonusRoundsPlayed,
        bonusActive: result.freeSpinsRemaining > 0,
      },
    } : current);
  }

  async function presentWinningLines(result: RipcomSpin) {
    const sequence = result.wins
      .flatMap((win) => win.lines.map((line) => ({
        line,
        symbolId: win.symbolId,
        payPerLine: win.payPerLine,
        amount: Math.round(result.bet * win.payPerLine * 100) / 100,
      })))
      .sort((a, b) => a.line - b.line);

    if (!sequence.length) {
      setShownWinAmount(result.win);
      return;
    }

    let accumulated = 0;
    for (const cue of sequence) {
      accumulated = Math.round((accumulated + cue.amount) * 100) / 100;
      setActiveWinLine(cue);
      setShownWinAmount(accumulated);
      eclipseAudio.win(cue.payPerLine);
      await sleep(900);
    }

    setActiveWinLine(null);
    setShownWinAmount(result.win);
    await sleep(260);
  }

  async function celebrateWin(result: RipcomSpin) {
    if (result.win <= 0 || result.bonusAwarded === 8) return;
    eclipseAudio.win(result.multiplier);
    const tier = classifyWin(result.multiplier);
    if (tier === 'normal') return;
    setCelebration(result);
    await sleep(tier === 'mega' ? 3600 : tier === 'big' ? 3000 : 2200);
    setCelebration(null);
  }

  async function playRound(freeSpin = false) {
    if (!state || busy) return;
    const effectiveBet = freeSpin ? (state.session.bonusBet ?? bet) : bet;
    if (!freeSpin && effectiveBet > state.session.balance) {
      setError('INSUFFICIENT_DEMO_CREDITS');
      return;
    }

    if (!freeSpin) await eclipseAudio.unlock();
    if (freeSpin) eclipseAudio.freeSpin(); else eclipseAudio.spin();

    setBusy(true);
    setError('');
    setOutcome(null);
    setCelebration(null);
    setActiveWinLine(null);
    setShownWinAmount(0);
    setTeaseColumn(null);
    setPhase(freeSpin ? 'free-spinning' : 'spinning');

    const spinTimer = window.setInterval(() => setGrid(randomGrid(state)), freeSpin ? 82 : 94);
    let teaseTimer = 0;

    try {
      const result = await spinPlayer(token, effectiveBet);
      await sleep(freeSpin ? 1100 : 1500);
      window.clearInterval(spinTimer);

      for (let columnIndex = 0; columnIndex < state.config.layout.length; columnIndex += 1) {
        setGrid((current) => current.map((column, index) => {
          if (index < columnIndex) return column;
          if (index === columnIndex) return result.grid[index] ?? column;
          return randomColumn(state, index);
        }));
        eclipseAudio.reelStop(columnIndex);
        await sleep(freeSpin ? 190 : 280);
      }

      if (!freeSpin) {
        const decisiveColumn = findTeaseColumn(result, scatterId);
        if (decisiveColumn !== null) {
          eclipseAudio.tease();
          setGrid(result.grid.map((column, columnIndex) => columnIndex === decisiveColumn ? randomColumn(state, columnIndex) : column));
          setTeaseColumn(decisiveColumn);
          setPhase('tease');
          teaseTimer = window.setInterval(() => {
            setGrid((current) => current.map((column, columnIndex) => columnIndex === decisiveColumn ? randomColumn(state, columnIndex) : column));
          }, 126);
          await sleep(result.bonusAwarded === 8 ? 3400 : 2600);
          window.clearInterval(teaseTimer);
        } else {
          await sleep(380);
        }
      } else {
        await sleep(300);
      }

      setGrid(result.grid);
      setOutcome(result);
      setTeaseColumn(null);
      applyResult(result);

      if (result.scatterCount > 0) eclipseAudio.scatterLand(result.scatterCount);
      if (wildId && result.grid.some((column) => column.includes(wildId))) eclipseAudio.wildReveal();

      if (result.bonusAwarded === 8) {
        eclipseAudio.bonusHit();
        setBonusScatterCount(result.scatterCount);
        setPhase('bonus');
        await sleep(7000);
        setPhase('free-spins');
      } else {
        if (result.win > 0) await presentWinningLines(result);
        await celebrateWin(result);
        if (result.isFreeSpin && result.freeSpinsRemaining === 0) {
          eclipseAudio.bonusComplete();
          setPhase('bonus-outro');
          await sleep(3800);
          setPhase('idle');
        } else {
          setPhase(result.freeSpinsRemaining > 0 ? 'free-spins' : 'reveal');
          await sleep(result.freeSpinsRemaining > 0 ? 1150 : 900);
          if (result.freeSpinsRemaining === 0) setPhase('idle');
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SPIN_FAILED');
      setPhase(freeSpin ? 'free-spins' : 'idle');
    } finally {
      window.clearInterval(spinTimer);
      if (teaseTimer) window.clearInterval(teaseTimer);
      setTeaseColumn(null);
      setActiveWinLine(null);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!state || busy || phase !== 'free-spins' || state.session.freeSpinsRemaining <= 0) return;
    const timer = window.setTimeout(() => void playRound(true), 1400);
    return () => window.clearTimeout(timer);
  }, [state?.session.freeSpinsRemaining, phase, busy]);

  function moveParallax(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--mx', x.toFixed(3));
    event.currentTarget.style.setProperty('--my', y.toFixed(3));
  }

  function resetParallax(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--mx', '0');
    event.currentTarget.style.setProperty('--my', '0');
  }

  async function toggleSound() {
    if (!soundOn) await eclipseAudio.unlock();
    setSoundOn((current) => !current);
  }

  if (error && !state) {
    return <div className="player-loading"><Brand /><XCircle size={46} /><h2>Sessão indisponível</h2><p>{error}</p></div>;
  }

  if (!state) {
    return <div className="player-loading"><Brand /><div className="loader-orbit"><span /></div><h2>Eclipse Serpent</h2><p>{loadingText}</p><small>RIPCOM • DEMO</small></div>;
  }

  const theme = state.config.theme;
  const visualBonusActive = bonusActive || ['bonus','free-spins','free-spinning','bonus-outro'].includes(phase);

  return (
    <main
      onPointerDown={() => void eclipseAudio.unlock()}
      onPointerMove={moveParallax}
      onPointerLeave={resetParallax}
      className={`game-player eclipse-player-v110 phase-${phase} ${visualBonusActive ? 'bonus-mode-active' : ''}`}
      style={{ '--primary': theme.primary || '#b9ff43', '--secondary': theme.secondary || '#16a085', '--game-bg': theme.background || '#061713', '--mx': '0', '--my': '0' } as React.CSSProperties & Record<string, string>}
    >
      <AnimatedBackground phase={visualBonusActive ? 'bonus' : phase} />
      {phase === 'tease' && <BonusTeaseOverlay />}
      {phase === 'bonus' && <BonusIntroOverlay scatterCount={bonusScatterCount} freeSpins={8} />}
      {phase === 'bonus-outro' && <BonusOutro totalWin={state.session.bonusTotalWin} />}
      {visualBonusActive && phase !== 'bonus' && phase !== 'bonus-outro' && <BonusHud state={state} />}
      {celebration && <WinCelebration amount={celebration.win} multiplier={celebration.multiplier} />}

      <div className="game-frame">
        <div className="game-header"><Brand /><div><button className={`sound-toggle ${soundOn ? '' : 'is-muted'}`} type="button" onClick={() => void toggleSound()} aria-label={soundOn ? 'Desativar som' : 'Ativar som'}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><span className="pill green">DEMO</span><span className="balance">{state.session.balance.toLocaleString('pt-BR')} CR</span></div></div>
        <div className="game-title"><span>RIPCOM ORIGINAL</span><h1>{state.game.name}</h1><p>{visualBonusActive ? 'ECLIPSE BONUS • 8 FREE SPINS' : '3×3 • 5 LINHAS • ECLIPSE BONUS'}</p></div>

        <div className={`reels ${busy ? 'spinning' : ''} ${visualBonusActive ? 'bonus-reels' : ''} ${activeWinLine ? 'showing-line-win' : ''}`}>
          {grid.map((column, columnIndex) => (
            <div className={`reel ${phase === 'tease' && teaseColumn === columnIndex ? 'tease-target' : ''}`} key={columnIndex} style={{ '--delay': `${columnIndex * 180}ms` } as React.CSSProperties}>
              {column.map((symbolId, rowIndex) => {
                const symbol = symbols.get(symbolId);
                const isLineWinner = Boolean(activeLineRows && activeLineRows[columnIndex] === rowIndex);
                const symbolClasses = ['symbol', isLineWinner ? 'line-win-active' : '', activeLineRows && !isLineWinner ? 'line-win-muted' : '', symbol?.scatter ? 'scatter' : '', symbol?.wild ? 'wild' : '', phase === 'tease' && teaseColumn === columnIndex ? 'tease-hidden' : ''].filter(Boolean).join(' ');
                return <div className={symbolClasses} key={`${columnIndex}-${rowIndex}`}><SymbolArt symbol={symbol} /><small>{symbol?.wild ? 'WILD' : symbol?.scatter ? 'BONUS' : symbol?.label}</small></div>;
              })}
            </div>
          ))}
          {activeWinLine && (
            <>
              <div className={`payline-trace payline-${activeWinLine.line}`} />
              <div className="line-win-value">
                <span>LINHA {activeWinLine.line}</span>
                <strong>+{formatMultiplier(activeWinLine.payPerLine)}×</strong>
                <em>+{formatBet(activeWinLine.amount)} CR</em>
              </div>
            </>
          )}
        </div>

        {outcome && outcome.win > 0 && phase !== 'bonus' && phase !== 'bonus-outro' && (
          <div className={`win-banner ${outcome.isFreeSpin ? 'bonus-win-banner' : ''}`}><span>{outcome.isFreeSpin ? 'FREE SPIN WIN' : 'WIN'}</span><strong><AnimatedAmount value={shownWinAmount} duration={520} prefix="+" suffix=" CR" /></strong><small>{formatMultiplier(outcome.multiplier)}×</small></div>
        )}

        {error && <div className="game-error">{error}</div>}

        <div className="game-controls">
          <div className="control bet-control-stage16"><small>{visualBonusActive ? 'BONUS BET' : 'BET'}</small><BetPicker value={visualBonusActive ? (state.session.bonusBet ?? bet) : bet} onChange={setBet} disabled={busy || visualBonusActive} /></div>
          <button className={`spin-button ${visualBonusActive ? 'bonus-spin-button' : ''}`} disabled={busy || visualBonusActive} onClick={() => void playRound(false)}><RefreshCw className={busy ? 'rotating' : ''} /><span>{phase === 'tease' ? 'BONUS?' : visualBonusActive ? `${state.session.freeSpinsRemaining} FREE` : busy ? 'SPINNING' : 'SPIN'}</span></button>
          <div className="control right"><small>{visualBonusActive ? 'FREE SPINS' : 'PAYOUT'}</small><b>{visualBonusActive ? `${state.session.freeSpinsRemaining}/8` : '5 LINHAS'}</b></div>
        </div>

        <div className="game-footer"><ShieldCheck size={13} /><span>RIPCOM Provider Runtime • Fun-money only</span></div>
      </div>
    </main>
  );
}
