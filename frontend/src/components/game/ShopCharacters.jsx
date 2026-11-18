const INK = '#1e293b';
const SKIN_CASHIER = '#e0ac69';
const SKIN_WAREHOUSE = '#c68642';
const MOUTH = '#7a2e2e';
const TONGUE = '#f28b82';

const MOOD_LABEL = {
  offline: 'sedang tidak terhubung',
  idle: 'tersenyum',
  talking: 'sedang berbicara',
  thinking: 'sedang berpikir',
  happy: 'gembira',
  shocked: 'terkejut',
};

const VARIANTS = {
  cashier: {
    name: 'Kasir',
    badge: 'bg-[#ffd23f]',
    skin: SKIN_CASHIER,
    shirt: '#f4b942',
    pants: '#5b3a29',
  },
  warehouse: {
    name: 'Penjaga Gudang',
    badge: 'bg-[#d9a066]',
    skin: SKIN_WAREHOUSE,
    shirt: '#f5e6c8',
    pants: '#8b5a2b',
  },
};

/** Pose lengan: [lengan kiri, lengan kanan], masing-masing { d: path, hand: [x, y] }. */
const ARMS = {
  side: [
    { d: 'M46 114 Q32 140 38 164', hand: [38, 166] },
    { d: 'M114 114 Q128 140 122 164', hand: [122, 166] },
  ],
  hold: [
    { d: 'M46 114 Q46 146 66 150', hand: [68, 150] },
    { d: 'M114 114 Q114 146 94 150', hand: [92, 150] },
  ],
  gesture: [
    { d: 'M46 114 Q32 140 38 164', hand: [38, 166] },
    { d: 'M114 114 Q140 112 142 88', hand: [142, 84] },
  ],
  chin: [
    { d: 'M46 114 Q32 140 38 164', hand: [38, 166] },
    { d: 'M114 114 Q126 124 102 100', hand: [100, 97] },
  ],
  up: [
    { d: 'M46 112 Q26 92 30 66', hand: [30, 62] },
    { d: 'M114 112 Q134 92 130 66', hand: [130, 62] },
  ],
  spread: [
    { d: 'M46 112 Q22 104 20 80', hand: [20, 76] },
    { d: 'M114 112 Q138 104 140 80', hand: [140, 76] },
  ],
};

/**
 * Karakter kartun kedai (viewBox 160×210) dengan ekspresi otomatis.
 * @param {'cashier'|'warehouse'} variant
 * @param {'offline'|'idle'|'talking'|'thinking'|'happy'|'shocked'} mood
 * @param {string} caption  teks lencana nama (default: nama peran)
 * @param {boolean} dim     tampil lebih redup (bukan pembicara)
 */
export function ShopCharacter({ variant = 'cashier', mood = 'idle', size = 150, caption, dim = false, className = '' }) {
  const v = VARIANTS[variant] ?? VARIANTS.cashier;
  const face = mood === 'offline' ? 'idle' : mood;
  const bodyAnim = { idle: 'shop-breathe', talking: 'shop-breathe', thinking: 'shop-breathe', happy: 'shop-hop', shocked: 'shop-shake' }[mood] ?? '';
  const pose = {
    idle: variant === 'warehouse' ? 'hold' : 'side',
    talking: 'gesture',
    thinking: 'chin',
    happy: 'up',
    shocked: 'spread',
  }[face] ?? 'side';

  return (
    <figure className={`m-0 shrink-0 transition-opacity duration-300 ${dim ? 'opacity-75' : ''} ${className}`} style={{ width: size }}>
      <svg
        viewBox="0 0 160 210"
        className={`h-auto w-full overflow-visible transition-[filter] duration-500 ${mood === 'offline' ? 'opacity-70 grayscale' : ''}`}
        role="img"
        aria-label={`${v.name} ${MOOD_LABEL[mood] ?? ''}`}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <ellipse cx="80" cy="203" rx="48" ry="6" fill="#000" opacity="0.15" stroke="none" />

        <g className={bodyAnim}>
          {/* Kaki & sepatu */}
          <rect x="58" y="176" width="16" height="22" rx="4" fill={v.pants} />
          <rect x="86" y="176" width="16" height="22" rx="4" fill={v.pants} />
          <ellipse cx="64" cy="199" rx="12" ry="5" fill="#3b2416" />
          <ellipse cx="96" cy="199" rx="12" ry="5" fill="#3b2416" />

          {/* Badan */}
          <path d="M44 108 Q80 96 116 108 L124 182 Q80 190 36 182 Z" fill={v.shirt} />
          {variant === 'cashier' ? <CashierOutfit /> : <WarehouseOutfit />}

          {/* Leher & kepala */}
          <rect x="72" y="88" width="16" height="14" rx="4" fill={v.skin} />
          {variant === 'cashier' && <circle cx="80" cy="28" r="11" fill="#3b2416" />}
          <circle cx="50" cy="66" r="6" fill={v.skin} />
          <circle cx="110" cy="66" r="6" fill={v.skin} />
          <circle cx="80" cy="64" r="30" fill={v.skin} />
          <ellipse cx="62" cy="77" rx="5" ry="3" fill={TONGUE} stroke="none" opacity="0.5" />
          <ellipse cx="98" cy="77" rx="5" ry="3" fill={TONGUE} stroke="none" opacity="0.5" />
          {variant === 'cashier' ? <CashierHair /> : <WarehouseHair />}

          <Brows mood={face} />
          <Eyes mood={face} />
          <Mouth mood={face} />

          {/* Properti di tangan: cangkir kopi (Kasir) atau papan catatan (Gudang) */}
          {pose === 'side' && variant === 'cashier' && <Cup x={122} y={158} />}
          {pose === 'hold' && <Clipboard />}

          <Arms pose={pose} skin={v.skin} sleeve={v.shirt} />
        </g>

        <Effects mood={face} />
      </svg>
      <figcaption
        className={`mx-auto -mt-1 w-fit whitespace-nowrap rounded-full border-2 border-slate-800 px-3 py-0.5 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_#1e293b] ${v.badge}`}
      >
        {caption ?? v.name}
      </figcaption>
    </figure>
  );
}

