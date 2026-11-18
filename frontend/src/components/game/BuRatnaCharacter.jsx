import { useEffect, useState } from 'react';

const INK = '#1e293b';
const SKIN = '#f1c27d';
const BLOUSE = '#e76f51';
const SCARF = '#2a9d8f';
const MOUTH = '#7a2e2e';
const TONGUE = '#f28b82';
const TYPE_SPEED_MS = 22;

const MOOD_LABEL = {
  idle: 'tersenyum',
  talking: 'sedang berbicara',
  thinking: 'sedang berpikir',
  happy: 'gembira',
  shocked: 'terkejut',
};

/** Sudut lengan kanan (dalam derajat, berputar di bahu). Negatif = ke luar/atas. */
const ARM_POSE = { idle: -8, talking: -35, thinking: -8, happy: -160, shocked: -150 };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Karakter kartun Bu Ratna, Ketua Kelompok Tani Sumber Rejeki.
 *
 * @param {'idle'|'talking'|'thinking'|'happy'|'shocked'} mood
 * @param {string}  dialogue     teks balon percakapan (kosong = balon disembunyikan)
 * @param {number}  size         lebar karakter dalam piksel
 * @param {'right'|'top'} bubblePosition  posisi balon (di layar sempit selalu di atas)
 * @param {any}     replayKey    ubah nilainya untuk mengulang animasi reaksi (mis. gagal dua kali berturut-turut)
 * @param {ReactNode} actions    tombol tambahan di dalam balon (mis. "Lanjut")
 * @param {string}  title        label kecil di atas teks balon
 */
