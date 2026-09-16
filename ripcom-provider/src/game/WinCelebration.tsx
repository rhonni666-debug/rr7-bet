import type { CSSProperties } from 'react';

type WinTier = 'normal' | 'big' | 'mega';

const particles = Array.from({ length: 34 }, (_, index) => ({
  angle: `${(360 / 34) * index}deg`,
  delay: `${(index % 9) * 0.035}s`,
  distance: `${24 + (index % 7) * 5}vmin`,
}));

export function classifyWin(multiplier: number): WinTier {
  if (multiplier >= 25) return 'mega';
  if (multiplier >= 8) return 'big';
  return 'normal';
}

export function WinCelebration({ amount, multiplier }: { amount: number; multiplier: number }) {
  const tier = classifyWin(multiplier);
  if (tier === 'normal') return null;

  return (
    <div className={`win-celebration win-${tier}`} aria-hidden="true">
      <div className="win-celebration-rings"><i /><i /><i /></div>
      <div className="win-celebration-particles">
        {particles.map((particle, index) => (
          <i
            key={index}
            style={{
              '--wa': particle.angle,
              '--wd': particle.delay,
              '--wr': particle.distance,
            } as CSSProperties & Record<string, string>}
          />
        ))}
      </div>
      <div className="win-celebration-copy">
        <small>{tier === 'mega' ? 'A SERPENTE DOMINOU O ECLIPSE' : 'ENERGIA DO ECLIPSE'}</small>
        <strong>{tier === 'mega' ? 'MEGA WIN' : 'BIG WIN'}</strong>
        <b>+{amount.toLocaleString('pt-BR')} CR</b>
        <span>{multiplier.toFixed(2)}× A APOSTA</span>
      </div>
    </div>
  );
}
