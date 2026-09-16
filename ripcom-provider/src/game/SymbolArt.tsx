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
      : label.includes('lua') || label.includes('moon')
        ? 'moon'
        : label.includes('serpente') || label.includes('serpent')
          ? 'serpent'
          : label.includes('nucleo') || label.includes('core')
            ? 'core'
            : label.includes('fragment') || label.includes('shard')
              ? 'fragment'
              : label.includes('runa') || label.includes('rune')
                ? 'rune'
                : 'gem';

  const gold = `gold-${rawId}`;
  const goldEdge = `gold-edge-${rawId}`;
  const emerald = `emerald-${rawId}`;
  const sapphire = `sapphire-${rawId}`;
  const amethyst = `amethyst-${rawId}`;
  const ruby = `ruby-${rawId}`;
  const obsidian = `obsidian-${rawId}`;
  const moon = `moon-${rawId}`;
  const moonShade = `moon-shade-${rawId}`;
  const assetBase = import.meta.env.BASE_URL;

  return (
    <div className={`symbol-art-stage symbol-art-${kind}`} data-symbol-kind={kind} aria-hidden="true">
      <div className="symbol-art-floor" />
      <svg className="symbol-art" viewBox="0 0 100 100" focusable="false">
        <defs>
          <linearGradient id={gold} x1="8%" y1="5%" x2="92%" y2="95%">
            <stop offset="0%" stopColor="#fffbd7" />
            <stop offset="18%" stopColor="#ffe786" />
            <stop offset="42%" stopColor="#ffc241" />
            <stop offset="68%" stopColor="#9d5d0b" />
            <stop offset="100%" stopColor="#ffd763" />
          </linearGradient>
          <linearGradient id={goldEdge} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff9c8" />
            <stop offset="28%" stopColor="#f0b52e" />
            <stop offset="58%" stopColor="#6b3604" />
            <stop offset="84%" stopColor="#d79b21" />
            <stop offset="100%" stopColor="#fff0a0" />
          </linearGradient>
          <radialGradient id={emerald} cx="33%" cy="23%" r="82%">
            <stop offset="0%" stopColor="#e9ffca" />
            <stop offset="15%" stopColor="#8aff90" />
            <stop offset="42%" stopColor="#16c67b" />
            <stop offset="74%" stopColor="#075844" />
            <stop offset="100%" stopColor="#021c1a" />
          </radialGradient>
          <radialGradient id={sapphire} cx="34%" cy="22%" r="82%">
            <stop offset="0%" stopColor="#f1ffff" />
            <stop offset="15%" stopColor="#78f0ff" />
            <stop offset="42%" stopColor="#348dff" />
            <stop offset="74%" stopColor="#173e9d" />
            <stop offset="100%" stopColor="#081334" />
          </radialGradient>
          <radialGradient id={amethyst} cx="33%" cy="22%" r="82%">
            <stop offset="0%" stopColor="#fff5ff" />
            <stop offset="16%" stopColor="#eba8ff" />
            <stop offset="43%" stopColor="#9d4fe4" />
            <stop offset="74%" stopColor="#4b177c" />
            <stop offset="100%" stopColor="#1c0532" />
          </radialGradient>
          <radialGradient id={ruby} cx="34%" cy="22%" r="82%">
            <stop offset="0%" stopColor="#fff4ed" />
            <stop offset="16%" stopColor="#ffb19b" />
            <stop offset="42%" stopColor="#ff4e63" />
            <stop offset="74%" stopColor="#9c1732" />
            <stop offset="100%" stopColor="#3f0717" />
          </radialGradient>
          <linearGradient id={obsidian} x1="5%" y1="0%" x2="95%" y2="100%">
            <stop offset="0%" stopColor="#4c5d58" />
            <stop offset="28%" stopColor="#17201e" />
            <stop offset="70%" stopColor="#030606" />
            <stop offset="100%" stopColor="#263a34" />
          </linearGradient>
          <radialGradient id={moon} cx="31%" cy="25%" r="82%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#e6ebec" />
            <stop offset="46%" stopColor="#a9b3b6" />
            <stop offset="76%" stopColor="#4d5a5d" />
            <stop offset="100%" stopColor="#172123" />
          </radialGradient>
          <linearGradient id={moonShade} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d8e1e2" stopOpacity=".08" />
            <stop offset="55%" stopColor="#2a3335" stopOpacity=".4" />
            <stop offset="100%" stopColor="#050708" stopOpacity=".9" />
          </linearGradient>
          <clipPath id={`wild-clip-${rawId}`}><circle cx="50" cy="50" r="44" /></clipPath>
        </defs>

        {kind === 'wild' && (
          <g className="art-object premium-wild solar-wild-art-v19">
            <circle cx="50" cy="50" r="47" fill="#050b09" stroke={`url(#${goldEdge})`} strokeWidth="2" />
            <image href={`${assetBase}assets/solar-wild-v19.svg`} x="5" y="5" width="90" height="90" preserveAspectRatio="xMidYMid slice" clipPath={`url(#wild-clip-${rawId})`} />
            <circle className="solar-wild-corona-ring" cx="50" cy="50" r="42.5" fill="none" stroke="#ffbd4a" strokeWidth="1.25" opacity=".66" />
            <circle className="solar-wild-hot-ring" cx="50" cy="50" r="35.5" fill="none" stroke="#fff0a2" strokeWidth=".65" opacity=".52" />
          </g>
        )}

        {kind === 'moon' && (
          <g className="art-object premium-moon lunar-symbol-v19">
            <circle cx="50" cy="50" r="44" fill="rgba(5,11,13,.92)" stroke={`url(#${goldEdge})`} strokeWidth="2" />
            <circle className="moon-aura-v19" cx="50" cy="50" r="37" fill="none" stroke="#e7c36a" strokeWidth="3" opacity=".35" />
            <circle cx="50" cy="50" r="31" fill={`url(#${moon})`} stroke="#f5f7ed" strokeWidth="1.2" />
            <path d="M25 35C39 15 68 18 79 39C69 29 53 27 41 35C29 43 25 58 31 70C20 60 18 46 25 35Z" fill="#fff" opacity=".28" />
            <path d="M60 21C77 30 86 48 78 66C71 81 56 87 41 82C62 78 74 62 72 47C71 36 67 28 60 21Z" fill={`url(#${moonShade})`} />
            <g className="moon-craters-v19" opacity=".55">
              <ellipse cx="38" cy="39" rx="6" ry="4.3" fill="#7b8587" />
              <ellipse cx="60" cy="56" rx="7" ry="5" fill="#525d60" />
              <ellipse cx="43" cy="66" rx="4" ry="3" fill="#677275" />
              <ellipse cx="62" cy="34" rx="3.7" ry="2.6" fill="#8e999b" />
              <circle cx="31" cy="53" r="2.8" fill="#646e70" />
            </g>
            <path className="moon-shimmer-v19" d="M31 30C43 20 61 21 70 30" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".66" />
          </g>
        )}

        {kind === 'bonus' && (
          <g className="art-object premium-bonus eclipse-bonus-symbol-v19">
            {Array.from({ length: 16 }, (_, index) => {
              const angle = index * 22.5;
              return <path key={angle} d="M50 1.8 53.8 15 46.2 15Z" fill={`url(#${gold})`} transform={`rotate(${angle} 50 50)`} opacity=".76" />;
            })}
            <circle cx="50" cy="50" r="40" fill="#2b1606" stroke={`url(#${goldEdge})`} strokeWidth="2" />
            <circle className="bonus-sun-disc-v19" cx="50" cy="50" r="30" fill="#ff9f20" stroke="#ffe5a0" strokeWidth="1" />
            <circle className="bonus-moon-disc-v19" cx="55" cy="47" r="25" fill={`url(#${obsidian})`} stroke="#ffe39a" strokeWidth="1.1" />
            <path className="bonus-diamond-ring-v19" d="M29 27A31 31 0 0 1 76 34" fill="none" stroke="#fff8d5" strokeWidth="3.1" strokeLinecap="round" />
            <circle cx="28" cy="30" r="3.2" fill="#fff8d0" />
            <text x="50" y="85" textAnchor="middle" fill="#ffe6a0" fontSize="8" fontWeight="900" letterSpacing="1.2">BONUS</text>
          </g>
        )}

        {kind === 'rune' && (
          <g className="art-object premium-rune">
            <path d="M50 7 64 18 82 18 82 36 94 50 82 64 82 82 64 82 50 93 36 82 18 82 18 64 6 50 18 36 18 18 36 18Z" fill={`url(#${goldEdge})`} stroke="#fff0a2" strokeWidth="1.15" />
            <circle cx="50" cy="50" r="31" fill={`url(#${sapphire})`} stroke="#c9fbff" strokeWidth="1.5" />
            <path d="M50 19 57 42 81 50 57 58 50 82 43 58 19 50 43 42Z" fill="#ecffff" opacity=".9" />
            <path d="M50 29 53 45 68 50 53 55 50 71 47 55 32 50 47 45Z" fill="#71dfff" opacity=".78" />
            <ellipse cx="39" cy="34" rx="10" ry="4.5" fill="#fff" opacity=".43" />
          </g>
        )}

        {kind === 'fragment' && (
          <g className="art-object premium-fragment">
            <path d="M50 6 77 19 90 44 79 74 53 94 24 81 10 53 21 24Z" fill={`url(#${goldEdge})`} stroke="#ffe8a0" strokeWidth="1.25" />
            <path d="M50 13 72 25 80 46 71 69 52 84 31 76 19 54 28 31Z" fill={`url(#${amethyst})`} stroke="#ffd66d" strokeWidth="1.3" />
            <path d="M50 13 57 45 80 46 52 84 42 52 19 54Z" fill="#e6a4ff" opacity=".24" />
            <path d="M35 27 48 18" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
          </g>
        )}

        {kind === 'core' && (
          <g className="art-object premium-core">
            <path d="M50 5 62 14 76 14 84 27 94 37 91 51 94 65 83 75 76 88 61 87 50 96 39 87 24 88 17 74 6 65 9 51 6 36 17 27 24 14 39 15Z" fill={`url(#${goldEdge})`} stroke="#fff0a4" strokeWidth="1.15" />
            <circle cx="50" cy="50" r="33" fill={`url(#${obsidian})`} />
            <circle cx="50" cy="50" r="26" fill={`url(#${emerald})`} stroke="#cfffab" strokeWidth="1.4" />
            <circle className="core-pulse-v19" cx="50" cy="50" r="13" fill="#c4ff96" opacity=".86" />
            <circle cx="50" cy="50" r="7" fill="#f6ffe8" />
            <ellipse cx="40" cy="35" rx="9" ry="4.5" fill="#fff" opacity=".45" />
          </g>
        )}

        {kind === 'serpent' && (
          <g className="art-object premium-serpent">
            <circle cx="50" cy="50" r="43" fill={`url(#${goldEdge})`} stroke="#fff0a2" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="35" fill="#06140f" stroke="#6fd25e" strokeWidth="1.2" />
            <path d="M72 23C53 13 30 22 27 41C25 54 34 62 44 64C52 66 59 63 61 57C64 50 57 45 50 47C44 49 44 56 49 59C39 58 35 52 36 45C38 34 51 29 62 35C74 41 79 55 72 68C65 81 49 87 35 82" fill="none" stroke={`url(#${emerald})`} strokeWidth="10" strokeLinecap="round" />
            <path d="M68 27C58 22 45 23 37 31" fill="none" stroke="#dfff92" strokeWidth="2.2" strokeLinecap="round" opacity=".68" />
            <path d="M62 35 72 33 67 42Z" fill="#96ef72" />
            <circle cx="65" cy="35" r="2.4" fill="#ffef8a" />
            <path d="M68 39 76 44 68 45" fill="none" stroke="#ff727e" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        )}

        {kind === 'gem' && (
          <g className="art-object premium-gem">
            <path d="M50 8 79 25 87 55 68 84 37 91 13 67 17 35Z" fill={`url(#${goldEdge})`} stroke="#ffe6a1" strokeWidth="1.1" />
            <path d="M50 15 72 28 79 54 64 76 39 83 21 64 24 39Z" fill={`url(#${ruby})`} />
            <path d="M50 15 55 49 79 54 39 83 43 53 21 64 24 39Z" fill="#fff" opacity=".12" />
            <path d="M34 29 48 20" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".44" />
          </g>
        )}
      </svg>
    </div>
  );
}
