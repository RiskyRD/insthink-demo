const INK = '#1e293b';
const SKIN_CASHIER = '#e0ac69';
const SKIN_WAREHOUSE = '#c68642';
const MOUTH = '#7a2e2e';
const TONGUE = '#f28b82';
const HAIR = '#2b1a12';
const TERRA = '#c4562f';
const KUNYIT = '#f2b33d';
const GOLD = '#e9b949';
const CREAM = '#fff7e0';
const TEAL = '#2a9d8f';
const LEAF = '#4f8f3a';

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
    shirt: '#fdfaf2', // kemeja putih rapi
    pants: '#3b2a20',
    udeng: { main: '#fffaf0', accent: '#8c3b2a', flower: true }, // udeng putih bermotif batik
  },
  warehouse: {
    name: 'Penjaga Gudang',
    badge: 'bg-[#d9a066]',
    skin: SKIN_WAREHOUSE,
    shirt: '#f5e6c8',
    pants: '#4a3426',
    udeng: { main: TERRA, accent: GOLD, flower: false }, // udeng terakota bermotif emas
  },
};

/** Varian cewek Bali: kebaya + kamen, rambut pusung (Kasir) atau kepang (Gudang) berhias jepun. */
const FEMALE = {
  cashier: { kebaya: '#fdfaf2', lace: '#f2d9a6', kemben: KUNYIT, kamen: '#8c3b2a', hair: 'pusung' },
  warehouse: { kebaya: '#f5e6c8', lace: '#e9b949', kemben: LEAF, kamen: TERRA, hair: 'kepang' },
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
 * @param {'male'|'female'} gender  male = udeng & saput, female = kebaya, kamen & sanggul/kepang
 * @param {'offline'|'idle'|'talking'|'thinking'|'happy'|'shocked'} mood
 * @param {string} caption  teks lencana nama (default: nama peran)
 * @param {boolean} dim     tampil lebih redup (bukan pembicara)
 */
export function ShopCharacter({ variant = 'cashier', gender = 'male', mood = 'idle', size = 150, caption, dim = false, headOnly = false, className = '' }) {
  const v = VARIANTS[variant] ?? VARIANTS.cashier;
  const f = gender === 'female' ? FEMALE[variant] ?? FEMALE.cashier : null;
  const face = mood === 'offline' ? 'idle' : mood;
  const bodyAnim = headOnly ? '' : { idle: 'shop-breathe', talking: 'shop-breathe', thinking: 'shop-breathe', happy: 'shop-hop', shocked: 'shop-shake' }[mood] ?? '';
  const pose = {
    idle: variant === 'warehouse' ? 'hold' : 'side',
    talking: 'gesture',
    thinking: 'chin',
    happy: 'up',
    shocked: 'spread',
  }[face] ?? 'side';

  return (
    <figure className={`m-0 shrink-0 transition-opacity duration-300 ${dim ? 'opacity-75' : ''} ${className}`} style={{ width: size }} aria-hidden={headOnly || undefined}>
      <svg
        viewBox={headOnly ? '34 12 92 92' : '0 0 160 210'}
        className={`h-auto w-full overflow-visible transition-[filter] duration-500 ${mood === 'offline' ? 'opacity-70 grayscale' : ''}`}
        role="img"
        aria-label={`${v.name}${f ? ' (cewek)' : ''} ${MOOD_LABEL[mood] ?? ''}`}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <ellipse cx="80" cy="203" rx="48" ry="6" fill="#000" opacity="0.15" stroke="none" />

        <g className={bodyAnim}>
          {f ? (
            <>
              {/* Kamen (kain lilit) & sandal */}
              <ellipse cx="66" cy="201" rx="10" ry="4" fill="#3b2416" />
              <ellipse cx="94" cy="201" rx="10" ry="4" fill="#3b2416" />
              <Kamen fill={f.kamen} endek={variant === 'warehouse'} />
              {/* Kebaya: lebih pendek, menjuntai di atas kamen */}
              <path d="M44 108 Q80 96 116 108 L121 164 Q80 172 39 164 Z" fill={f.kebaya} />
              <KebayaDetail {...f} />
              {variant === 'cashier' ? <CashierApron /> : <Senteng />}
            </>
          ) : (
            <>
              {/* Kaki & sepatu */}
              <rect x="58" y="176" width="16" height="22" rx="4" fill={v.pants} />
              <rect x="86" y="176" width="16" height="22" rx="4" fill={v.pants} />
              <ellipse cx="64" cy="199" rx="12" ry="5" fill="#3b2416" />
              <ellipse cx="96" cy="199" rx="12" ry="5" fill="#3b2416" />

              {/* Badan */}
              <path d="M44 108 Q80 96 116 108 L124 182 Q80 190 36 182 Z" fill={v.shirt} />
              {variant === 'cashier' ? <CashierOutfit /> : <WarehouseOutfit />}
            </>
          )}

          {/* Leher & kepala */}
          <rect x="72" y="88" width="16" height="14" rx="4" fill={v.skin} />
          {f?.hair === 'pusung' && <Pusung />}
          <circle cx="50" cy="66" r="6" fill={v.skin} />
          <circle cx="110" cy="66" r="6" fill={v.skin} />
          <circle cx="80" cy="64" r="30" fill={v.skin} />
          <ellipse cx="62" cy="77" rx="5" ry="3" fill={TONGUE} stroke="none" opacity="0.5" />
          <ellipse cx="98" cy="77" rx="5" ry="3" fill={TONGUE} stroke="none" opacity="0.5" />
          {f ? <FemaleHair style={f.hair} /> : <Udeng {...v.udeng} />}

          <Brows mood={face} />
          <Eyes mood={face} />
          <Mouth mood={face} />

          {/* Properti: cangkir kopi (Kasir) atau papan catatan kayu & kotak bahan (Gudang) */}
          {pose === 'side' && variant === 'cashier' && <Cup x={122} y={158} />}
          {variant === 'warehouse' && <IngredientCrate />}
          {pose === 'hold' && <Clipboard />}

          {f?.hair === 'kepang' && <Kepang />}
          <Arms pose={pose} skin={v.skin} sleeve={f ? f.kebaya : v.shirt} cuff={f?.lace} />
        </g>

        {!headOnly && <Effects mood={face} />}
      </svg>
      {!headOnly && (
      <figcaption
        className={`mx-auto -mt-1 w-fit whitespace-nowrap rounded-full border-2 border-slate-800 px-3 py-0.5 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_#1e293b] ${v.badge}`}
      >
        {caption ?? v.name}
      </figcaption>
      )}
    </figure>
  );
}

export const CashierCharacter = (props) => <ShopCharacter variant="cashier" {...props} />;
export const WarehouseCharacter = (props) => <ShopCharacter variant="warehouse" {...props} />;

/** Potret kepala bulat (HUD, kartu kecil). */
export function AvatarHead({ role, gender, size = 28, className = '' }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full border-2 border-slate-800 bg-[#fff7e0] ${className}`}
      style={{ width: size, height: size }}
    >
      <ShopCharacter variant={role === 'warehouse' ? 'warehouse' : 'cashier'} gender={gender === 'female' ? 'female' : 'male'} headOnly size="100%" />
    </span>
  );
}

/** Karakter berdasarkan peran & skin pemain (`avatar_skin` dari server). */
export const RoleCharacter = ({ role, gender, ...props }) => (
  <ShopCharacter variant={role === 'warehouse' ? 'warehouse' : 'cashier'} gender={gender === 'female' ? 'female' : 'male'} {...props} />
);

// ----------------------------------------------------------------------
// Bagian tubuh
// ----------------------------------------------------------------------
/** Pita motif tenun Endek Bali: belah ketupat kunyit/krem dengan titik toska di dasar terakota. */
function EndekStrip({ x, y, w, h, base = TERRA }) {
  const n = Math.max(1, Math.round(w / h));
  const step = w / n;
  const cy = y + h / 2;
  return (
    <g strokeWidth="1.5">
      <rect x={x} y={y} width={w} height={h} fill={base} />
      {Array.from({ length: n }, (_, i) => {
        const cx = x + step * (i + 0.5);
        const ry = h * 0.38;
        const rx = step * 0.42;
        return (
          <g key={i}>
            <path d={`M${cx} ${cy - ry} L${cx + rx} ${cy} L${cx} ${cy + ry} L${cx - rx} ${cy} Z`} fill={i % 2 ? CREAM : KUNYIT} />
            <circle cx={cx} cy={cy} r={h * 0.12} fill={TEAL} stroke="none" />
          </g>
        );
      })}
    </g>
  );
}

/** Kerah kemeja rapi. */
function ShirtCollar({ fill }) {
  return (
    <>
      <path d="M72 100 L80 112 L70 116 L64 104 Z" fill={fill} strokeWidth="2.5" />
      <path d="M88 100 L80 112 L90 116 L96 104 Z" fill={fill} strokeWidth="2.5" />
    </>
  );
}

function CashierOutfit() {
  return (
    <>
      <ShirtCollar fill="#fdfaf2" />
      <CashierApron />
    </>
  );
}

/** Celemek kedai kopi hijau daun beraksen Endek (dipakai Kasir cowok & cewek). */
function CashierApron() {
  return (
    <>
      <path d="M58 120 L66 106" fill="none" stroke="#2f6b2a" strokeWidth="4" />
      <path d="M102 120 L94 106" fill="none" stroke="#2f6b2a" strokeWidth="4" />
      <path d="M54 120 L106 120 L114 184 Q80 190 46 184 Z" fill={LEAF} />
      <EndekStrip x={54} y={120} w={52} h={9} />
      <EndekStrip x={66} y={154} w={28} h={14} />
      <rect x="66" y="154" width="28" height="14" rx="2" fill="none" strokeWidth="2.5" />
      {/* Lambang cangkir di dada */}
      <path d="M72 134 L88 134 L86 146 L74 146 Z" fill="#fffaf0" strokeWidth="2.5" />
      <path d="M88 137 Q93 138 87 143" fill="none" strokeWidth="2.5" />
    </>
  );
}

function WarehouseOutfit() {
  return (
    <>
      <ShirtCollar fill="#f5e6c8" />
      <path d="M80 114 L80 136" strokeWidth="2" />
      <circle cx="80" cy="122" r="1.8" fill={INK} stroke="none" />
      <circle cx="80" cy="131" r="1.8" fill={INK} stroke="none" />
      {/* Saput kain Endek dililit di pinggang, diikat di sisi kiri */}
      <path d="M42 142 Q80 150 118 142 L122 180 Q80 188 38 180 Z" fill={TERRA} />
      <EndekStrip x={44} y={154} w={74} h={12} />
      <path d="M40 174 Q80 182 120 174" fill="none" stroke={GOLD} strokeWidth="3" />
      {/* Umpal (sabuk) kunyit */}
      <path d="M43 136 Q80 144 117 136 L118 145 Q80 153 42 145 Z" fill={KUNYIT} />
      <path d="M46 144 L36 164 L48 160 Z" fill={TERRA} />
      <path d="M50 146 L46 168 L56 162 Z" fill={KUNYIT} />
    </>
  );
}

// ---------- Varian cewek ----------

/** Kamen: kain lilit sampai mata kaki dengan lipatan miring dan tepi emas. */
function Kamen({ fill, endek }) {
  return (
    <g>
      <path d="M42 150 Q80 158 118 150 L116 200 Q80 205 44 200 Z" fill={fill} />
      {endek && <EndekStrip x={45} y={180} w={70} h={10} />}
      <path d="M94 156 L84 202" fill="none" strokeWidth="2.5" />
      <path d="M45 196 Q80 201 115 196" fill="none" stroke={GOLD} strokeWidth="3" />
    </g>
  );
}

/** Kerah V kebaya dengan kemben di dalamnya, renda di tepi, dan bros emas. */
function KebayaDetail({ kebaya, lace, kemben }) {
  return (
    <g>
      <path d="M68 102 L80 136 L92 102 Z" fill={kemben} strokeWidth="2.5" />
      <path d="M66 101 L80 138 L94 101" fill="none" stroke={lace} strokeWidth="4" />
      <path d="M66 101 L80 138 L94 101" fill="none" strokeWidth="1.5" />
      {/* Renda bergelombang di bawah kebaya */}
      <path d="M40 162 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 10 0" fill={kebaya} stroke={lace} strokeWidth="2.5" />
      <circle cx="80" cy="128" r="3.5" fill={GOLD} strokeWidth="2" />
    </g>
  );
}

/** Selendang senteng kunyit yang diikat di pinggang, ujungnya menjuntai. */
function Senteng() {
  return (
    <g>
      <path d="M40 146 Q80 156 120 146 L121 158 Q80 168 39 158 Z" fill={KUNYIT} />
      <path d="M42 152 Q80 162 119 152" fill="none" stroke={TERRA} strokeWidth="2" strokeDasharray="5 4" />
      <path d="M108 156 L118 188 L110 186 L104 160 Z" fill={KUNYIT} />
      <path d="M104 158 L100 182 L94 178 Z" fill={GOLD} />
    </g>
  );
}

/** Sanggul pusung di belakang-atas kepala dengan tusuk konde emas (digambar sebelum kepala). */
function Pusung() {
  return (
    <g>
      <ellipse cx="80" cy="30" rx="21" ry="13" fill={HAIR} />
      <path d="M66 28 Q80 20 94 28" fill="none" stroke="#4a2e20" strokeWidth="2" />
      <path d="M58 22 L102 34" stroke={GOLD} strokeWidth="3" />
      <circle cx="58" cy="22" r="3" fill={GOLD} strokeWidth="2" />
    </g>
  );
}

/** Rambut berbelah tengah dengan poni lembut, subeng emas, dan bunga jepun. */
function FemaleHair({ style }) {
  return (
    <g>
      <path d="M49 72 Q44 32 80 32 Q116 32 111 72 Q108 56 100 48 Q90 52 80 42 Q70 52 60 48 Q52 56 49 72 Z" fill={HAIR} />
      <path d="M80 34 L80 42" fill="none" stroke="#4a2e20" strokeWidth="2" />
      {/* Subeng (anting bulat) */}
      <circle cx="50" cy="74" r="3.5" fill={GOLD} strokeWidth="2" />
      <circle cx="110" cy="74" r="3.5" fill={GOLD} strokeWidth="2" />
      {style === 'pusung' ? (
        <>
          <Jepun cx={101} cy={30} scale={0.7} />
          <Jepun cx={110} cy={39} scale={0.5} />
        </>
      ) : (
        <Jepun cx={52} cy={46} scale={0.65} />
      )}
    </g>
  );
}

/** Kepang rapi menjuntai di bahu kiri dengan ikatan merah terakota. */
function Kepang() {
  return (
    <g>
      {[78, 87, 96, 105].map((y, i) => (
        <ellipse key={y} cx={50 - i * 1.5} cy={y} rx="6.5" ry="6" fill={HAIR} strokeWidth="2.5" />
      ))}
      <rect x="40" y="110" width="9" height="5" rx="2" fill={TERRA} strokeWidth="2" />
      <path d="M44 115 L41 124 M45 115 L47 124" stroke={HAIR} strokeWidth="3" />
    </g>
  );
}

/** Udeng Bali: ikat kepala dengan lipatan depan (bebidakan) dan motif batik. */
function Udeng({ main, accent, flower }) {
  return (
    <g>
      {/* Rambut di sisi kepala */}
      <path d="M51 68 Q49 54 54 48 L106 48 Q111 54 109 68 Q105 58 100 56 L60 56 Q55 58 51 68 Z" fill={HAIR} />
      {/* Ujung ikatan di belakang kanan */}
      <path d="M108 44 L124 38 L120 54 Z" fill={main} />
      {/* Tutup kepala */}
      <path d="M50 50 Q46 22 80 22 Q114 22 110 50 Q80 40 50 50 Z" fill={main} />
      {[[62, 34], [74, 28], [90, 29], [100, 37], [68, 42], [94, 43]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={accent} stroke="none" />
      ))}
      <path d="M58 40 Q64 36 70 40 M86 36 Q92 32 98 36" fill="none" stroke={accent} strokeWidth="2" />
      {/* Lilitan di dahi */}
      <path d="M48 52 Q80 40 112 52 L110 45 Q80 34 50 45 Z" fill={main} />
      <path d="M52 49 Q80 39 108 49" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="4 4" />
      {/* Lipatan depan yang menjulang */}
      <path d="M78 42 Q76 14 98 10 Q90 24 92 42 Z" fill={main} />
      <path d="M84 38 Q84 22 94 16" fill="none" stroke={accent} strokeWidth="2" />
      {flower && <Jepun cx={108} cy={40} scale={0.55} />}
    </g>
  );
}

