import type { CSSProperties } from 'react';
import { EclipseScene } from './EclipseScene';

type AnimatedBackgroundProps = {
  phase: string;
};

const particles = Array.from({ length: 24 }, (_, index) => ({
  left: `${5 + ((index * 37) % 90)}%`,
  delay: `${-(index % 8) * 0.7}s`,
  duration: `${6 + (index % 5) * 1.3}s`,
  size: `${2 + (index % 4)}px`,
}));

export function AnimatedBackground({ phase }: AnimatedBackgroundProps) {
  const eclipseMode = phase === 'bonus' ? 'bonus' : phase === 'tease' ? 'tease' : 'ambient';

  return (
    <div className={`eclipse-scene animated-background animated-background-${phase}`} aria-hidden="true">
      <div className="bg-parallax bg-layer-far" />
      <div className="bg-parallax bg-layer-mid" />
      <div className="bg-parallax bg-layer-near" />
      <EclipseScene mode={eclipseMode} />
      <div className="rune-ring cinematic-rune-ring" />
      <div className="fog cinematic-fog fog-one" />
      <div className="fog cinematic-fog fog-two" />
      <div className="ambient-glow glow-left" />
      <div className="ambient-glow glow-right" />
      <div className="ember-field cinematic-embers">
        {particles.map((particle, index) => (
          <i
            key={index}
            className="ember cinematic-ember"
            style={{
              '--x': particle.left,
              '--delay': particle.delay,
              '--d': particle.duration,
              '--s': particle.size,
            } as CSSProperties & Record<string, string>}
          />
        ))}
      </div>
    </div>
  );
}
