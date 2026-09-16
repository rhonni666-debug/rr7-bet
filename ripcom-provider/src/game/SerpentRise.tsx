export function SerpentRise() {
  return (
    <div className="serpent-rise" aria-hidden="true">
      <svg viewBox="0 0 320 760" role="presentation">
        <defs>
          <linearGradient id="serpentBody" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#08241b" />
            <stop offset="38%" stopColor="#1f6b48" />
            <stop offset="72%" stopColor="#77c94d" />
            <stop offset="100%" stopColor="#d9ff78" />
          </linearGradient>
          <linearGradient id="serpentHighlight" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1c6b4b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#efffa7" stopOpacity="0.9" />
          </linearGradient>
          <filter id="serpentGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g className="serpent-rise-body">
          <path
            className="serpent-shadow"
            d="M165 742 C64 655 277 554 131 444 C39 374 247 277 151 171 C109 125 129 96 163 76"
          />
          <path
            className="serpent-main"
            d="M165 742 C64 655 277 554 131 444 C39 374 247 277 151 171 C109 125 129 96 163 76"
            stroke="url(#serpentBody)"
          />
          <path
            className="serpent-highlight"
            d="M163 728 C92 649 246 553 143 459 C70 393 220 291 157 191 C135 157 139 122 161 93"
            stroke="url(#serpentHighlight)"
          />

          <g className="serpent-head" filter="url(#serpentGlow)">
            <path d="M113 91 C126 48 195 39 219 88 C231 113 211 144 169 151 C128 145 103 119 113 91Z" fill="#173e2d" />
            <path d="M120 92 C136 62 186 55 207 88 C184 78 144 80 120 92Z" fill="#7ebf4f" opacity="0.72" />
            <path d="M132 118 C151 132 185 132 203 116 C193 145 143 150 132 118Z" fill="#0a1d15" opacity="0.82" />
            <ellipse cx="146" cy="92" rx="9" ry="7" fill="#dfff76" className="serpent-eye" />
            <ellipse cx="187" cy="90" rx="9" ry="7" fill="#dfff76" className="serpent-eye eye-two" />
            <ellipse cx="146" cy="92" rx="2" ry="6" fill="#0b150d" />
            <ellipse cx="187" cy="90" rx="2" ry="6" fill="#0b150d" />
            <path className="serpent-tongue" d="M169 139 C169 162 159 171 153 183 M169 139 C170 161 181 171 188 182" fill="none" stroke="#ff6e77" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}
