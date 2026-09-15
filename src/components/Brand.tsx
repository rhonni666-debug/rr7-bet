export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-baseline gap-0.5 select-none" aria-label="RR7.BET">
      <span className={compact ? 'text-xl font-black tracking-tight text-white' : 'text-3xl font-black tracking-tight text-white'}>RR7</span>
      <span className={compact ? 'text-xs font-black text-amber-400' : 'text-sm font-black text-amber-400'}>.BET</span>
    </div>
  );
}
