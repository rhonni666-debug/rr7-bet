import type { CSSProperties } from 'react';

type WinTier = 'normal' | 'great' | 'big' | 'mega';

const particles = Array.from({ length: 34 }, (_, index) => ({
  angle: `${(360 / 34) * index}deg`,
  delay: `${(index % 9) * 0.035}s`,
  distance: `${24 + (index % 7) * 5}vmin`,
}));

export function classifyWin(multiplier: number): WinTier {
  if (multiplier >= 25) return 'mega';
  if (multiplier >= 10) return 'big';
  if (multiplier >= 5) return 'great';
  return 'normal';
}

export function WinCelebration({ amount, multiplier }: { amount: number; multiplier: number }) {
  const tier = classifyWin(multiplier);
  if (tier === 'normal') return null;

  const label = tier === 'mega' ? 'MEGA WIN' : tier === 'big' ? 'BIG WIN' : 'GREAT WIN';
  const subtitle = tier === 'mega' ? 'A SERPENTE DOMINOU O ECLIPSE' : tier === 'big' ? 'PODER DO ECLIPSE' : 'ENERGIA DA SERPENTE';

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
        <small>{subtitle}</small>
        <strong>{label}</strong>
        <b>+{amount.toLocaleString('pt-BR')} CR</b>
        <span>{multiplier.toFixed(2)}× A APOSTA</span>
      </div>
    </div>
  );
}
