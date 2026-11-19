import { useEffect, useState } from 'react';

const INK = '#1e293b';
const SKIN = '#f1c27d';
const HAIR = '#2b1a12';
const KEBAYA = '#f2b33d'; // kuning kunyit
const KEBAYA_LACE = '#ffe39a';
const KEMBEN = '#a5d68f'; // hijau lembut
const TERRA = '#c4562f'; // merah terakota (senteng tenun ikat)
const KAMEN = '#3f7d4a'; // hijau daun tua
const GOLD = '#e9b949';
const CREAM = '#fff7e0';
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
 * Karakter kartun Bu Ratna, pemilik kedai, berbusana adat Bali:
 * kebaya kunyit, senteng tenun ikat, kamen, rambut pusung dengan bunga jepun, dan sokasi.
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
  mood = 'idle', dialogue = '', size = 180, bubblePosition = 'right', replayKey, actions = null, className = '', title = 'Pemilik Kedai',
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
        {/* Kamen (kain bawah) hijau dengan lipatan depan dan pinggiran emas */}
        <path d="M74 205 L146 205 L160 282 Q110 292 60 282 Z" fill={KAMEN} />
        <path d="M62 272 Q110 282 158 272 L160 282 Q110 292 60 282 Z" fill={GOLD} strokeWidth="2.5" />
        {[[86, 226], [134, 230], [80, 254], [138, 258], [94, 244]].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 5} ${y} q5 -7 10 0 q-5 7 -10 0 Z`} fill={GOLD} stroke="none" />
        ))}
        <path d="M120 206 L126 206 L113 284 L106 284 Z" fill={GOLD} strokeWidth="2.5" />

        {/* Sandal */}
        <ellipse cx="88" cy="287" rx="14" ry="6" fill="#3e2723" />
        <ellipse cx="132" cy="287" rx="14" ry="6" fill="#3e2723" />

        {/* Leher */}
        <rect x="101" y="134" width="18" height="24" rx="6" fill={SKIN} />

        {/* Kebaya kunyit dengan kemben hijau lembut dan renda */}
        <path d="M76 158 Q110 148 144 158 L150 212 Q110 220 70 212 Z" fill={KEBAYA} />
        <path d="M96 153 Q110 157 124 153 L110 196 Z" fill={KEMBEN} />
        {[0.15, 0.35, 0.55, 0.75].map((t) => (
          <g key={t} stroke="none" fill={CREAM}>
            <circle cx={96 + 14 * t} cy={153 + 43 * t} r="2.4" />
            <circle cx={124 - 14 * t} cy={153 + 43 * t} r="2.4" />
          </g>
        ))}
        {[[86, 172], [134, 172], [84, 194], [136, 194]].map(([x, y]) => (
          <g key={`${x}-${y}`} stroke="none" fill={KEBAYA_LACE}>
            <circle cx={x - 3} cy={y} r="2.5" />
            <circle cx={x + 3} cy={y} r="2.5" />
            <circle cx={x} cy={y - 3} r="2.5" />
            <circle cx={x} cy={y + 3} r="2.5" />
          </g>
        ))}
        <circle cx="110" cy="184" r="4.5" fill={GOLD} strokeWidth="2.5" />

        {/* Senteng tenun ikat merah terakota di pinggang */}
        <path d="M70 198 Q110 206 150 198 L151 216 Q110 224 69 216 Z" fill={TERRA} />
        {[78, 90, 102, 114, 126, 138].map((x, i) => {
          const y = 208 + 3 * (1 - ((x + 6 - 110) / 40) ** 2);
          return (
            <path key={x} d={`M${x + 6} ${y - 5} l5 5 l-5 5 l-5 -5 Z`} fill={i % 2 ? GOLD : CREAM} strokeWidth="1.5" />
          );
        })}
        <path d="M78 214 L72 242 L84 240 L86 216 Z" fill={TERRA} />
        <path d="M74 236 L83 235" stroke={GOLD} strokeWidth="2.5" />

        {/* Lengan kiri memegang sokasi */}
        <path d="M80 160 Q62 170 60 196 L62 214 L77 214 L78 196 Q82 182 88 176 Z" fill={KEBAYA} />
        <path d="M61 207 L77 207 L77 214 L62 214 Z" fill={CREAM} strokeWidth="2" />
        <Sokasi />
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
          {/* Pusung (sanggul Bali) dengan tusuk emas */}
          <ellipse cx="110" cy="62" rx="26" ry="17" fill={HAIR} />
          <path d="M88 52 L134 46" stroke={GOLD} strokeWidth="4" />
          <circle cx="134" cy="46" r="3.5" fill={GOLD} strokeWidth="2" />

          {/* Rambut belakang, telinga, dan subeng (anting emas) */}
          <path d="M74 108 Q72 66 110 64 Q148 66 146 108 Q146 128 138 136 L82 136 Q74 128 74 108 Z" fill={HAIR} />
          <circle cx="78" cy="112" r="7" fill={SKIN} />
          <circle cx="142" cy="112" r="7" fill={SKIN} />
          <circle cx="78" cy="120" r="3.5" fill={GOLD} strokeWidth="2" />
          <circle cx="142" cy="120" r="3.5" fill={GOLD} strokeWidth="2" />

          {/* Wajah dan poni belah tengah */}
          <ellipse cx="110" cy="108" rx="32" ry="36" fill={SKIN} />
          <path d="M78 100 Q80 70 110 70 Q140 70 142 100 Q132 82 110 84 Q88 82 78 100 Z" fill={HAIR} />
          <path d="M110 72 L110 82" stroke="#5a3a26" strokeWidth="2" />

          {/* Bunga jepun (kamboja) di sisi telinga */}
          <Jepun cx={150} cy={104} scale={0.75} />
          <Jepun cx={146} cy={88} scale={1} />

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
            <rect x="139" y="156" width="18" height="60" rx="9" fill={KEBAYA} />
            <rect x="139" y="206" width="18" height="8" rx="3" fill={CREAM} strokeWidth="2" />
            <circle cx="148" cy="222" r="9" fill={SKIN} />
          </g>
        </g>
      </g>

      <MoodEffects mood={mood} />
    </svg>
  );
}

/** Bunga jepun (kamboja): lima kelopak putih dengan pusat kuning. */
function Jepun({ cx, cy, scale = 1 }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} strokeWidth="2">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx="0" cy="-6" rx="4.5" ry="7" fill="#fffdf5" transform={`rotate(${deg})`} />
      ))}
      <circle cx="0" cy="0" r="4" fill="#ffd23f" />
    </g>
  );
}

/** Sokasi: wadah anyaman bambu khas Bali berisi pisang, kopi, dan jajanan pasar. */
function Sokasi() {
  const bananas = [[38, -18], [48, -6], [58, 8]];
  return (
    <g>
      {/* Mulut wadah bagian belakang */}
      <ellipse cx="64" cy="214" rx="39" ry="7" fill="#7a4b22" />

      {/* Isi: pisang, karung kopi, jaja klepon & jaja merah muda */}
      {bananas.map(([x, r]) => (
        <path
          key={x}
          transform={`rotate(${r} ${x} 212)`}
          d={`M${x - 10} 214 Q${x - 9} 194 ${x + 8} 191 Q${x - 1} 200 ${x} 214 Z`}
          fill="#ffd54f"
          strokeWidth="2"
        />
      ))}
      <path d="M66 216 L68 198 Q70 192 79 194 Q88 192 90 198 L92 216 Z" fill="#8d5a3b" strokeWidth="2.5" />
      <path d="M71 199 Q79 203 87 199" fill="none" stroke={GOLD} strokeWidth="2" />
      <ellipse cx="79" cy="207" rx="3.5" ry="4.5" fill="#4e2a14" strokeWidth="1.5" />
      <path d="M79 203 Q77 207 79 211" fill="none" stroke="#c08552" strokeWidth="1.2" />
      <circle cx="96" cy="212" r="5" fill="#6abf4b" strokeWidth="2" />
      <circle cx="98" cy="205" r="4" fill="#f48fb1" strokeWidth="2" />

      {/* Badan anyaman bambu */}
      <path d="M25 214 Q64 228 103 214 L96 248 Q64 258 32 248 Z" fill="#d9a35b" />
      <path
        d="M40 223 L42 252 M52 226 L53 255 M64 227 L64 256 M76 226 L75 255 M88 223 L86 252"
        stroke="#a8742f"
        strokeWidth="1.8"
      />
      <path d="M30 241 Q64 253 98 241" fill="none" stroke="#a8742f" strokeWidth="1.8" />

      {/* Pita lukisan merah-emas khas sokasi */}
      <path d="M27 223 Q64 237 101 223 L99 232 Q64 246 29 232 Z" fill={TERRA} strokeWidth="2.5" />
      {[36, 50, 64, 78, 92].map((x) => (
        <circle key={x} cx={x} cy={229 + 5 * (1 - ((x - 64) / 37) ** 2)} r="2" fill={GOLD} stroke="none" />
      ))}
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
