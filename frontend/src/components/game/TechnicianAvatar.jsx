const INK = '#1e293b';
const SKIN = '#c68642';
const HOODIE = '#3b82f6';
const MOUTH = '#7a2e2e';
const TONGUE = '#f28b82';

const LABEL = {
  offline: 'sedang tidak terhubung',
  idle: 'menunggu',
  typing: 'sedang mengetik kode',
  thinking: 'sedang menjalankan program',
  happy: 'senang karena berhasil',
  shocked: 'kaget karena programnya gagal',
};

/**
 * Avatar kartun Teknisi Sistem di balik laptop (viewBox 200×170).
 * @param {'offline'|'idle'|'typing'|'thinking'|'happy'|'shocked'} state
 */
export default function TechnicianAvatar({ state = 'idle', size = 170, className = '' }) {
  const bodyAnim = { idle: 'tech-breathe', thinking: 'tech-breathe', happy: 'tech-hop', shocked: 'ratna-shake' }[state] ?? '';
  const armsUp = state === 'happy' || state === 'shocked';

  return (
    <svg
      viewBox="0 0 200 170"
      style={{ width: size }}
      className={`h-auto overflow-visible transition-[filter] duration-500 ${state === 'offline' ? 'opacity-70 grayscale' : ''} ${className}`}
      role="img"
      aria-label={`Avatar Teknisi ${LABEL[state] ?? ''}`}
      stroke={INK}
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Meja */}
      <rect x="8" y="156" width="184" height="12" rx="4" fill="#a47148" />

      <g className={bodyAnim}>
        {/* Badan berkerudung hoodie */}
        <path d="M56 120 Q100 100 144 120 L154 158 L46 158 Z" fill={HOODIE} />
        <path d="M74 110 Q100 126 126 110" fill="none" stroke="#1d4ed8" />

        {!armsUp && <Arms pose="desk" />}

        {/* Kepala */}
        <circle cx="100" cy="70" r="30" fill={SKIN} />
        <path d="M70 64 Q70 36 100 36 Q132 36 130 62 Q122 50 108 52 Q96 46 86 54 Q76 54 70 64 Z" fill="#2d1b12" />
        <ellipse cx="85" cy="82" rx="6" ry="3.5" fill={TONGUE} stroke="none" opacity="0.55" />
        <ellipse cx="115" cy="82" rx="6" ry="3.5" fill={TONGUE} stroke="none" opacity="0.55" />
        <Brows state={state} />
        <Eyes state={state} />
        <Mouth state={state} />

        {/* Headset */}
        <path d="M66 68 Q66 28 100 28 Q134 28 134 68" fill="none" strokeWidth="7" />
        <path d="M66 68 Q66 28 100 28 Q134 28 134 68" fill="none" stroke="#64748b" strokeWidth="3.5" />
        <rect x="60" y="60" width="13" height="21" rx="5" fill="#475569" />
        <rect x="127" y="60" width="13" height="21" rx="5" fill="#475569" />
        <path d="M133 78 Q133 95 114 95" fill="none" stroke="#475569" />
        <circle cx="112" cy="95" r="3.5" fill={INK} />

        {/* Laptop (bagian belakang layar menghadap kita) */}
        <path d="M60 110 L140 110 L144 152 L56 152 Z" fill="#94a3b8" />
        <path d="M66 116 L134 116 L137 147 L63 147 Z" fill="none" stroke="#cbd5e1" strokeWidth="2" />
        <path d="M46 152 L154 152 L160 160 L40 160 Z" fill="#cbd5e1" />
        <LidEmblem state={state} />

        {armsUp ? <Arms pose={state} /> : <Hands typing={state === 'typing'} />}
      </g>

      <Effects state={state} />
    </svg>
  );
}

