import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck, Sparkles, Volume2, VolumeX, XCircle } from 'lucide-react';
import { getPlayerState, spinPlayer, type RipcomPlayerState, type RipcomSpin } from '../api';
import { AnimatedBackground } from './AnimatedBackground';
import { BonusIntroOverlay } from './BonusIntroOverlay';
import { BonusTeaseOverlay } from './BonusTeaseOverlay';
import { eclipseAudio } from './game-audio';

type GamePhase = 'idle' | 'spinning' | 'tease' | 'bonus' | 'reveal' | 'free-spinning' | 'bonus-outro';
type WinTier = { label: string; win: number; multiplier: number; level: 'great' | 'big' | 'mega' };

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function Brand() {
  return <div className="brand"><div className="brand-mark">R</div><div><strong>RIPCOM</strong><span>ORIGINAL</span></div></div>;
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
    const empty = counts.findIndex((count) => count === 0);
    return empty >= 0 ? empty : null;
  }
  const qualifying = counts.findIndex((count) => result.scatterCount - count >= 2 && count > 0);
  return qualifying >= 0 ? qualifying : null;
}

function classifyWin(result: RipcomSpin): WinTier | null {
  if (result.win <= 0) return null;
  if (result.multiplier >= 25) return { label: 'MEGA WIN', win: result.win, multiplier: result.multiplier, level: 'mega' };
  if (result.multiplier >= 10) return { label: 'BIG WIN', win: result.win, multiplier: result.multiplier, level: 'big' };
  if (result.multiplier >= 5) return { label: 'GREAT WIN', win: result.win, multiplier: result.multiplier, level: 'great' };
  return null;
}

function WinCelebration({ tier }: { tier: WinTier }) {
  const sparks = Array.from({ length: tier.level === 'mega' ? 30 : tier.level === 'big' ? 22 : 14 });
  return <div className={`premium-win-overlay premium-win-${tier.level}`}>
    <div className="premium-win-rays" />
    <div className="premium-win-sparks">{sparks.map((_, index) => <i key={index} style={{ '--i': index } as React.CSSProperties & Record<string, number>} />)}</div>
    <div className="premium-win-card">
      <small>RIPCOM • ECLIPSE SERPENT</small>
      <strong>{tier.label}</strong>
      <b>+{tier.win.toLocaleString('pt-BR')} CR</b>
      <span>{tier.multiplier.toFixed(2)}×</span>
    </div>
  </div>;
}

function BonusHud({ remaining, total, totalWin }: { remaining: number; total: number; totalWin: number }) {
  return <div className="eclipse-bonus-hud">
    <div className="bonus-hud-label"><Sparkles size={15} /> ECLIPSE BONUS</div>
    <div className="bonus-hud-count"><strong>{remaining}</strong><span>DE {total} GRÁTIS</span></div>
    <div className="bonus-hud-win"><small>GANHO NO BÔNUS</small><b>{totalWin.toLocaleString('pt-BR')} CR</b></div>
  </div>;
}

function BonusOutro({ totalWin }: { totalWin: number }) {
  return <div className="bonus-outro-overlay">
    <div className="bonus-outro-eclipse" />
    <div className="bonus-outro-card">
      <small>8 RODADAS GRÁTIS CONCLUÍDAS</small>
      <strong>ECLIPSE BONUS</strong>
      <span>TOTAL GANHO</span>
      <b>{totalWin.toLocaleString('pt-BR')} CR</b>
    </div>
  </div>;
}

