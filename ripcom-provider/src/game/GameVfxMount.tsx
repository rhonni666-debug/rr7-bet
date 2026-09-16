import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatedBackground } from './AnimatedBackground';
import { BonusIntroOverlay } from './BonusIntroOverlay';
import { BonusTeaseOverlay } from './BonusTeaseOverlay';

type Phase = 'idle' | 'spinning' | 'tease' | 'bonus' | 'reveal';

function readPhase(target: HTMLElement | null): Phase {
  if (!target) return 'idle';
  if (target.classList.contains('phase-bonus')) return 'bonus';
  if (target.classList.contains('phase-tease')) return 'tease';
  if (target.classList.contains('phase-spinning')) return 'spinning';
  if (target.classList.contains('phase-reveal')) return 'reveal';
  return 'idle';
}

function readScatterCount(target: HTMLElement | null) {
  if (!target) return 3;
  const scatterNodes = target.querySelectorAll('.symbol.scatter');
  return Math.max(3, scatterNodes.length || 3);
}

export function GameVfxMount() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [bonusVisible, setBonusVisible] = useState(false);
  const [scatterCount, setScatterCount] = useState(3);
  const bonusTimer = useRef<number | null>(null);
  const lastPhase = useRef<Phase>('idle');

  useEffect(() => {
    function sync() {
      const nextTarget = document.querySelector<HTMLElement>('.game-player');
      if (nextTarget !== target) setTarget(nextTarget);
      const nextPhase = readPhase(nextTarget);
      setPhase(nextPhase);

      if (nextPhase === 'bonus' && lastPhase.current !== 'bonus') {
        setScatterCount(readScatterCount(nextTarget));
        setBonusVisible(true);
        if (bonusTimer.current) window.clearTimeout(bonusTimer.current);
        bonusTimer.current = window.setTimeout(() => setBonusVisible(false), 4300);
      }
      lastPhase.current = nextPhase;
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      if (bonusTimer.current) window.clearTimeout(bonusTimer.current);
    };
  }, [target]);

  if (!target) return null;

  return createPortal(
    <>
      <AnimatedBackground phase={phase} />
      {phase === 'tease' && <BonusTeaseOverlay />}
      {bonusVisible && <BonusIntroOverlay scatterCount={scatterCount} />}
    </>,
    target,
  );
}
