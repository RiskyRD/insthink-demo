/** Ikon kartun kecil bergaris tebal untuk kartu catatan kasir. */
const INK = '#1e293b';
const base = { viewBox: '0 0 48 48', stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round', 'aria-hidden': true };

export function BananaChipIcon({ className = 'h-10 w-10' }) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="20" cy="27" rx="13" ry="9" fill="#f6c945" transform="rotate(-18 20 27)" />
      <ellipse cx="31" cy="21" rx="12" ry="8" fill="#ffd96a" transform="rotate(22 31 21)" />
      <circle cx="17" cy="27" r="1.6" fill="#b7791f" stroke="none" />
      <circle cx="23" cy="29" r="1.3" fill="#b7791f" stroke="none" />
      <circle cx="29" cy="20" r="1.5" fill="#b7791f" stroke="none" />
      <circle cx="34" cy="23" r="1.2" fill="#b7791f" stroke="none" />
    </svg>
  );
}

export function PriceTagIcon({ className = 'h-10 w-10' }) {
  return (
    <svg {...base} className={className}>
      <path d="M6 24 L22 8 L40 8 L40 26 L24 42 Z" fill="#ff9f68" />
      <circle cx="33" cy="15" r="3" fill="#fffaf0" />
      <path d="M18 27 L26 19 M16 33 L28 21" strokeWidth="2" />
    </svg>
  );
}

export function CalculatorIcon({ className = 'h-10 w-10' }) {
  return (
    <svg {...base} className={className}>
      <rect x="10" y="5" width="28" height="38" rx="5" fill="#2a9d8f" />
      <rect x="14" y="9" width="20" height="9" rx="2" fill="#d9f99d" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={14 + c * 7} y={22 + r * 6.5} width="5" height="4.5" rx="1" fill={c === 2 && r === 2 ? '#ffd23f' : '#fffaf0'} strokeWidth="1.5" />
      )))}
    </svg>
  );
}

export function CoinStackIcon({ className = 'h-10 w-10' }) {
  return (
    <svg {...base} className={className}>
      {[34, 27, 20].map((y) => (
        <g key={y}>
          <ellipse cx="22" cy={y + 4} rx="13" ry="5" fill="#d69e00" />
          <ellipse cx="22" cy={y} rx="13" ry="5" fill="#ffd23f" />
        </g>
      ))}
      <circle cx="35" cy="14" r="8" fill="#ffd23f" />
      <path d="M35 10 L35 18 M32 12 L38 12" strokeWidth="2" />
    </svg>
  );
}

export function BananaBunchIcon({ className = 'h-10 w-10' }) {
  return (
    <svg {...base} className={className}>
      <path d="M24 8 L24 14" stroke="#6b6a17" strokeWidth="3" />
      {[[-12, 6], [-4, 2], [4, 2], [12, 6]].map(([dx, rot], i) => (
        <path
          key={i}
          d={`M${24 + dx * 0.4} 14 Q${24 + dx * 1.6} 26 ${24 + dx * 1.2} 40 Q${24 + dx * 0.6} 34 ${24 + dx * 0.2} 16 Z`}
          fill={i % 2 ? '#ffd54f' : '#ffca28'}
          transform={`rotate(${rot} 24 14)`}
        />
      ))}
    </svg>
  );
}

export function BasketIcon({ className = 'h-10 w-10' }) {
  return (
    <svg {...base} className={className}>
      <path d="M14 20 Q24 4 34 20" fill="none" stroke="#8b5e2b" strokeWidth="3" />
      <ellipse cx="18" cy="20" rx="6" ry="3.5" fill="#f6c945" strokeWidth="2" />
      <ellipse cx="29" cy="19" rx="6" ry="3.5" fill="#ffd96a" strokeWidth="2" />
      <path d="M6 22 L42 22 L37 40 Q24 44 11 40 Z" fill="#c8913f" />
      <path d="M15 23 L17 41 M24 23 L24 43 M33 23 L31 41 M8 30 Q24 35 40 30" fill="none" stroke="#8b5e2b" strokeWidth="2" />
    </svg>
  );
}

/** Pilih ikon berdasarkan isi aturan. */
export function iconForRule(text) {
  if (/laba|untung|rugi|ekspansi/i.test(text)) return CoinStackIcon;
  if (/harga|jual|omzet/i.test(text)) return PriceTagIcon;
  if (/menampilkan|tampil|uji/i.test(text)) return CalculatorIcon;
  return BananaChipIcon;
}
