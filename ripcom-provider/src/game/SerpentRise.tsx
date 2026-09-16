export function SerpentRise() {
  return (
    <div className="serpent-rise" aria-hidden="true">
      <svg viewBox="0 0 320 760" role="presentation">
        <defs>
          <linearGradient id="serpentBody" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#04140f" />
            <stop offset="22%" stopColor="#0b2f22" />
            <stop offset="48%" stopColor="#1e6947" />
            <stop offset="72%" stopColor="#68b844" />
            <stop offset="100%" stopColor="#dfff75" />
          </linearGradient>
          <linearGradient id="serpentBelly" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#153a2b" />
            <stop offset="48%" stopColor="#73a850" />
            <stop offset="100%" stopColor="#e7ef9c" />
          </linearGradient>
          <linearGradient id="serpentHighlight" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2d7b54" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f2ffad" stopOpacity="0.96" />
          </linearGradient>
          <radialGradient id="serpentHeadSkin" cx="36%" cy="24%" r="80%">
            <stop offset="0%" stopColor="#91d05a" />
            <stop offset="35%" stopColor="#3f7f45" />
            <stop offset="72%" stopColor="#173b2b" />
            <stop offset="100%" stopColor="#071a13" />
          </radialGradient>
          <pattern id="serpentScales" width="18" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 7 Q4 0 9 7 Q14 0 18 7" fill="none" stroke="#c9ef7a" strokeOpacity=".28" strokeWidth="1.1" />
            <path d="M0 14 Q4 7 9 14 Q14 7 18 14" fill="none" stroke="#103d2d" strokeOpacity=".52" strokeWidth="1" />
          </pattern>
          <filter id="serpentGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="serpentDepth" x="-50%" y="-50%" width="200%" height="220%">
            <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#000" floodOpacity=".72" />
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#9cff69" floodOpacity=".16" />
          </filter>
        </defs>

        <g className="serpent-rise-body" filter="url(#serpentDepth)">
          <path
            className="serpent-shadow"
            d="M165 742 C64 655 277 554 131 444 C39 374 247 277 151 171 C109 125 129 96 163 76"
          />
          <path
            className="serpent-main serpent-edge"
            d="M165 742 C64 655 277 554 131 444 C39 374 247 277 151 171 C109 125 129 96 163 76"
            stroke="#061a13"
          />
          <path
            className="serpent-main"
            d="M165 742 C64 655 277 554 131 444 C39 374 247 277 151 171 C109 125 129 96 163 76"
            stroke="url(#serpentBody)"
          />
          <path
            className="serpent-scale-layer"
            d="M165 742 C64 655 277 554 131 444 C39 374 247 277 151 171 C109 125 129 96 163 76"
            stroke="url(#serpentScales)"
          />
          <path
            className="serpent-belly"
            d="M170 725 C103 648 240 553 146 462 C84 401 214 300 164 200 C148 166 147 126 164 94"
            stroke="url(#serpentBelly)"
          />
          <path
            className="serpent-highlight"
            d="M151 717 C92 643 220 552 137 469 C72 405 198 304 151 202 C138 170 141 132 159 99"
            stroke="url(#serpentHighlight)"
          />

          <g className="serpent-head" filter="url(#serpentGlow)">
            <path d="M110 91 C119 50 158 37 190 50 C220 62 230 89 219 114 C208 138 188 151 165 154 C136 150 113 133 108 111 C105 103 106 97 110 91Z" fill="url(#serpentHeadSkin)" stroke="#0b231a" strokeWidth="5" />
            <path d="M118 92 C135 58 183 51 208 84 C188 73 145 76 118 92Z" fill="#b7e56d" opacity=".58" />
            <path d="M120 104 C141 94 187 94 211 103 C201 117 190 124 169 126 C147 125 132 119 120 104Z" fill="#193e2e" opacity=".78" />
            <path d="M132 119 C151 136 186 134 204 116 C195 145 142 153 132 119Z" fill="#071711" opacity=".9" />
            <path d="M128 77 141 68 151 78 140 88Z" fill="#c4ec7a" opacity=".28" />
            <path d="M181 75 194 66 205 79 194 89Z" fill="#c4ec7a" opacity=".22" />
            <ellipse cx="145" cy="92" rx="11" ry="8" fill="#dfff76" className="serpent-eye" />
            <ellipse cx="189" cy="90" rx="11" ry="8" fill="#dfff76" className="serpent-eye eye-two" />
            <ellipse cx="145" cy="92" rx="2.2" ry="6.5" fill="#07120c" />
            <ellipse cx="189" cy="90" rx="2.2" ry="6.5" fill="#07120c" />
            <circle cx="141" cy="89" r="2" fill="#fff" opacity=".72" />
            <circle cx="185" cy="87" r="2" fill="#fff" opacity=".72" />
            <ellipse cx="158" cy="113" rx="2.3" ry="1.7" fill="#03100b" />
            <ellipse cx="178" cy="112" rx="2.3" ry="1.7" fill="#03100b" />
            <path className="serpent-tongue" d="M168 140 C168 160 158 171 152 183 M168 140 C170 160 181 171 189 182" fill="none" stroke="#ff6576" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}