export const CashierCharacter = (props) => <ShopCharacter variant="cashier" {...props} />;
export const WarehouseCharacter = (props) => <ShopCharacter variant="warehouse" {...props} />;

// ----------------------------------------------------------------------
// Bagian tubuh
// ----------------------------------------------------------------------
function CashierOutfit() {
  return (
    <>
      <path d="M70 102 L80 114 L90 102" fill="none" />
      {/* Celemek hijau daun */}
      <path d="M58 120 L66 104" fill="none" stroke="#2f7d32" strokeWidth="4" />
      <path d="M102 120 L94 104" fill="none" stroke="#2f7d32" strokeWidth="4" />
      <path d="M54 120 L106 120 L114 184 Q80 190 46 184 Z" fill="#5cb85c" />
      <rect x="66" y="152" width="28" height="16" rx="3" fill="#4a9d4a" />
      {/* Lambang cangkir di dada */}
      <path d="M72 128 L88 128 L86 140 L74 140 Z" fill="#fffaf0" strokeWidth="2.5" />
      <path d="M88 131 Q93 132 87 137" fill="none" strokeWidth="2.5" />
      <path d="M77 125 Q75 122 77 119 M83 125 Q81 122 83 119" fill="none" strokeWidth="2" stroke="#fffaf0" />
    </>
  );
}

function WarehouseOutfit() {
  return (
    <>
      {/* Baju kodok cokelat kayu */}
      <path d="M60 118 L54 104" fill="none" stroke="#6b3f1d" strokeWidth="5" />
      <path d="M100 118 L106 104" fill="none" stroke="#6b3f1d" strokeWidth="5" />
      <path d="M60 118 L100 118 L100 140 L118 184 Q80 190 42 184 L60 140 Z" fill="#a0522d" />
      <circle cx="63" cy="123" r="3" fill="#ffd23f" />
      <circle cx="97" cy="123" r="3" fill="#ffd23f" />
      <rect x="70" y="126" width="20" height="14" rx="2" fill="#8b4513" />
      <path d="M84 120 L86 132" stroke="#ffd23f" strokeWidth="3" />
    </>
  );
}

function CashierHair() {
  return (
    <>
      <path d="M50 62 Q48 32 80 32 Q112 32 110 62 Q100 46 80 48 Q62 46 50 62 Z" fill="#3b2416" />
      {/* Jepit rambut daun */}
      <path d="M98 40 Q108 34 112 42 Q104 48 98 40 Z" fill="#5cb85c" strokeWidth="2.5" />
    </>
  );
}

function WarehouseHair() {
  return (
    <>
      <path d="M52 60 Q52 38 80 38 Q108 38 108 60 Q96 50 80 52 Q64 50 52 60 Z" fill="#2d1b12" />
      {/* Caping anyaman */}
      <path d="M28 50 L80 12 L132 50 Q80 60 28 50 Z" fill="#e9c46a" />
      <path d="M46 37 Q80 30 114 37 M60 27 Q80 22 100 27" fill="none" stroke="#b5892f" strokeWidth="2.5" />
      <path d="M80 14 L80 54 M56 32 L66 54 M104 32 L94 54" fill="none" stroke="#b5892f" strokeWidth="2" />
    </>
  );
}

