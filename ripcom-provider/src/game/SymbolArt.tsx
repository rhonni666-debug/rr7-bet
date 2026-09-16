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
  const label = normalize(`${symbol?.id ?? ''} ${symbol?.label ?? ''}`);
  const kind = symbol?.wild
    ? 'wild'
    : symbol?.scatter
      ? 'bonus'
      : label.includes('serpente') || label.includes('serpent')
        ? 'serpent'
        : label.includes('nucleo') || label.includes('core')
          ? 'core'
          : label.includes('fragment')
            ? 'fragment'
            : label.includes('runa') || label.includes('rune')
              ? 'rune'
              : 'gem';

  const gold = `gold-${rawId}`;
  const goldEdge = `gold-edge-${rawId}`;
  const emerald = `emerald-${rawId}`;
  const emeraldDark = `emerald-dark-${rawId}`;
  const sapphire = `sapphire-${rawId}`;
  const sapphireDark = `sapphire-dark-${rawId}`;
  const amethyst = `amethyst-${rawId}`;
  const amethystDark = `amethyst-dark-${rawId}`;
  const ruby = `ruby-${rawId}`;
  const rubyDark = `ruby-dark-${rawId}`;
  const obsidian = `obsidian-${rawId}`;
  const ivory = `ivory-${rawId}`;
  const sun = `sun-${rawId}`;

  return (
    <div className={`symbol-art-stage symbol-art-${kind}`} data-symbol-kind={kind} aria-hidden="true">
      <div className="symbol-art-floor" />
      <svg className="symbol-art" viewBox="0 0 100 100" focusable="false">
        <defs>
          <linearGradient id={gold} x1="10%" y1="4%" x2="88%" y2="96%">
            <stop offset="0%" stopColor="#fffad2" />
            <stop offset="16%" stopColor="#ffe98b" />
            <stop offset="38%" stopColor="#ffc94f" />
            <stop offset="64%" stopColor="#b87412" />
            <stop offset="82%" stopColor="#6d3906" />
            <stop offset="100%" stopColor="#f3bf3d" />
          </linearGradient>
          <linearGradient id={goldEdge} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbe2" />
            <stop offset="32%" stopColor="#e7a72a" />
            <stop offset="60%" stopColor="#6f3a06" />
            <stop offset="100%" stopColor="#ffd96a" />
          </linearGradient>
          <radialGradient id={emerald} cx="34%" cy="24%" r="76%">
            <stop offset="0%" stopColor="#edffd8" />
            <stop offset="18%" stopColor="#80ff9b" />
            <stop offset="43%" stopColor="#16c97d" />
            <stop offset="72%" stopColor="#05704f" />
            <stop offset="100%" stopColor="#012d27" />
          </radialGradient>
          <linearGradient id={emeraldDark} x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#17a86f" />
            <stop offset="58%" stopColor="#044638" />
            <stop offset="100%" stopColor="#011f1c" />
          </linearGradient>
          <radialGradient id={sapphire} cx="35%" cy="22%" r="78%">
            <stop offset="0%" stopColor="#f3ffff" />
            <stop offset="16%" stopColor="#81f4ff" />
            <stop offset="42%" stopColor="#2c8dff" />
            <stop offset="72%" stopColor="#1748a9" />
            <stop offset="100%" stopColor="#081845" />
          </radialGradient>
          <linearGradient id={sapphireDark} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#2d7be0" />
            <stop offset="58%" stopColor="#142e76" />
            <stop offset="100%" stopColor="#07143a" />
          </linearGradient>
          <radialGradient id={amethyst} cx="33%" cy="22%" r="80%">
            <stop offset="0%" stopColor="#fff4ff" />
            <stop offset="17%" stopColor="#f0a8ff" />
            <stop offset="43%" stopColor="#9a49dc" />
            <stop offset="72%" stopColor="#54208d" />
            <stop offset="100%" stopColor="#22063f" />
          </radialGradient>
          <linearGradient id={amethystDark} x1="12%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="#aa51df" />
            <stop offset="60%" stopColor="#4a1979" />
            <stop offset="100%" stopColor="#210536" />
          </linearGradient>
          <radialGradient id={ruby} cx="33%" cy="22%" r="80%">
            <stop offset="0%" stopColor="#fff5f1" />
            <stop offset="16%" stopColor="#ffad9d" />
            <stop offset="42%" stopColor="#ff4e62" />
            <stop offset="72%" stopColor="#aa1734" />
            <stop offset="100%" stopColor="#4c0719" />
          </radialGradient>
          <linearGradient id={rubyDark} x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#e13751" />
            <stop offset="58%" stopColor="#861429" />
            <stop offset="100%" stopColor="#3b0615" />
          </linearGradient>
          <linearGradient id={obsidian} x1="6%" y1="0%" x2="92%" y2="100%">
            <stop offset="0%" stopColor="#43504d" />
            <stop offset="30%" stopColor="#17201e" />
            <stop offset="70%" stopColor="#050807" />
            <stop offset="100%" stopColor="#22312d" />
          </linearGradient>
          <linearGradient id={ivory} x1="12%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#f4f2df" />
            <stop offset="66%" stopColor="#aebdb8" />
            <stop offset="100%" stopColor="#52635f" />
          </linearGradient>
          <radialGradient id={sun} cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fffef0" />
            <stop offset="18%" stopColor="#fff2a2" />
            <stop offset="46%" stopColor="#ffc74d" />
            <stop offset="76%" stopColor="#d86e0f" />
            <stop offset="100%" stopColor="#702303" />
          </radialGradient>
        </defs>

        {kind === 'rune' && (
          <g className="art-object premium-rune">
            <path d="M50 7 64 19 82 18 83 36 95 50 83 64 82 82 64 81 50 93 36 81 18 82 17 64 5 50 17 36 18 18 36 19Z" fill={`url(#${goldEdge})`} stroke="#fff2a9" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="34" fill={`url(#${sapphireDark})`} stroke="#ffd45e" strokeWidth="3" />
            <circle cx="50" cy="50" r="27" fill={`url(#${sapphire})`} stroke="#dfffff" strokeWidth="1.2" />
            <path d="M50 19 57 42 81 50 57 58 50 82 43 58 19 50 43 42Z" fill={`url(#${ivory})`} stroke="#fff" strokeWidth="1" />
            <path d="M50 27 53 45 69 50 53 55 50 73 47 55 31 50 47 45Z" fill="#9bf9ff" opacity=".72" />
            <ellipse cx="40" cy="33" rx="10" ry="5" fill="#fff" opacity=".48" />
            <path d="M23 62c14 10 39 14 56-4" fill="none" stroke="#0a1f55" strokeWidth="3" opacity=".42" strokeLinecap="round" />
          </g>
        )}

        {kind === 'fragment' && (
          <g className="art-object premium-fragment">
            <path d="M50 5 76 18 89 43 80 74 54 94 25 82 10 54 20 24Z" fill={`url(#${goldEdge})`} stroke="#ffeaa0" strokeWidth="1.4" />
            <path d="M50 12 71 24 80 45 72 69 52 84 31 76 19 54 28 31Z" fill={`url(#${amethystDark})`} stroke="#ffd66d" strokeWidth="1.5" />
            <path d="M50 12 57 45 80 45 52 84 42 52 19 54Z" fill={`url(#${amethyst})`} />
            <path d="M50 12 57 45 42 52Z" fill="#fff" opacity=".43" />
            <path d="M57 45 80 45 72 69 52 84Z" fill="#64289f" opacity=".66" />
            <path d="M42 52 52 84 31 76 19 54Z" fill="#321154" opacity=".55" />
            <path d="M35 27 48 18" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".48" />
            <circle cx="64" cy="31" r="3" fill="#fff4b8" opacity=".72" />
          </g>
        )}

        {kind === 'core' && (
          <g className="art-object premium-core">
            <path d="M50 6 61 15 76 14 83 27 94 36 91 51 94 65 83 74 76 88 61 87 50 96 39 87 24 88 17 74 6 65 9 51 6 36 17 27 24 14 39 15Z" fill={`url(#${goldEdge})`} stroke="#fff0a4" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="34" fill={`url(#${obsidian})`} stroke="#c18b28" strokeWidth="2" />
            <circle cx="50" cy="50" r="27" fill={`url(#${emerald})`} stroke="#d4ffb0" strokeWidth="1.7" />
            <circle cx="50" cy="50" r="18" fill="#062b25" opacity=".62" />
            <circle cx="50" cy="50" r="12" fill="#a8ff89" opacity=".92" />
            <circle cx="50" cy="50" r="7" fill="#f8ffe7" />
            <ellipse cx="41" cy="35" rx="10" ry="5" fill="#fff" opacity=".5" />
            <path d="M25 63c13 11 38 13 52-3" fill="none" stroke="#173d34" strokeWidth="3" opacity=".5" strokeLinecap="round" />
          </g>
        )}

        {kind === 'bonus' && (
          <g className="art-object premium-bonus">
            {Array.from({ length: 12 }, (_, index) => {
              const angle = index * 30;
              return <path key={angle} d="M50 3 55 17 45 17Z" fill={`url(#${gold})`} transform={`rotate(${angle} 50 50)`} opacity=".92" />;
            })}
            <circle cx="50" cy="50" r="36" fill={`url(#${goldEdge})`} stroke="#fff0a8" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="30" fill={`url(#${sun})`} stroke="#ffd96b" strokeWidth="1.4" />
            <circle cx="50" cy="50" r="23" fill="#150b08" stroke="#ffe38d" strokeWidth="1.5" />
            <circle cx="43" cy="45" r="18" fill="#020303" />
            <path d="M32 31c10-9 25-10 36-2" fill="none" stroke="#fffbd5" strokeWidth="3" strokeLinecap="round" opacity=".74" />
            <path d="M25 56c7 13 22 22 38 18" fill="none" stroke="#ff9f2d" strokeWidth="3" opacity=".45" strokeLinecap="round" />
            <circle cx="73" cy="33" r="3.2" fill="#fff6b2" />
          </g>
        )}

        {kind === 'wild' && (
          <g className="art-object premium-wild">
            <path d="M50 4 62 14 78 14 83 29 94 40 88 55 91 71 76 78 67 92 50 87 33 92 24 78 9 71 12 55 6 40 17 29 22 14 38 14Z" fill={`url(#${goldEdge})`} stroke="#fff0a1" strokeWidth="1.2" />
            <path d="M50 12 63 20 75 35 72 57 61 77 50 88 39 77 28 57 25 35 37 20Z" fill={`url(#${emeraldDark})`} stroke="#ffc84d" strokeWidth="2" />
            <path d="M50 18c12 0 22 8 25 19-8-3-15-2-21 4 8 2 14 8 16 15-10-3-18 0-22 8-4-7-12-10-21-7 2-8 8-14 16-16-6-6-13-7-21-4 4-11 14-19 28-19Z" fill={`url(#${emerald})`} />
            <path d="M39 38c4-8 17-8 22 0-7-3-15-3-22 0Z" fill={`url(#${gold})`} />
            <path d="M39 46c5 3 8 7 9 13-6-1-11-5-14-10Zm22 0c-5 3-8 7-9 13 6-1 11-5 14-10Z" fill="#062d26" />
            <circle cx="41" cy="46" r="3.4" fill={`url(#${ruby})`} stroke="#ffd983" strokeWidth=".8" />
            <circle cx="59" cy="46" r="3.4" fill={`url(#${ruby})`} stroke="#ffd983" strokeWidth=".8" />
            <circle cx="42" cy="45" r="1" fill="#fff" /><circle cx="60" cy="45" r="1" fill="#fff" />
            <path d="M45 62 50 69 55 62" fill="none" stroke="#f7d974" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M50 70v11" stroke="#ff5267" strokeWidth="2" strokeLinecap="round" />
            <path d="M33 26c6-5 12-7 19-7" fill="none" stroke="#fff" strokeWidth="2.6" opacity=".34" strokeLinecap="round" />
          </g>
        )}

        {kind === 'serpent' && (
          <g className="art-object premium-serpent">
            <path d="M50 5 63 15 79 17 83 34 94 47 86 61 83 78 65 82 50 94 35 82 17 78 14 61 6 47 17 34 21 17 37 15Z" fill={`url(#${goldEdge})`} stroke="#fff0a8" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="34" fill={`url(#${amethystDark})`} stroke="#d69cff" strokeWidth="1.5" />
            <path d="M67 27c-16-7-36 2-39 20-4 20 15 35 32 27 13-6 15-22 5-29-8-6-19-2-20 6-1 7 6 11 12 7" fill="none" stroke={`url(#${emerald})`} strokeWidth="11" strokeLinecap="round" />
            <path d="M65 22c12 2 20 10 22 21-9-4-16-3-22 3-1-9-5-16-12-21Z" fill={`url(#${gold})`} stroke="#fff2a7" strokeWidth="1" />
            <path d="M62 29c6 1 11 5 13 10-5-2-9-1-13 2Z" fill={`url(#${emerald})`} />
            <circle cx="73" cy="34" r="2.8" fill={`url(#${ruby})`} /><circle cx="74" cy="33" r=".8" fill="#fff" />
            <path d="M82 43 94 46 83 50" fill="none" stroke="#ff607b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M29 38c5-9 14-14 24-16" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" opacity=".28" />
            <path d="M23 65c14 12 33 15 48 5" fill="none" stroke="#b76ce9" strokeWidth="3" opacity=".38" strokeLinecap="round" />
          </g>
        )}

        {kind === 'gem' && (
          <g className="art-object premium-gem">
            <path d="M50 7 75 18 91 42 84 69 62 90 34 86 12 63 14 35 31 15Z" fill={`url(#${goldEdge})`} stroke="#fff0a4" strokeWidth="1.2" />
            <path d="M50 14 69 23 82 43 76 65 59 81 37 78 20 60 22 38 35 22Z" fill={`url(#${rubyDark})`} stroke="#ffd36b" strokeWidth="1.4" />
            <path d="M50 14 56 47 82 43 59 81 44 52 20 60 35 22Z" fill={`url(#${ruby})`} />
            <path d="M50 14 56 47 44 52 35 22Z" fill="#fff" opacity=".42" />
            <path d="M56 47 82 43 76 65 59 81Z" fill="#8a1028" opacity=".62" />
            <path d="M44 52 59 81 37 78 20 60Z" fill="#5b091c" opacity=".58" />
            <path d="M36 27 48 19" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
          </g>
        )}
      </svg>
    </div>
  );
}
