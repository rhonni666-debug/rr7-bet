import { Minus, Plus, RotateCw, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type RipcomVisualSymbol = {
  id: string;
  icon: string;
  label: string;
  pay: number;
  wild?: boolean;
  scatter?: boolean;
};

export type RipcomVisualConfig = {
  layout: number[];
  symbols: RipcomVisualSymbol[];
  theme?: {
    title?: string;
    primary?: string;
    secondary?: string;
    background?: string;
    glow?: string;
    [key: string]: unknown;
  };
};

export function RipcomSlotPresentation({
  title,
  config,
  grid,
  balance,
  bet,
  bets,
  spinning,
  turbo,
  message,
  win,
  multiplier,
  winningIds,
  disabled,
  onBet,
  onSpin,
  onTurbo,
}: {
  title: string;
  config: RipcomVisualConfig;
  grid: string[][];
  balance: number | null;
  bet: number;
  bets: number[];
  spinning: boolean;
  turbo: boolean;
  message: string;
  win: number;
  multiplier: number;
  winningIds: Set<string>;
  disabled?: boolean;
  onBet: (value: number) => void;
  onSpin: () => void;
  onTurbo: () => void;
}) {
  const [intro, setIntro] = useState(true);
  const symbols = useMemo(() => new Map(config.symbols.map((symbol) => [symbol.id, symbol])), [config.symbols]);
  const primary = config.theme?.primary ?? '#8b5cf6';
  const secondary = config.theme?.secondary ?? '#06b6d4';
  const glow = config.theme?.glow ?? '#a78bfa';
  const background = config.theme?.background ?? '#070514';

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1550);
    return () => window.clearTimeout(timer);
  }, []);

  const currentBetIndex = Math.max(0, bets.indexOf(bet));
  const particles = Array.from({ length: 18 }, (_, index) => index);

  return (
    <section className="ripcom-machine" style={{ '--ripcom-primary': primary, '--ripcom-secondary': secondary, '--ripcom-glow': glow, '--ripcom-bg': background } as React.CSSProperties}>
      {intro && (
        <div className="ripcom-loader">
          <div className="ripcom-loader-orbit"><div className="ripcom-loader-core">S</div></div>
          <p className="ripcom-loader-provider">RIPCOM GAME PROVIDER</p>
          <h2>ECLIPSE SERPENT</h2>
          <p className="ripcom-loader-copy">Sincronizando motor DEMO e sessão segura</p>
          <div className="ripcom-loader-track"><span /></div>
        </div>
      )}

      <div className="ripcom-aurora" />
      <div className="ripcom-particles" aria-hidden="true">
        {particles.map((index) => <span key={index} style={{ '--i': index } as React.CSSProperties} />)}
      </div>

      <header className="ripcom-game-header">
        <div>
          <p className="ripcom-kicker">RIPCOM • ORIGINAL GAME</p>
          <h1>{title}</h1>
          <p className="ripcom-subtitle">Eclipse Protocol • Serpent Wild System</p>
        </div>
        <div className="ripcom-header-actions">
          <span className="ripcom-demo-badge"><ShieldCheck /> DEMO</span>
          <button type="button" onClick={onTurbo} className={turbo ? 'active' : ''}><Zap /> TURBO</button>
        </div>
      </header>

      <div className="ripcom-stage">
        <div className="ripcom-serpent-mark" aria-hidden="true">S</div>
        <div className="ripcom-reels-frame">
          <div className="ripcom-reels">
            {grid.map((column, columnIndex) => (
              <div key={columnIndex} className={`ripcom-reel ${spinning ? 'is-spinning' : ''}`} style={{ '--reel-delay': `${columnIndex * 85}ms` } as React.CSSProperties}>
                {column.map((symbolId, rowIndex) => {
                  const symbol = symbols.get(symbolId);
                  const winning = winningIds.has(symbolId);
                  return (
                    <div key={`${columnIndex}-${rowIndex}`} className={`ripcom-symbol ${winning && !spinning ? 'is-winning' : ''} ${symbol?.wild ? 'is-wild' : ''} ${symbol?.scatter ? 'is-scatter' : ''}`}>
                      <span className="ripcom-symbol-icon">{symbol?.icon ?? '◆'}</span>
                      <small>{symbol?.wild ? 'WILD' : symbol?.scatter ? 'ECLIPSE' : symbol?.label ?? symbolId}</small>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="ripcom-scanline" />
        </div>

        {win > 0 && !spinning && (
          <div className="ripcom-win-flash" key={`${win}-${multiplier}`}>
            <Sparkles />
            <span>WIN</span>
            <strong>+{win.toLocaleString('pt-BR')}</strong>
            <em>{multiplier.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x</em>
          </div>
        )}
      </div>

      <div className="ripcom-message"><span className={win > 0 ? 'has-win' : ''}>{message}</span></div>

      <div className="ripcom-controls">
        <div className="ripcom-stat">
          <small>SALDO DEMO</small>
          <strong>{balance === null ? '—' : balance.toLocaleString('pt-BR')}</strong>
        </div>

        <button type="button" className="ripcom-spin" onClick={onSpin} disabled={disabled || spinning}>
          <span className="ripcom-spin-ring" />
          <RotateCw className={spinning ? 'animate-spin' : ''} />
          <b>{spinning ? '...' : 'GIRAR'}</b>
        </button>

        <div className="ripcom-stat ripcom-bet">
          <small>APOSTA DEMO</small>
          <div>
            <button type="button" onClick={() => onBet(bets[Math.max(0, currentBetIndex - 1)] ?? bet)} disabled={spinning || currentBetIndex === 0}><Minus /></button>
            <strong>{bet}</strong>
            <button type="button" onClick={() => onBet(bets[Math.min(bets.length - 1, currentBetIndex + 1)] ?? bet)} disabled={spinning || currentBetIndex === bets.length - 1}><Plus /></button>
          </div>
        </div>
      </div>

      <div className="ripcom-paytable">
        {config.symbols.map((symbol) => (
          <div key={symbol.id}><span>{symbol.icon}</span><small>{symbol.wild ? 'WILD' : symbol.scatter ? 'BÔNUS' : `${symbol.pay}x`}</small></div>
        ))}
      </div>

      <footer className="ripcom-footer">RIPCOM PROVIDER • PROTECTED SESSION • FUN-MONEY ONLY</footer>
    </section>
  );
}
