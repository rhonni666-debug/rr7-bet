import type { CSSProperties } from 'react';
import { EclipseScene } from './EclipseScene';
import { SerpentRise } from './SerpentRise';

const particles = Array.from({ length: 28 }, (_, index) => ({
  angle: `${(360 / 28) * index}deg`,
  delay: `${(index % 7) * 0.08}s`,
}));

export function BonusIntroOverlay({ scatterCount }: { scatterCount: number }) {
  return (
    <div className="bonus-intro-overlay cinematic-bonus-intro" role="presentation">
      <div className="cinematic-bonus-darken" />
      <EclipseScene mode="bonus" />
      <SerpentRise />
      <div className="bonus-particles cinematic-bonus-particles" aria-hidden="true">
        {particles.map((particle, index) => (
          <i
            key={index}
            className="bonus-particle cinematic-bonus-particle"
            style={{ '--pa': particle.angle, '--pd': particle.delay } as CSSProperties & Record<string, string>}
          />
        ))}
      </div>
      <div className="cinematic-bonus-copy">
        <small>RIPCOM ORIGINAL</small>
        <strong>ECLIPSE BONUS</strong>
        <span>{scatterCount} SCATTERS • A SERPENTE DESPERTOU</span>
      </div>
      <div className="cinematic-bonus-flash" />
    </div>
  );
}