function Eyes({ mood }) {
  if (mood === 'happy') {
    return <path d="M64 67 Q69 60 74 67 M86 67 Q91 60 96 67" fill="none" />;
  }
  if (mood === 'shocked') {
    return (
      <>
        <circle cx="69" cy="65" r="6" fill="#fff" />
        <circle cx="91" cy="65" r="6" fill="#fff" />
        <circle cx="69" cy="65" r="2" fill={INK} stroke="none" />
        <circle cx="91" cy="65" r="2" fill={INK} stroke="none" />
      </>
    );
  }
  const dx = mood === 'thinking' ? 2 : 0;
  const dy = mood === 'thinking' ? -2 : 0;
  return (
    <>
      <g className="ratna-blink"><ellipse cx={69 + dx} cy={66 + dy} rx="3.5" ry="4.5" fill={INK} stroke="none" /></g>
      <g className="ratna-blink"><ellipse cx={91 + dx} cy={66 + dy} rx="3.5" ry="4.5" fill={INK} stroke="none" /></g>
    </>
  );
}

function Brows({ mood }) {
  const d = {
    shocked: 'M62 50 Q69 45 76 50 M84 50 Q91 45 98 50',
    thinking: 'M63 56 Q69 54 75 56 M85 52 Q91 48 97 53',
    happy: 'M63 54 Q69 50 75 54 M85 54 Q91 50 97 54',
  }[mood] ?? 'M63 56 Q69 53 75 56 M85 56 Q91 53 97 56';
  return <path d={d} fill="none" strokeWidth="3.5" />;
}

function Mouth({ mood }) {
  switch (mood) {
    case 'talking':
      return <g className="ratna-talk"><ellipse cx="80" cy="81" rx="5" ry="4" fill={MOUTH} /></g>;
    case 'happy':
      return (
        <>
          <path d="M70 77 Q80 93 90 77 Z" fill={MOUTH} />
          <ellipse cx="80" cy="85" rx="4" ry="2.5" fill={TONGUE} stroke="none" />
        </>
      );
    case 'shocked':
      return <ellipse cx="80" cy="83" rx="5" ry="7" fill={MOUTH} />;
    case 'thinking':
      return <path d="M73 82 Q77 79 81 82 T88 81" fill="none" />;
    default:
      return <path d="M72 78 Q80 86 88 78" fill="none" />;
  }
}

function Arms({ pose, skin, sleeve }) {
  return (ARMS[pose] ?? ARMS.side).map(({ d, hand }) => (
    <g key={d}>
      <path d={d} fill="none" strokeWidth="14" />
      <path d={d} fill="none" stroke={sleeve} strokeWidth="8" />
      <circle cx={hand[0]} cy={hand[1]} r="7" fill={skin} />
    </g>
  ));
}

function Cup({ x, y }) {
  return (
    <g strokeWidth="2.5">
      <path d={`M${x - 8} ${y - 14} L${x + 8} ${y - 14} L${x + 6} ${y + 2} L${x - 6} ${y + 2} Z`} fill="#fffaf0" />
      <rect x={x - 8} y={y - 18} width="16" height="4" rx="2" fill="#8b5a2b" />
    </g>
  );
}

function Clipboard() {
  return (
    <g strokeWidth="2.5">
      <rect x="60" y="122" width="40" height="36" rx="3" fill="#d9a066" />
      <rect x="65" y="127" width="30" height="27" rx="1" fill="#fffaf0" strokeWidth="2" />
      <rect x="73" y="119" width="14" height="6" rx="2" fill="#64748b" strokeWidth="2" />
      <path d="M69 135 L91 135 M69 141 L88 141 M69 147 L84 147" fill="none" strokeWidth="2" stroke="#94a3b8" />
    </g>
  );
}

function Effects({ mood }) {
  if (mood === 'thinking') {
    return (
      <g fill="#fff">
        <circle className="ratna-think-dot" cx="120" cy="30" r="3" />
        <circle className="ratna-think-dot" cx="130" cy="19" r="4.5" style={{ animationDelay: '0.25s' }} />
        <circle className="ratna-think-dot" cx="144" cy="8" r="6.5" style={{ animationDelay: '0.5s' }} />
      </g>
    );
  }
  if (mood === 'happy') {
    const star = (cx, cy, r) =>
      `M${cx} ${cy - r} L${cx + r * 0.3} ${cy - r * 0.3} L${cx + r} ${cy} L${cx + r * 0.3} ${cy + r * 0.3} L${cx} ${cy + r} L${cx - r * 0.3} ${cy + r * 0.3} L${cx - r} ${cy} L${cx - r * 0.3} ${cy - r * 0.3} Z`;
    return (
      <g fill="#ffd23f" strokeWidth="2">
        <path className="ratna-pop" d={star(22, 36, 9)} />
        <path className="ratna-pop" d={star(140, 30, 7)} style={{ animationDelay: '0.15s' }} />
      </g>
    );
  }
  if (mood === 'shocked') {
    return (
      <>
        <path className="ratna-sweat" d="M112 46 Q107 54 112 57 Q117 54 112 46 Z" fill="#7dd3fc" strokeWidth="2" />
        <text x="134" y="34" fontSize="28" fontWeight="900" fill="#e76f51" stroke={INK} strokeWidth="1.5">!</text>
      </>
    );
  }
  return null;
}

export default ShopCharacter;