export default function BuRatnaCharacter({
  mood = 'idle', dialogue = '', size = 180, bubblePosition = 'right', replayKey, actions = null, className = '', title = 'Ketua Kelompok Tani',
}) {
  const [shown, setShown] = useState(dialogue ?? '');

  // Efek mesin ketik pada balon percakapan.
  useEffect(() => {
    if (!dialogue) {
      setShown('');
      return undefined;
    }
    if (prefersReducedMotion()) {
      setShown(dialogue);
      return undefined;
    }
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 1;
      setShown(dialogue.slice(0, i));
      if (i >= dialogue.length) clearInterval(id);
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
  }, [dialogue]);

  const typing = Boolean(dialogue) && shown.length < dialogue.length;
  // Saat teks masih diketik dan mood netral, mulut ikut bergerak.
  const face = mood === 'idle' && typing ? 'talking' : mood;
  const isTop = bubblePosition === 'top';

  return (
    <div
      className={`flex items-center gap-3 ${isTop ? 'flex-col' : 'flex-col sm:flex-row sm:items-end'} ${className}`}
    >
      <figure className="m-0 shrink-0" style={{ width: size }}>
        <RatnaSvg key={replayKey} mood={face} />
        <figcaption className="mx-auto -mt-1 w-fit rounded-full border-2 border-slate-800 bg-[#ffd23f] px-3 py-0.5 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_#1e293b]">
          Bu Ratna
        </figcaption>
      </figure>

      {dialogue && (
        <div
          className={`relative max-w-sm cursor-pointer rounded-2xl border-2 border-slate-800 bg-white px-4 py-3 shadow-[4px_4px_0px_#1e293b] ${isTop ? 'order-first' : 'order-first sm:order-last sm:mb-16'}`}
          onClick={() => setShown(dialogue)}
          title={typing ? 'Klik untuk menampilkan semua teks' : undefined}
        >
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">{title}</p>
          <p className="min-h-[1.5rem] text-sm leading-relaxed text-slate-800" aria-hidden="true">
            {shown}
            {typing && <span className="ml-0.5 inline-block w-2 animate-pulse">▍</span>}
          </p>
          <p className="sr-only" aria-live="polite">{dialogue}</p>
          {actions && (
            <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}

          {/* Ekor balon: ke bawah (layar sempit / posisi atas) atau ke kiri (posisi kanan) */}
          <span
            aria-hidden="true"
            className={`absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-slate-800 bg-white ${isTop ? '' : 'sm:hidden'}`}
          />
          {!isTop && (
            <span
              aria-hidden="true"
              className="absolute -left-[9px] top-1/2 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-slate-800 bg-white sm:block"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SVG karakter (viewBox 220×300). Koordinat dipakai juga oleh keyframe di index.css.
// ----------------------------------------------------------------------
function RatnaSvg({ mood }) {
  const bodyAnim = { idle: 'ratna-breathe', thinking: 'ratna-breathe', happy: 'ratna-hop', shocked: 'ratna-shake' }[mood] ?? '';
  const armAnim = { talking: 'ratna-gesture', happy: 'ratna-wave' }[mood] ?? '';

  return (
    <svg
      viewBox="0 0 220 300"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label={`Bu Ratna ${MOOD_LABEL[mood] ?? ''}`}
      stroke={INK}
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Bayangan tanah */}
      <ellipse className={mood === 'happy' ? 'ratna-hop-shadow' : ''} cx="110" cy="291" rx="62" ry="8" fill="#000" opacity="0.15" stroke="none" />

      <g className={bodyAnim}>
        {/* Rok batik */}
        <path d="M74 205 L146 205 L162 282 Q110 292 58 282 Z" fill="#7b4b2a" />
        <path d="M66 252 Q80 245 94 252 T122 252 T152 252" fill="none" stroke="#d9a066" strokeWidth="3" />
        {[[84, 230], [110, 226], [136, 232], [96, 270], [126, 272]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#d9a066" stroke="none" />
        ))}

        {/* Sandal */}
        <ellipse cx="88" cy="287" rx="14" ry="6" fill="#3e2723" />
        <ellipse cx="132" cy="287" rx="14" ry="6" fill="#3e2723" />

        {/* Baju kerja */}
        <path d="M76 158 Q110 148 144 158 L148 212 Q110 220 72 212 Z" fill={BLOUSE} />

        {/* Celemek */}
        <path d="M88 170 L132 170 L140 262 Q110 270 80 262 Z" fill="#fffaf0" />
        <path d="M80 210 Q110 216 140 210 L141 218 Q110 224 79 218 Z" fill="#f4a261" />
        <path d="M98 230 h24 v12 q-12 6 -24 0 Z" fill="#f4e1c1" strokeWidth="2.5" />
        <path d="M110 184 q11 3 9 15 q-11 -2 -9 -15 Z" fill="#43a047" strokeWidth="2" />
        <path d="M110 184 L113 196" strokeWidth="1.5" />

        {/* Lengan kiri memegang keranjang keripik */}
        <path d="M80 160 Q62 170 60 196 L62 214 L77 214 L78 196 Q82 182 88 176 Z" fill={BLOUSE} />
        <BananaChipBasket />
        <circle cx="69" cy="221" r="9" fill={SKIN} />

        {/* Kepala (mengangguk saat berbicara) */}
        <g
          className={mood === 'talking' ? 'ratna-nod' : ''}
          style={{
            transform: mood === 'thinking' ? 'rotate(5deg)' : undefined,
            transformOrigin: '110px 150px',
            transition: 'transform .4s',
          }}
        >
          {/* Kerudung belakang & selendang bahu */}
          <path d="M62 112 Q60 50 110 50 Q160 50 158 112 Q166 150 170 176 Q110 196 50 176 Q54 150 62 112 Z" fill={SCARF} />
          <path d="M66 140 Q74 160 90 170 M154 140 Q146 160 130 170" fill="none" stroke="#1f7a70" strokeWidth="3" />

          {/* Wajah */}
          <ellipse cx="110" cy="108" rx="32" ry="36" fill={SKIN} />
          <path d="M76 96 Q78 66 110 64 Q142 66 144 96 Q130 80 110 80 Q90 80 76 96 Z" fill={SCARF} />
          <circle cx="110" cy="152" r="5" fill="#ffd23f" strokeWidth="2.5" />

          <ellipse cx="89" cy="122" rx="7" ry="4.5" fill={TONGUE} stroke="none" opacity={mood === 'happy' ? 0.9 : 0.55} />
          <ellipse cx="131" cy="122" rx="7" ry="4.5" fill={TONGUE} stroke="none" opacity={mood === 'happy' ? 0.9 : 0.55} />
          <path d="M108 112 Q112 116 108 119" fill="none" strokeWidth="2.5" />

          <Brows mood={mood} />
          <Eyes mood={mood} />
          <Mouth mood={mood} />
        </g>

        {/* Lengan kanan: berpose sesuai mood (transisi membal) */}
        <g
          style={{
            transform: `rotate(${ARM_POSE[mood] ?? -8}deg)`,
            transformOrigin: '148px 162px',
            transition: 'transform .45s cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          <g className={armAnim}>
            <rect x="139" y="156" width="18" height="60" rx="9" fill={BLOUSE} />
            <circle cx="148" cy="222" r="9" fill={SKIN} />
          </g>
        </g>
      </g>

      <MoodEffects mood={mood} />
    </svg>
  );
}

function BananaChipBasket() {
  const chips = [[40, 210, -20], [56, 205, 15], [72, 207, -10], [88, 210, 25], [62, 213, 5], [47, 214, 30], [80, 214, -25]];
  return (
    <g>
      {chips.map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`} transform={`rotate(${r} ${cx} ${cy})`}>
          <ellipse cx={cx} cy={cy} rx="10" ry="6" fill="#f6c945" strokeWidth="2" />
          <circle cx={cx - 2} cy={cy - 1} r="1.5" fill="#b7791f" stroke="none" />
          <circle cx={cx + 3} cy={cy + 1} r="1.2" fill="#b7791f" stroke="none" />
        </g>
      ))}
      <path d="M24 216 L104 216 L95 250 Q64 260 33 250 Z" fill="#c8913f" />
      <path d="M42 218 L44 254 M58 218 L58 256 M74 218 L73 256 M90 218 L87 253" stroke="#8b5e2b" strokeWidth="2" />
      <path d="M28 231 Q64 239 100 231 M31 243 Q64 251 97 243" fill="none" stroke="#8b5e2b" strokeWidth="2" />
      <ellipse cx="64" cy="216" rx="41" ry="7" fill="#a87332" />
    </g>
  );
}

function Eyes({ mood }) {
  if (mood === 'happy') {
    return (
      <g fill="none" strokeWidth="3.5">
        <path d="M92 108 Q98 100 104 108" />
        <path d="M116 108 Q122 100 128 108" />
      </g>
    );
  }
  if (mood === 'shocked') {
    return (
      <g>
        <circle cx="98" cy="106" r="8" fill="#fff" strokeWidth="2.5" />
        <circle cx="122" cy="106" r="8" fill="#fff" strokeWidth="2.5" />
        <circle cx="98" cy="107" r="3" fill={INK} stroke="none" />
        <circle cx="122" cy="107" r="3" fill={INK} stroke="none" />
      </g>
    );
  }
  const [dx, dy] = mood === 'thinking' ? [2, -3] : [0, 0];
  return (
    <g className="ratna-blink" stroke="none">
      {[98, 122].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx + dx} cy={106 + dy} rx="4.5" ry="6" fill={INK} />
          <circle cx={cx + dx + 1.5} cy={104 + dy} r="1.6" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Brows({ mood }) {
  const d = {
    idle: ['M91 95 Q98 92 105 95', 'M115 95 Q122 92 129 95'],
    talking: ['M91 92 Q98 88 105 92', 'M115 92 Q122 88 129 92'],
    happy: ['M90 91 Q98 85 106 91', 'M114 91 Q122 85 130 91'],
    thinking: ['M91 95 L105 95', 'M115 92 Q122 85 129 90'],
    shocked: ['M90 92 Q98 88 105 85', 'M115 85 Q122 88 130 92'],
  }[mood] ?? ['M91 95 Q98 92 105 95', 'M115 95 Q122 92 129 95'];
  return (
    <g fill="none" strokeWidth="3.5">
      <path d={d[0]} />
      <path d={d[1]} />
    </g>
  );
}

function Mouth({ mood }) {
  switch (mood) {
    case 'talking':
      return (
        <g className="ratna-talk">
          <ellipse cx="110" cy="128" rx="7" ry="6" fill={MOUTH} />
          <ellipse cx="110" cy="131" rx="4" ry="2.2" fill={TONGUE} stroke="none" />
        </g>
      );
    case 'happy':
      return (
        <g>
          <path d="M96 123 Q110 144 124 123 Z" fill={MOUTH} />
          <path d="M98 124 L122 124 L121 127.5 L99 127.5 Z" fill="#fff" stroke="none" />
          <path d="M103 134 Q110 139 117 134 Q110 130 103 134 Z" fill={TONGUE} stroke="none" />
        </g>
      );
    case 'shocked':
      return <ellipse cx="110" cy="130" rx="5.5" ry="7.5" fill={MOUTH} />;
    case 'thinking':
      return <path d="M102 129 Q106 126 110 129 Q114 132 118 128" fill="none" />;
    default:
      return <path d="M100 126 Q110 134 120 126" fill="none" />;
  }
}

/** Efek di sekitar karakter: koin & konfeti (happy), keringat & tanda seru (shocked), titik pikiran (thinking). */
function MoodEffects({ mood }) {
  if (mood === 'happy') {
    const coins = [[34, 92, 0], [186, 84, 0.25], [24, 150, 0.5], [196, 146, 0.75], [110, 26, 0.4], [60, 40, 1], [168, 34, 0.6]];
    return (
      <g>
        {coins.map(([cx, cy, delay], i) =>
          i % 2 === 0 ? (
            <g key={i} className="ratna-coin" style={{ animationDelay: `${delay}s` }}>
              <circle cx={cx} cy={cy} r="9" fill="#ffd23f" strokeWidth="2.5" />
              <circle cx={cx} cy={cy} r="5" fill="none" stroke="#d69e00" strokeWidth="1.5" />
            </g>
          ) : (
            <rect
              key={i}
              className="ratna-coin"
              x={cx - 4}
              y={cy - 2.5}
              width="8"
              height="5"
              rx="1"
              fill={['#ef476f', '#06d6a0', '#118ab2'][i % 3]}
              strokeWidth="1.5"
              style={{ animationDelay: `${delay}s` }}
            />
          ),
        )}
      </g>
    );
  }
  if (mood === 'shocked') {
    return (
      <g>
        <path className="ratna-sweat" d="M150 74 q6 9 0 14 q-6 -5 0 -14 Z" fill="#7dd3fc" strokeWidth="2" />
        <path className="ratna-sweat" d="M70 82 q5 8 0 12 q-5 -4 0 -12 Z" fill="#7dd3fc" strokeWidth="2" style={{ animationDelay: '0.5s' }} />
        <g className="ratna-pop">
          <path d="M176 22 L172 52" strokeWidth="7" stroke="#ef4444" />
          <path d="M176 22 L172 52" strokeWidth="2" stroke={INK} fill="none" opacity="0.4" />
          <circle cx="170" cy="64" r="4.5" fill="#ef4444" />
        </g>
        <path d="M52 56 L40 46 M48 72 L34 70 M58 42 L52 28" fill="none" strokeWidth="2.5" />
      </g>
    );
  }
  if (mood === 'thinking') {
    return (
      <g fill="#fff" strokeWidth="2.5">
        {[[160, 62, 3, 0], [171, 46, 4.5, 0.25], [186, 28, 6.5, 0.5]].map(([cx, cy, r, delay]) => (
          <circle key={cx} className="ratna-think-dot" cx={cx} cy={cy} r={r} style={{ animationDelay: `${delay}s` }} />
        ))}
      </g>
    );
  }
  return null;
}
