import { useEffect, useRef, useState } from 'react';

type AnimatedAmountProps = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function AnimatedAmount({ value, duration = 720, prefix = '', suffix = '', className }: AnimatedAmountProps) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const startValue = previous.current;
    const delta = value - startValue;
    const startedAt = performance.now();
    let frame = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - startedAt) / Math.max(120, duration));
      const next = startValue + delta * easeOutCubic(progress);
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else previous.current = value;
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{display.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{suffix}
    </span>
  );
}
