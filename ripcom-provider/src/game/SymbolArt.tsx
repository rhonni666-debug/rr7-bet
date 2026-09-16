import { useId } from 'react';
import type { RipcomSymbol } from '../api';

type Props = {
  symbol?: RipcomSymbol;
};

function normalize(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function SymbolArt({ symbol }: Props) {
  const rawId = useId().replace(/:/g, '');
  const label = normalize(symbol?.label);
  const kind = symbol?.wild
    ? 'wild'
    : symbol?.scatter
      ? 'bonus'
      : label.includes('serpente')
        ? 'serpent'
        : label.includes('nucleo')
          ? 'core'
          : label.includes('fragment')
            ? 'fragment'
            : label.includes('runa')
              ? 'rune'
              : 'gem';

  const emerald = `emerald-${rawId}`;
  const jade = `jade-${rawId}`;
  const gold = `gold-${rawId}`;
  const obsidian = `obsidian-${rawId}`;
  const silver = `silver-${rawId}`;
  const glow = `glow-${rawId}`;

  return (
    <div className={`symbol-art-stage symbol-art-${kind}`} aria-hidden="true">
      <div className="symbol-art-floor" />
      <svg className="symbol-art" viewBox="0 0 100 100" focusable="false">
        <defs>
          <linearGradient id={emerald} x1="12%" y1="8%" x2="88%" y2="92%">
            <stop offset="0%" stopColor="#efffd2" />
            <stop offset="19%" stopColor="#9df68b" />
            <stop offset="48%" stopColor="#22c98d" />
            <stop offset="78%" stopColor="#08745d" />
            <stop offset="100%" stopColor="#02372f" />
          </linearGradient>
          <linearGradient id={jade} x1="20%" y1="0%" x2="75%" y2="100%">
            <stop offset="0%" stopColor="#bfffe8" />
            <stop offset="35%" stopColor="#39d8b0" />
            <stop offset="100%" stopColor="#075649" />
          </linearGradient>
          <linearGradient id={gold} x1="14%" y1="5%" x2="86%" y2="96%">
            <stop offset="0%" stopColor="#fff7bf" />
            <stop offset="22%" stopColor="#f9db70" />
            <stop offset="58%" stopColor="#c9942f" />
            <stop offset="100%" stopColor="#6d4511" />
          </linearGradient>
          <linearGradient id={obsidian} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#263d39" />
            <stop offset="36%" stopColor="#0a1715" />
            <stop offset="75%" stopColor="#020706" />
            <stop offset="100%" stopColor="#183027" />
          </linearGradient>
          <linearGradient id={silver} x1="12%" y1="4%" x2="88%" y2="96%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#d7eee8" />
            <stop offset="60%" stopColor="#78968f" />
            <stop offset="100%" stopColor="#29433e" />
          </linearGradient>
          <radialGradient id={glow} cx="38%" cy="28%" r="68%">
            <stop offset="0%" stopColor="#f4ffd8" />
            <stop offset="18%" stopColor="#baff7e" />
            <stop offset="47%" stopColor="#37d89e" />
            <stop offset="78%" stopColor="#0a6553" />
            <stop offset="100%" stopColor="#032c26" />
          </radialGradient>
        </defs>

        {kind === 'rune' && (
          <g className="art-object">
            <path d="M50 13 59 39 86 50 59 61 50 87 41 61 14 50 41 39Z" fill={`url(#${silver})`} stroke="#d8fff1" strokeWidth="1.6" />
            <path d="M50 22 55 44 77 50 55 56 50 78 45 56 23 50 45 44Z" fill={`url(#${jade})`} opacity=".92" />
            <path d="M50 20 52 45 69 49 52 51Z" fill="#fff" opacity=".48" />
          </g>
        )}

        {kind === 'fragment' && (
          <g className="art-object">
            <path d="M50 10 82 43 68 82 31 88 15 49Z" fill={`url(#${emerald})`} stroke="#a9ffe2" strokeWidth="1.5" />
            <path d="M50 10 52 52 15 49Z" fill="#dfffd7" opacity=".5" />
            <path d="M50 10 82 43 52 52Z" fill="#8cffc6" opacity=".33" />
            <path d="M52 52 68 82 31 88Z" fill="#063f37" opacity=".62" />
            <path d="M52 52 82 43 68 82Z" fill="#14946f" opacity=".68" />
            <path d="M34 31 47 18" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".5" />
          </g>
        )}

        {kind === 'core' && (
          <g className="art-object">
            <circle cx="50" cy="50" r="31" fill={`url(#${obsidian})`} stroke="#82e9c6" strokeWidth="3" />
            <circle cx="50" cy="50" r="22" fill={`url(#${glow})`} stroke="#deffbb" strokeWidth="1.6" />
            <ellipse cx="43" cy="38" rx="8" ry="5" fill="#fff" opacity=".55" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#7dffcf" strokeWidth="1.2" opacity=".25" strokeDasharray="7 5" />
            <path d="M22 57c10 8 46 12 58-4" fill="none" stroke="#caff86" strokeWidth="2" opacity=".36" strokeLinecap="round" />
          </g>
        )}

        {kind === 'bonus' && (
          <g className="art-object">
            <circle cx="50" cy="50" r="39" fill="none" stroke={`url(#${gold})`} strokeWidth="4" strokeDasharray="2.5 5" opacity=".9" />
            <circle cx="50" cy="50" r="30" fill={`url(#${gold})`} opacity=".86" />
            <circle cx="50" cy="50" r="24" fill={`url(#${obsidian})`} stroke="#ffe794" strokeWidth="1.4" />
            <circle cx="44" cy="43" r="19" fill="#020706" />
            <path d="M35 29c10-8 25-7 33 1" fill="none" stroke="#fff5ba" strokeWidth="2.4" strokeLinecap="round" opacity=".72" />
            <ellipse cx="40" cy="36" rx="6" ry="3" fill="#fff" opacity=".18" />
          </g>
        )}

        {kind === 'wild' && (
          <g className="art-object">
            <path d="M20 65c8-27 28-43 55-37-10 3-16 8-20 15 13-1 23 3 29 11-16-3-27 1-34 12-7 11-16 17-30 18 4-5 5-11 0-19Z" fill={`url(#${emerald})`} stroke="#d9ffc1" strokeWidth="1.5" />
            <path d="M46 43c9-8 20-8 29-3-8 2-13 7-15 14Z" fill={`url(#${gold})`} opacity=".9" />
            <circle cx="61" cy="46" r="2.8" fill="#ffe776" />
            <circle cx="62" cy="45" r="1" fill="#fff" />
            <path d="M18 69c14 8 28 7 38-4" fill="none" stroke="#b8ff80" strokeWidth="4" strokeLinecap="round" opacity=".62" />
            <path d="M27 52c3-8 9-15 17-20" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".34" />
          </g>
        )}

        {kind === 'serpent' && (
          <g className="art-object">
            <path d="M66 21c-19-8-41 4-43 25-3 25 21 41 41 30 15-8 15-28 2-34-9-5-20 0-21 9-1 8 7 12 13 8" fill="none" stroke={`url(#${emerald})`} strokeWidth="12" strokeLinecap="round" />
            <path d="M65 18c11 2 18 9 20 18-8-4-15-3-20 2-1-7-4-13-10-18Z" fill={`url(#${gold})`} stroke="#ffe99d" strokeWidth="1" />
            <circle cx="72" cy="29" r="2.7" fill="#ffeb6d" />
            <circle cx="73" cy="28" r=".9" fill="#fff" />
            <path d="M31 35c5-9 13-14 23-16" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" opacity=".36" />
            <path d="M79 37 91 40 80 43" fill="none" stroke="#ff697f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {kind === 'gem' && (
          <g className="art-object">
            <path d="M50 12 80 31 86 65 62 87 29 82 14 52 25 24Z" fill={`url(#${jade})`} stroke="#c4ffdd" strokeWidth="1.5" />
            <path d="M50 12 52 51 25 24Z" fill="#f0ffdd" opacity=".34" />
            <path d="M52 51 86 65 62 87Z" fill="#063e37" opacity=".55" />
          </g>
        )}
      </svg>
    </div>
  );
}