function Jepun({ cx, cy, scale = 1 }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} strokeWidth="2.5">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx="0" cy="-6" rx="4.5" ry="7" fill="#fffdf5" transform={`rotate(${deg})`} />
      ))}
      <circle cx="0" cy="0" r="4" fill="#ffd23f" />
    </g>
  );
}

/** Kotak kayu berisi bahan baku (biji kopi & pisang) di samping kaki Penjaga Gudang. */
function IngredientCrate() {
  return (
    <g strokeWidth="2.5">
      {[[126, 170], [133, 167], [140, 171]].map(([cx, cy]) => (
        <g key={cx}>
          <ellipse cx={cx} cy={cy} rx="4" ry="5" fill="#5b3216" />
          <path d={`M${cx} ${cy - 4} Q${cx - 2} ${cy} ${cx} ${cy + 4}`} fill="none" stroke="#c08552" strokeWidth="1.2" />
        </g>
      ))}
      <path d="M144 172 Q146 158 158 158 Q150 164 150 172 Z" fill="#ffd54f" strokeWidth="2" />
      <rect x="118" y="172" width="40" height="28" rx="3" fill="#c8915a" />
      <path d="M118 181 L158 181 M118 190 L158 190" stroke="#8b5a2b" strokeWidth="2" />
      <path d="M124 172 L124 200 M152 172 L152 200" stroke="#8b5a2b" strokeWidth="2" />
    </g>
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

function Arms({ pose, skin, sleeve, cuff }) {
  return (ARMS[pose] ?? ARMS.side).map(({ d, hand }) => (
    <g key={d}>
      <path d={d} fill="none" strokeWidth="14" />
      <path d={d} fill="none" stroke={sleeve} strokeWidth="8" />
      {cuff && <circle cx={hand[0]} cy={hand[1]} r="8.5" fill={cuff} strokeWidth="2" />}
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
      <rect x="60" y="122" width="40" height="36" rx="3" fill="#b9824a" />
      <path d="M62 126 Q70 124 76 128 M84 154 Q92 152 98 155" fill="none" stroke="#8b5a2b" strokeWidth="1.5" />
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