function Arms({ pose }) {
  const paths = {
    desk: ['M60 124 Q44 138 52 150', 'M140 124 Q156 138 148 150'],
    happy: ['M62 122 Q42 100 46 76', 'M138 122 Q158 100 154 76'],
    shocked: ['M62 122 Q48 106 70 92', 'M138 122 Q152 106 130 92'],
  }[pose];
  const hands = { happy: [[46, 72], [154, 72]], shocked: [[72, 90], [128, 90]] }[pose];
  return (
    <g fill="none">
      {paths.map((d) => <path key={`o${d}`} d={d} strokeWidth="15" />)}
      {paths.map((d) => <path key={`f${d}`} d={d} stroke={HOODIE} strokeWidth="9" />)}
      {hands?.map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="7.5" fill={SKIN} />)}
    </g>
  );
}

function Hands({ typing }) {
  return (
    <g>
      <circle className={typing ? 'tech-type' : ''} cx="52" cy="150" r="7.5" fill={SKIN} />
      <circle className={typing ? 'tech-type' : ''} style={{ animationDelay: '0.08s' }} cx="148" cy="150" r="7.5" fill={SKIN} />
    </g>
  );
}

function Eyes({ state }) {
  if (state === 'offline') {
    return <g fill="none"><path d="M83 72 Q88 76 93 72" /><path d="M107 72 Q112 76 117 72" /></g>;
  }
  if (state === 'happy') {
    return <g fill="none" strokeWidth="3.5"><path d="M82 74 Q88 66 94 74" /><path d="M106 74 Q112 66 118 74" /></g>;
  }
  if (state === 'shocked') {
    return (
      <g>
        <circle cx="88" cy="71" r="7" fill="#fff" strokeWidth="2.5" />
        <circle cx="112" cy="71" r="7" fill="#fff" strokeWidth="2.5" />
        <circle cx="88" cy="72" r="2.5" fill={INK} stroke="none" />
        <circle cx="112" cy="72" r="2.5" fill={INK} stroke="none" />
      </g>
    );
  }
  const [dx, dy] = { typing: [0, 3], thinking: [2, -3] }[state] ?? [0, 0];
  return (
    <g className="ratna-blink" stroke="none">
      {[88, 112].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx + dx} cy={72 + dy} rx="4" ry="5" fill={INK} />
          <circle cx={cx + dx + 1.3} cy={70 + dy} r="1.4" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Brows({ state }) {
  const d = {
    typing: ['M81 62 L94 65', 'M106 65 L119 62'],
    thinking: ['M81 63 L94 63', 'M106 60 Q113 54 119 59'],
    happy: ['M81 60 Q88 55 95 60', 'M105 60 Q112 55 119 60'],
    shocked: ['M81 60 Q88 56 95 53', 'M105 53 Q112 56 119 60'],
  }[state] ?? ['M81 63 Q88 60 95 63', 'M105 63 Q112 60 119 63'];
  return <g fill="none" strokeWidth="3.5"><path d={d[0]} /><path d={d[1]} /></g>;
}

function Mouth({ state }) {
  switch (state) {
    case 'typing':
      return (
        <g>
          <path d="M94 89 L106 89" fill="none" />
          <ellipse cx="104" cy="92" rx="3" ry="2.6" fill={TONGUE} strokeWidth="2" />
        </g>
      );
    case 'thinking':
      return <path d="M94 90 Q98 87 102 90 Q106 93 108 89" fill="none" />;
    case 'happy':
      return (
        <g>
          <path d="M88 86 Q100 104 112 86 Z" fill={MOUTH} />
          <path d="M94 96 Q100 100 106 96 Q100 93 94 96 Z" fill={TONGUE} stroke="none" />
        </g>
      );
    case 'shocked':
      return <ellipse cx="100" cy="91" rx="5" ry="6.5" fill={MOUTH} />;
    case 'offline':
      return <path d="M97 89 Q100 92 103 89" fill="none" />;
    default:
      return <path d="M91 87 Q100 95 109 87" fill="none" />;
  }
}

function LidEmblem({ state }) {
  if (state === 'thinking') {
    return (
      <g>
        <circle cx="100" cy="131" r="9" fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <path className="tech-spin" d="M100 122 A9 9 0 0 1 109 131" fill="none" stroke="#22c55e" strokeWidth="4" />
      </g>
    );
  }
  if (state === 'happy') {
    return (
      <g className="ratna-pop">
        <circle cx="100" cy="131" r="11" fill="#22c55e" />
        <path d="M94 131 L98.5 135.5 L106 127" fill="none" stroke="#fff" strokeWidth="3.5" />
      </g>
    );
  }
  if (state === 'shocked') {
    return (
      <g className="ratna-pop">
        <circle cx="100" cy="131" r="11" fill="#ef4444" />
        <path d="M95 126 L105 136 M105 126 L95 136" stroke="#fff" strokeWidth="3.5" />
      </g>
    );
  }
  // Stiker pisang
  return <path d="M90 133 Q100 143 111 126 Q104 136 90 133 Z" fill="#ffd54f" strokeWidth="2" />;
}

function Effects({ state }) {
  if (state === 'offline') {
    return (
      <g fill="#64748b" stroke="none" fontWeight="900" fontFamily="ui-rounded, system-ui, sans-serif">
        <text className="tech-zzz" x="140" y="44" fontSize="16">Z</text>
        <text className="tech-zzz" x="150" y="32" fontSize="12" style={{ animationDelay: '0.8s' }}>z</text>
      </g>
    );
  }
  if (state === 'typing') {
    return (
      <g fill="#16a34a" stroke="none" fontWeight="900" fontFamily="ui-monospace, Consolas, monospace" fontSize="12">
        {[['</>', 70, 0], ['{ }', 112, 0.35], [';', 96, 0.7], ['=', 128, 0.55]].map(([t, x, d]) => (
          <text key={t} className="tech-glyph" x={x} y="108" style={{ animationDelay: `${d}s` }}>{t}</text>
        ))}
      </g>
    );
  }
  if (state === 'thinking') {
    return (
      <g>
        <g className="tech-spin">
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="157" y="10" width="8" height="10" rx="2" fill="#94a3b8" strokeWidth="2" transform={`rotate(${i * 45} 161 28)`} />
          ))}
          <circle cx="161" cy="28" r="11" fill="#cbd5e1" strokeWidth="2.5" />
          <circle cx="161" cy="28" r="4" fill="#fff" strokeWidth="2" />
        </g>
        {[[140, 50, 2.5, 0], [148, 42, 3.5, 0.3]].map(([cx, cy, r, d]) => (
          <circle key={cx} className="ratna-think-dot" cx={cx} cy={cy} r={r} fill="#fff" strokeWidth="2" style={{ animationDelay: `${d}s` }} />
        ))}
      </g>
    );
  }
  if (state === 'happy') {
    return (
      <g>
        {[[30, 50, 0], [170, 46, 0.3], [24, 100, 0.6], [178, 98, 0.15], [100, 14, 0.45]].map(([cx, cy, d]) => (
          <path
            key={cx}
            className="ratna-coin"
            style={{ animationDelay: `${d}s` }}
            d={`M${cx} ${cy - 8} L${cx + 2.5} ${cy - 2.5} L${cx + 8} ${cy - 2} L${cx + 3.5} ${cy + 2} L${cx + 5} ${cy + 8} L${cx} ${cy + 4.5} L${cx - 5} ${cy + 8} L${cx - 3.5} ${cy + 2} L${cx - 8} ${cy - 2} L${cx - 2.5} ${cy - 2.5} Z`}
            fill="#ffd23f"
            strokeWidth="2"
          />
        ))}
      </g>
    );
  }
  if (state === 'shocked') {
    return (
      <g>
        <path className="ratna-sweat" d="M138 50 q5 8 0 12 q-5 -4 0 -12 Z" fill="#7dd3fc" strokeWidth="2" />
        <path className="ratna-sweat" d="M62 56 q4 7 0 10 q-4 -3 0 -10 Z" fill="#7dd3fc" strokeWidth="2" style={{ animationDelay: '0.5s' }} />
        <g className="ratna-pop">
          <path d="M164 12 L160 38" stroke="#ef4444" strokeWidth="7" />
          <circle cx="158" cy="49" r="4.5" fill="#ef4444" />
        </g>
      </g>
    );
  }
  return null;
}
