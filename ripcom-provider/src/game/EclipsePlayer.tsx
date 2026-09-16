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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatMultiplier(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Brand() {
  return <div className="brand"><div className="brand-mark">R</div><div><strong>RIPCOM</strong><span>ORIGINAL</span></div></div>;
}

function formatSymbolPay(symbol?: RipcomSymbol) {
  if (!symbol) return '';
  if (symbol.scatter) return 'BONUS';
  const value = Number(symbol.pay);
  if (!Number.isFinite(value)) return '';
  return `${formatMultiplier(value)}×`;
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
      <div className="bonus-hud-win"><small>GANHO NO BÔNUS</small><b><AnimatedAmount value={session.bonusTotalWin} duration={720} suffix=" CR" /></b></div>
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
        <b><AnimatedAmount value={totalWin} duration={1900} suffix=" CR" /></b>
      </div>
    </div>
  );
}

function WinWaysBreakdown({ outcome, symbols }: { outcome: RipcomSpin; symbols: ReadonlyMap<string, RipcomSymbol> }) {
  if (!outcome.wins.length) return null;
  return (
    <div className="win-ways-breakdown" aria-label="Detalhamento das linhas vencedoras">
      {outcome.wins.map((win) => {
        const symbol = symbols.get(win.symbolId);
        const amount = Math.round(outcome.bet * win.multiplier * 100) / 100;
        return (
          <div className="win-way-row" key={win.symbolId}>
            <span>{symbol?.wild ? 'WILD' : symbol?.label ?? win.symbolId}</span>
            <strong>{formatMultiplier(win.payPerWay)}× × {win.ways} {win.ways === 1 ? 'LINHA' : 'LINHAS'} = {formatMultiplier(win.multiplier)}×</strong>
            <em>{amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CR</em>
          </div>
        );
      })}
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
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('Preparando Eclipse Serpent…');

  const symbols = useMemo(() => new Map((state?.config.symbols ?? []).map((symbol) => [symbol.id, symbol])), [state]);
  const winning = useMemo(() => new Set(outcome?.wins.map((win) => win.symbolId) ?? []), [outcome]);
  const scatterId = useMemo(() => state?.config.symbols.find((symbol) => symbol.scatter)?.id, [state]);
  const wildId = useMemo(() => state?.config.symbols.find((symbol) => symbol.wild)?.id, [state]);
  const bonusActive = Boolean(state?.session.freeSpinsRemaining && state.session.freeSpinsRemaining > 0);

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
    }, 650);

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

  async function celebrateWin(result: RipcomSpin) {
    if (result.win <= 0 || result.bonusAwarded === 8) return;
    eclipseAudio.win(result.multiplier);
    const tier = classifyWin(result.multiplier);
    if (tier === 'normal') return;
    setCelebration(result);
    await sleep(tier === 'mega' ? 3400 : tier === 'big' ? 2800 : 2100);
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
    setTeaseColumn(null);
    setPhase(freeSpin ? 'free-spinning' : 'spinning');

    const spinTimer = window.setInterval(() => setGrid(randomGrid(state)), freeSpin ? 78 : 88);
    let teaseTimer = 0;

    try {
      const result = await spinPlayer(token, effectiveBet);
      await sleep(freeSpin ? 900 : 1200);
      window.clearInterval(spinTimer);

      for (let columnIndex = 0; columnIndex < state.config.layout.length; columnIndex += 1) {
        setGrid((current) => current.map((column, index) => {
          if (index < columnIndex) return column;
          if (index === columnIndex) return result.grid[index] ?? column;
          return randomColumn(state, index);
        }));
        eclipseAudio.reelStop(columnIndex);
        await sleep(freeSpin ? 150 : 220);
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
          }, 118);
          await sleep(result.bonusAwarded === 8 ? 3000 : 2200);
          window.clearInterval(teaseTimer);
        } else {
          await sleep(320);
        }
      } else {
        await sleep(250);
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
        await sleep(6500);
        setPhase('free-spins');
      } else {
        await celebrateWin(result);
        if (result.isFreeSpin && result.freeSpinsRemaining === 0) {
          eclipseAudio.bonusComplete();
          setPhase('bonus-outro');
          await sleep(3600);
          setPhase('idle');
        } else {
          setPhase(result.freeSpinsRemaining > 0 ? 'free-spins' : 'reveal');
          await sleep(result.freeSpinsRemaining > 0 ? 1050 : 850);
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
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!state || busy || phase !== 'free-spins' || state.session.freeSpinsRemaining <= 0) return;
    const timer = window.setTimeout(() => void playRound(true), 1250);
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
        <div className="game-title"><span>RIPCOM ORIGINAL</span><h1>{state.game.name}</h1><p>{visualBonusActive ? 'ECLIPSE BONUS • 8 FREE SPINS' : '3 ROLOS • WAYS AGREGADAS • ECLIPSE BONUS'}</p></div>

        <div className={`reels ${busy ? 'spinning' : ''} ${visualBonusActive ? 'bonus-reels' : ''}`}>
          {grid.map((column, columnIndex) => (
            <div className={`reel ${phase === 'tease' && teaseColumn === columnIndex ? 'tease-target' : ''}`} key={columnIndex} style={{ '--delay': `${columnIndex * 160}ms` } as React.CSSProperties}>
              {column.map((symbolId, rowIndex) => {
                const symbol = symbols.get(symbolId);
                const isWinner = winning.has(symbolId);
                const symbolClasses = ['symbol', isWinner ? 'winner' : '', symbol?.scatter ? 'scatter' : '', symbol?.wild ? 'wild' : '', phase === 'tease' && teaseColumn === columnIndex ? 'tease-hidden' : ''].filter(Boolean).join(' ');
                return <div className={symbolClasses} key={`${columnIndex}-${rowIndex}`}><SymbolArt symbol={symbol} /><span className={`symbol-pay-value ${symbol?.scatter ? 'is-bonus' : ''}`}>{formatSymbolPay(symbol)}</span><small>{symbol?.wild ? 'WILD' : symbol?.scatter ? 'BONUS' : symbol?.label}</small></div>;
              })}
            </div>
          ))}
        </div>

        {outcome && outcome.win > 0 && phase !== 'bonus' && phase !== 'bonus-outro' && (
          <>
            <div className={`win-banner ${outcome.isFreeSpin ? 'bonus-win-banner' : ''}`}><span>{outcome.isFreeSpin ? 'FREE SPIN WIN' : 'WIN'}</span><strong><AnimatedAmount value={outcome.win} duration={900} prefix="+" suffix=" CR" /></strong><small>{formatMultiplier(outcome.multiplier)}×</small></div>
            <WinWaysBreakdown outcome={outcome} symbols={symbols} />
          </>
        )}

        {error && <div className="game-error">{error}</div>}

        <div className="game-controls">
          <div className="control"><small>{visualBonusActive ? 'BONUS BET' : 'BET'}</small><select value={visualBonusActive ? (state.session.bonusBet ?? bet) : bet} onChange={(event) => setBet(Number(event.target.value))} disabled={busy || visualBonusActive}>{[1,2,5,10,20,50,100].map((value) => <option key={value}>{value}</option>)}</select></div>
          <button className={`spin-button ${visualBonusActive ? 'bonus-spin-button' : ''}`} disabled={busy || visualBonusActive} onClick={() => void playRound(false)}><RefreshCw className={busy ? 'rotating' : ''} /><span>{phase === 'tease' ? 'BONUS?' : visualBonusActive ? `${state.session.freeSpinsRemaining} FREE` : busy ? 'SPINNING' : 'SPIN'}</span></button>
          <div className="control right"><small>{visualBonusActive ? 'FREE SPINS' : 'PAYOUT'}</small><b>{visualBonusActive ? `${state.session.freeSpinsRemaining}/8` : 'WAYS'}</b></div>
        </div>

        <div className="game-footer"><ShieldCheck size={13} /><span>RIPCOM Provider Runtime • Fun-money only</span></div>
      </div>
    </main>
  );
}