export function EnhancedPlayer({ token }: { token: string }) {
  const [state, setState] = useState<RipcomPlayerState | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [outcome, setOutcome] = useState<RipcomSpin | null>(null);
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [teaseColumn, setTeaseColumn] = useState<number | null>(null);
  const [bonusScatterCount, setBonusScatterCount] = useState(3);
  const [bonusMode, setBonusMode] = useState(false);
  const [bonusRemaining, setBonusRemaining] = useState(0);
  const [bonusTotal, setBonusTotal] = useState(8);
  const [bonusTotalWin, setBonusTotalWin] = useState(0);
  const [winTier, setWinTier] = useState<WinTier | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('INICIANDO RUNTIME RIPCOM…');
  const bonusRunner = useRef(false);
  const alive = useRef(true);

  const symbols = useMemo(() => new Map((state?.config.symbols ?? []).map((symbol) => [symbol.id, symbol])), [state]);
  const winning = useMemo(() => new Set(outcome?.wins.map((win) => win.symbolId) ?? []), [outcome]);
  const scatterId = useMemo(() => state?.config.symbols.find((symbol) => symbol.scatter)?.id, [state]);

  useEffect(() => {
    alive.current = true;
    const labels = ['AUTENTICANDO SESSÃO…', 'CARREGANDO MATEMÁTICA…', 'SINCRONIZANDO JOGADOR…', 'PREPARANDO ECLIPSE SERPENT…'];
    let index = 0;
    const timer = window.setInterval(() => { setLoadingText(labels[index % labels.length]); index += 1; }, 520);
    getPlayerState(token).then((next) => {
      if (!alive.current) return;
      setState(next);
      setGrid(randomGrid(next));
      setBonusRemaining(next.session.freeSpinsRemaining);
      setBonusTotal(next.session.freeSpinsTotal || 8);
      setBonusTotalWin(next.session.bonusTotalWin);
      setBonusMode(next.session.bonusActive);
      if (next.session.bonusBet) setBet(next.session.bonusBet);
    }).catch((reason) => {
      if (alive.current) setError(reason instanceof Error ? reason.message : 'SESSION_LOAD_FAILED');
    }).finally(() => window.clearInterval(timer));
    return () => { alive.current = false; window.clearInterval(timer); };
  }, [token]);

  useEffect(() => {
    if (state?.session.bonusActive && !busy && !bonusRunner.current) void runFreeSpins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.session.bonusActive, busy]);

  function applyResult(result: RipcomSpin) {
    setGrid(result.grid);
    setOutcome(result);
    setBonusRemaining(result.freeSpinsRemaining);
    setBonusTotalWin(result.bonusTotalWin);
    setState((current) => current ? {
      ...current,
      session: {
        ...current.session,
        balance: result.balance,
        freeSpinsRemaining: result.freeSpinsRemaining,
        freeSpinsTotal: Math.max(current.session.freeSpinsTotal, result.bonusAwarded || 0, 8),
        bonusBet: result.bonusBet,
        bonusTotalWin: result.bonusTotalWin,
        bonusRoundsPlayed: result.bonusRoundsPlayed,
        bonusActive: result.freeSpinsRemaining > 0,
      },
    } : current);
  }

  async function showResultCelebration(result: RipcomSpin) {
    if (result.win <= 0) return;
    eclipseAudio.win(result.multiplier);
    const tier = classifyWin(result);
    if (!tier) {
      await sleep(420);
      return;
    }
    setWinTier(tier);
    await sleep(tier.level === 'mega' ? 2100 : tier.level === 'big' ? 1650 : 1200);
    if (alive.current) setWinTier(null);
  }

  async function normalSpin() {
    if (!state || busy || bonusMode || state.session.bonusActive) return;
    if (bet > state.session.balance) { setError('CRÉDITOS DEMO INSUFICIENTES'); return; }
    await eclipseAudio.unlock();
    eclipseAudio.spin();
    setBusy(true);
    setPhase('spinning');
    setError('');
    setOutcome(null);
    setWinTier(null);
    setTeaseColumn(null);

    const spinTimer = window.setInterval(() => setGrid(randomGrid(state)), 70);
    let teaseTimer = 0;
    let bonusActivated = false;
    try {
      const result = await spinPlayer(token, bet);
      await sleep(520);
      window.clearInterval(spinTimer);
      eclipseAudio.reelStop(0);
      await sleep(80);
      eclipseAudio.reelStop(1);
      await sleep(80);
      eclipseAudio.reelStop(2);

      const decisiveColumn = findTeaseColumn(result, scatterId);
      if (decisiveColumn !== null) {
        setGrid(result.grid.map((column, columnIndex) => columnIndex === decisiveColumn ? randomColumn(state, columnIndex) : column));
        setTeaseColumn(decisiveColumn);
        setPhase('tease');
        eclipseAudio.tease();
        teaseTimer = window.setInterval(() => {
          setGrid((current) => current.map((column, columnIndex) => columnIndex === decisiveColumn ? randomColumn(state, columnIndex) : column));
        }, 90);
        await sleep(result.bonusAwarded > 0 ? 1650 : 1250);
        window.clearInterval(teaseTimer);
      }

      applyResult(result);
      setTeaseColumn(null);

      if (result.bonusAwarded > 0) {
        bonusActivated = true;
        setBonusMode(true);
        setBonusTotal(result.bonusAwarded);
        setBonusRemaining(result.freeSpinsRemaining);
        setBonusScatterCount(result.scatterCount);
        setPhase('bonus');
        eclipseAudio.bonusTrigger();
        await sleep(4300);
        setPhase('reveal');
        await sleep(300);
      } else {
        setPhase('reveal');
        await showResultCelebration(result);
        await sleep(260);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SPIN_FAILED');
    } finally {
      window.clearInterval(spinTimer);
      if (teaseTimer) window.clearInterval(teaseTimer);
      setTeaseColumn(null);
      setBusy(false);
      if (!bonusActivated) setPhase('idle');
    }
  }

  async function runFreeSpins() {
    if (!state || bonusRunner.current) return;
    const storedBet = state.session.bonusBet ?? bet;
    let remaining = state.session.freeSpinsRemaining;
    if (remaining <= 0) return;

    bonusRunner.current = true;
    setBusy(true);
    setBonusMode(true);
    setBonusRemaining(remaining);
    setBonusTotal(state.session.freeSpinsTotal || 8);
    setBonusTotalWin(state.session.bonusTotalWin);

    try {
      while (remaining > 0 && alive.current) {
        setPhase('free-spinning');
        setOutcome(null);
        setWinTier(null);
        eclipseAudio.freeSpin((state.session.freeSpinsTotal || 8) - remaining + 1);
        const timer = window.setInterval(() => setGrid(randomGrid(state)), 68);
        let result: RipcomSpin;
        try {
          result = await spinPlayer(token, storedBet);
          await sleep(650);
        } finally {
          window.clearInterval(timer);
        }

        applyResult(result);
        remaining = result.freeSpinsRemaining;
        setPhase('reveal');
        await showResultCelebration(result);
        await sleep(result.win > 0 ? 520 : 340);
      }

      if (alive.current) {
        const fresh = await getPlayerState(token);
        setState(fresh);
        setBonusRemaining(0);
        setBonusTotalWin(fresh.session.bonusTotalWin);
        setPhase('bonus-outro');
        eclipseAudio.bonusOutro();
        await sleep(2900);
        setBonusMode(false);
        setPhase('idle');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'BONUS_SPIN_FAILED');
      const fresh = await getPlayerState(token).catch(() => null);
      if (fresh) {
        setState(fresh);
        setBonusRemaining(fresh.session.freeSpinsRemaining);
        setBonusTotalWin(fresh.session.bonusTotalWin);
        setBonusMode(fresh.session.bonusActive);
      }
      setPhase('idle');
    } finally {
      bonusRunner.current = false;
      setBusy(false);
    }
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    eclipseAudio.setMuted(next);
    if (!next) void eclipseAudio.unlock();
  }

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

  if (error && !state) return <div className="player-loading"><Brand /><XCircle size={46} /><h2>Sessão indisponível</h2><p>{error}</p></div>;
  if (!state) return <div className="player-loading"><Brand /><div className="loader-orbit"><span /></div><h2>Eclipse Serpent</h2><p>{loadingText}</p><small>RIPCOM • DEMO</small></div>;

  const theme = state.config.theme;
  const activeBonus = bonusMode || state.session.bonusActive;
  const phaseForBackground = activeBonus && phase !== 'tease' ? 'bonus' : phase;

  return <main
    onPointerMove={moveParallax}
    onPointerLeave={resetParallax}
    className={`game-player eclipse-player-v110 phase-${phase} ${activeBonus ? 'bonus-mode-active' : ''}`}
    style={{ '--primary': theme.primary || '#b9ff43', '--secondary': theme.secondary || '#16a085', '--game-bg': theme.background || '#061713', '--mx': '0', '--my': '0' } as React.CSSProperties & Record<string, string>}
  >
    <AnimatedBackground phase={phaseForBackground} />
    {phase === 'tease' && <BonusTeaseOverlay />}
    {phase === 'bonus' && <BonusIntroOverlay scatterCount={bonusScatterCount} />}
    {activeBonus && phase !== 'bonus' && phase !== 'bonus-outro' && <BonusHud remaining={bonusRemaining} total={bonusTotal} totalWin={bonusTotalWin} />}
    {phase === 'bonus-outro' && <BonusOutro totalWin={bonusTotalWin} />}
    {winTier && <WinCelebration tier={winTier} />}

    <div className="game-backdrop"><div className="game-orb one" /><div className="game-orb two" /></div>
    <div className="game-frame">
      <div className="game-header">
        <Brand />
        <div className="game-header-actions">
          <button className="sound-toggle" type="button" onClick={toggleSound} aria-label={muted ? 'Ativar som' : 'Silenciar som'}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
          <span className="pill green">DEMO</span>
          <span className="balance">{state.session.balance.toLocaleString('pt-BR')} CR</span>
        </div>
      </div>

      <div className="game-title">
        <span>{activeBonus ? 'ECLIPSE BONUS ATIVO' : 'RIPCOM ORIGINAL'}</span>
        <h1>{state.game.name}</h1>
        <p>{activeBonus ? '8 FREE SPINS • ECLIPSE DESPERTO' : 'ECLIPSE WILD • RESPINS • 8 FREE SPINS'}</p>
      </div>

      <div className={`reels ${busy ? 'spinning' : ''} ${activeBonus ? 'bonus-reels' : ''}`}>
        {grid.map((column, columnIndex) => <div
          className={`reel ${phase === 'tease' && teaseColumn === columnIndex ? 'tease-target' : ''}`}
          key={columnIndex}
          style={{ '--delay': `${columnIndex * 90}ms` } as React.CSSProperties}
        >
          {column.map((symbolId, rowIndex) => {
            const symbol = symbols.get(symbolId);
            const isWinner = winning.has(symbolId);
            const classes = ['symbol', isWinner ? 'winner' : '', symbol?.scatter ? 'scatter' : '', symbol?.wild ? 'wild' : '', phase === 'tease' && teaseColumn === columnIndex ? 'tease-hidden' : ''].filter(Boolean).join(' ');
            return <div className={classes} key={`${columnIndex}-${rowIndex}`}><span>{symbol?.icon ?? '✦'}</span><small>{symbol?.wild ? 'WILD' : symbol?.scatter ? 'BONUS' : symbol?.label}</small></div>;
          })}
        </div>)}
      </div>

      {outcome && outcome.win > 0 && !winTier && phase !== 'bonus' && <div className={`win-banner ${activeBonus ? 'bonus-win-banner' : ''}`}><span>{outcome.isFreeSpin ? 'FREE SPIN WIN' : 'WIN'}</span><strong>+{outcome.win.toLocaleString('pt-BR')} CR</strong><small>{outcome.multiplier.toFixed(2)}×</small></div>}
      {error && <div className="game-error">{error}</div>}

      <div className="game-controls">
        <div className="control"><small>BET</small><select value={bet} onChange={(event) => setBet(Number(event.target.value))} disabled={busy || activeBonus}>{[1, 2, 5, 10, 20, 50, 100].map((value) => <option key={value}>{value}</option>)}</select></div>
        <button className={`spin-button ${activeBonus ? 'bonus-spin-button' : ''}`} disabled={busy || activeBonus} onPointerDown={() => void eclipseAudio.unlock()} onClick={() => void normalSpin()}><RefreshCw className={busy ? 'rotating' : ''} /><span>{phase === 'tease' ? 'BONUS?' : phase === 'bonus' ? 'ECLIPSE!' : phase === 'free-spinning' ? `${bonusRemaining} GRÁTIS` : busy ? 'SPINNING' : 'SPIN'}</span></button>
        <div className="control right"><small>{activeBonus ? 'FREE SPINS' : 'SESSION'}</small><b>{activeBonus ? `${bonusRemaining}/${bonusTotal}` : token.slice(0, 6)}</b></div>
      </div>
      <div className="game-footer"><ShieldCheck size={13} /><span>RIPCOM Provider Runtime • Fun-money only</span></div>
    </div>
  </main>;
}
