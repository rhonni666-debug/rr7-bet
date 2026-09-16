import type { CSSProperties } from 'react';
import { EclipseScene } from './EclipseScene';
import { SerpentRise } from './SerpentRise';

const particles = Array.from({ length: 32 }, (_, index) => ({
  angle: `${(360 / 32) * index}deg`,
  delay: `${(index % 8) * 0.075}s`,
}));

const dust = Array.from({ length: 18 }, (_, index) => ({
  x: `${8 + ((index * 37) % 84)}%`,
  delay: `${(index % 6) * 0.11}s`,
  scale: `${0.6 + (index % 5) * 0.17}`,
}));

const rays = Array.from({ length: 10 }, (_, index) => `${index * 36}deg`);

export function BonusIntroOverlay({ scatterCount, freeSpins = 8 }: { scatterCount: number; freeSpins?: number }) {
  return (
    <div className="bonus-intro-overlay cinematic-bonus-intro" role="presentation">
      <div className="cinematic-bonus-darken" />
      <div className="cinematic-bonus-camera-push" />
      <div className="cinematic-bonus-depth depth-far" />
      <div className="cinematic-bonus-rays" aria-hidden="true">
        {rays.map((angle) => <i key={angle} style={{ '--ray-angle': angle } as CSSProperties & Record<string, string>} />)}
      </div>
      <EclipseScene mode="bonus" />
      <div className="cinematic-serpent-backlight" />
      <div className="cinematic-bonus-ground" aria-hidden="true"><span /><span /></div>
      <SerpentRise />
      <div className="cinematic-bonus-foreground-fog fog-front-a" />
      <div className="cinematic-bonus-foreground-fog fog-front-b" />
      <div className="bonus-particles cinematic-bonus-particles" aria-hidden="true">
        {particles.map((particle, index) => (
          <i
            key={index}
            className="bonus-particle cinematic-bonus-particle"
            style={{ '--pa': particle.angle, '--pd': particle.delay } as CSSProperties & Record<string, string>}
          />
        ))}
      </div>
      <div className="cinematic-bonus-dust" aria-hidden="true">
        {dust.map((item, index) => (
          <i key={index} style={{ '--dx': item.x, '--dd': item.delay, '--ds': item.scale } as CSSProperties & Record<string, string>} />
        ))}
      </div>
      <div className="cinematic-bonus-shockwave shockwave-one" />
      <div className="cinematic-bonus-shockwave shockwave-two" />
      <div className="cinematic-bonus-copy">
        <small>RIPCOM ORIGINAL</small>
        <strong>ECLIPSE BONUS</strong>
        <em>{freeSpins} RODADAS GRÁTIS</em>
        <span>{scatterCount} SCATTERS • A SERPENTE DESPERTOU</span>
      </div>
      <div className="cinematic-bonus-lens-flare" />
      <div className="cinematic-bonus-flash" />
      <div className="cinematic-bonus-vignette" />
    </div>
  );
}
