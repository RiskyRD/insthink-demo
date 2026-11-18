import { memo } from 'react';

const INK = '#1e293b';

/**
 * Latar kartun Desa Sukamaju yang membungkus konten halaman.
 * Pemandangan diletakkan di lapisan `fixed` di belakang konten (z-0),
 * sehingga panel utama (z-10) tetap mudah dibaca dan bisa di-scroll normal.
 *
 * @param {boolean} veil  lapisan krem tipis agar latar tidak terlalu ramai (default true)
 */
export default function VillageBackdrop({ children, veil = true, className = '' }) {
  return (
    <div className={`relative isolate min-h-screen bg-[#fdf6e3] ${className}`}>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <VillageScene />
        {veil && <div className="absolute inset-0 bg-gradient-to-b from-[#fdf6e3]/0 via-[#fdf6e3]/30 to-[#fdf6e3]/10" />}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Pemandangan (statis kecuali animasi CSS) — di-memo agar tidak dirender ulang.
// ----------------------------------------------------------------------
const VillageScene = memo(function VillageScene() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMaxYMax slice"
      className="h-full w-full"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <defs>
        <linearGradient id="vb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8dcf7" />
          <stop offset="55%" stopColor="#e3f4fb" />
          <stop offset="78%" stopColor="#fff1cf" />
        </linearGradient>
        <pattern id="vb-padi" width="26" height="18" patternUnits="userSpaceOnUse">
          <path d="M6 14 L9 6 M9 14 L9 4 M12 14 L9 6" stroke="#558b2f" strokeWidth="2" fill="none" />
          <path d="M19 16 L22 8 M22 16 L22 6 M25 16 L22 8" stroke="#558b2f" strokeWidth="2" fill="none" />
        </pattern>
      </defs>

      {/* Langit */}
      <rect width="1440" height="900" fill="url(#vb-sky)" />

      {/* Matahari */}
      <g>
        <g className="village-sun-rays">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="224" y="62" width="12" height="34" rx="6" fill="#ffc93c" transform={`rotate(${i * 30} 230 170)`} />
          ))}
        </g>
        <circle cx="230" cy="170" r="58" fill="#ffd23f" stroke={INK} strokeWidth="4" />
        <circle cx="210" cy="160" r="5" fill={INK} />
        <circle cx="250" cy="160" r="5" fill={INK} />
        <path d="M212 184 Q230 198 248 184" stroke={INK} strokeWidth="4" fill="none" />
        <ellipse cx="198" cy="180" rx="8" ry="5" fill="#ff9f68" opacity="0.7" />
        <ellipse cx="262" cy="180" rx="8" ry="5" fill="#ff9f68" opacity="0.7" />
      </g>

      {/* Awan & burung yang bergerak perlahan */}
      <DriftingGroup y={110} duration={95} delay={-20}><Cloud scale={1.1} /></DriftingGroup>
      <DriftingGroup y={210} duration={130} delay={-75}><Cloud scale={0.8} /></DriftingGroup>
      <DriftingGroup y={70} duration={160} delay={-120}><Cloud scale={0.65} /></DriftingGroup>
      <DriftingGroup y={260} duration={110} delay={-40}><Birds /></DriftingGroup>

      {/* Pegunungan jauh */}
      <path
        d="M0 520 L140 410 L260 470 L420 330 L560 450 L700 385 L860 480 L1000 360 L1160 460 L1300 395 L1440 470 L1440 660 L0 660 Z"
        fill="#a7c4a0"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M420 330 L455 360 L438 372 L420 356 L400 370 L388 352 Z" fill="#cfe3c9" />
      <path d="M1000 360 L1035 392 L1015 400 L1000 386 L982 398 L968 382 Z" fill="#cfe3c9" />

      {/* Bukit tengah */}
      <path
        d="M0 570 Q180 490 360 545 T720 535 T1080 525 T1440 545 L1440 720 L0 720 Z"
        fill="#8bc34a"
        stroke={INK}
        strokeWidth="3"
      />

      {/* Sawah bertingkat */}
      <path d="M0 610 Q360 578 720 606 T1440 600 L1440 660 Q1080 646 720 664 T0 660 Z" fill="#9ccc65" stroke={INK} strokeWidth="3" />
      <path d="M40 628 Q360 604 700 626" stroke="#e1f5fe" strokeWidth="5" fill="none" opacity="0.8" />
      <path d="M0 660 Q360 640 720 664 T1440 656 L1440 720 Q1080 708 720 724 T0 722 Z" fill="#7cb342" stroke={INK} strokeWidth="3" />
      <path d="M760 690 Q1000 676 1240 688" stroke="#e1f5fe" strokeWidth="5" fill="none" opacity="0.7" />
      <path d="M0 722 Q360 700 720 724 T1440 716 L1440 790 L0 790 Z" fill="#aed581" stroke={INK} strokeWidth="3" />
      <path d="M0 722 Q360 700 720 724 T1440 716 L1440 790 L0 790 Z" fill="url(#vb-padi)" />

      {/* Tanah depan & jalan setapak */}
      <path d="M0 785 Q720 752 1440 785 L1440 900 L0 900 Z" fill="#6aa84f" stroke={INK} strokeWidth="3" />
      <path d="M540 900 Q690 828 1110 792 L1172 796 Q820 852 770 900 Z" fill="#e9c46a" stroke={INK} strokeWidth="3" />
      <circle cx="700" cy="862" r="6" fill="#d4a24c" />
      <circle cx="860" cy="826" r="5" fill="#d4a24c" />

      {/* Pagar kayu */}
      <g stroke={INK} strokeWidth="3">
        <rect x="0" y="808" width="520" height="9" rx="3" fill="#b07d4f" />
        <rect x="0" y="832" width="520" height="9" rx="3" fill="#b07d4f" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${20 + i * 60} 860 L${20 + i * 60} 800 L${30 + i * 60} 790 L${40 + i * 60} 800 L${40 + i * 60} 860 Z`} fill="#c8915a" />
        ))}
      </g>

      <BananaTree x={955} y={792} scale={1} delay={0} />
      <ProductionHouse />
      <BananaTree x={1395} y={800} scale={0.85} delay={-2} />

      {/* Rumput depan */}
      {[80, 240, 400, 620, 940, 1180, 1330].map((x) => (
        <path key={x} d={`M${x} 892 q4 -18 8 0 q4 -24 8 0 q4 -16 8 0`} fill="#4e8a35" stroke={INK} strokeWidth="2.5" />
      ))}
    </svg>
  );
});

function DriftingGroup({ y, duration, delay, children }) {
  return (
    <g className="village-cloud" style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>
      <g transform={`translate(0 ${y})`}>{children}</g>
    </g>
  );
}

/** Awan: lingkaran bergaris tebal digambar dulu, lalu isian putih menutup garis dalamnya. */
function Cloud({ scale = 1 }) {
  const puffs = [
    [0, 20, 34], [38, -6, 42], [84, 8, 36], [116, 26, 28], [50, 30, 34],
  ];
  return (
    <g transform={`scale(${scale})`}>
      {puffs.map(([cx, cy, r], i) => <circle key={`o${i}`} cx={cx} cy={cy} r={r} fill={INK} stroke={INK} strokeWidth="8" />)}
      {puffs.map(([cx, cy, r], i) => <circle key={`f${i}`} cx={cx} cy={cy} r={r} fill="#ffffff" />)}
      <ellipse cx="30" cy="8" rx="14" ry="7" fill="#f0f9ff" />
    </g>
  );
}

function Birds() {
  return (
    <g stroke={INK} strokeWidth="3" fill="none">
      <path d="M0 0 q10 -10 20 0 q10 -10 20 0" />
      <path d="M50 -24 q8 -8 16 0 q8 -8 16 0" />
    </g>
  );
}

function BananaTree({ x, y, scale, delay }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeWidth="3">
      <path d="M-10 0 Q-14 -80 -4 -150 L8 -150 Q4 -80 10 0 Z" fill="#9e9d24" />
      <path d="M-6 -40 L4 -44 M-8 -90 L5 -94" stroke="#6b6a17" strokeWidth="2.5" />
      {/* Titik putar di puncak batang (koordinat lokal grup) */}
      <g className="village-sway" style={{ transformOrigin: '2px -150px', animationDelay: `${delay}s` }}>
        <path d="M2 -150 Q-70 -200 -120 -150 Q-60 -165 2 -146 Z" fill="#43a047" />
        <path d="M2 -150 Q70 -210 128 -160 Q60 -170 2 -146 Z" fill="#4caf50" />
        <path d="M2 -152 Q-30 -230 -70 -240 Q-30 -200 0 -148 Z" fill="#388e3c" />
        <path d="M2 -152 Q40 -240 80 -236 Q40 -200 4 -148 Z" fill="#43a047" />
        <path d="M-110 -152 Q-55 -168 0 -148 M118 -160 Q60 -172 2 -148" stroke="#2e7d32" strokeWidth="2" fill="none" />
        {/* Tandan pisang */}
        <g transform="translate(14 -138)">
          <path d="M0 0 L0 14" stroke="#6b6a17" />
          {[[-8, 18], [6, 20], [-2, 30], [12, 32], [-10, 34]].map(([bx, by], i) => (
            <path key={i} d={`M${bx} ${by} q6 -10 10 2 q-6 6 -10 -2 Z`} fill="#ffd54f" strokeWidth="2" />
          ))}
        </g>
      </g>
    </g>
  );
}

function ProductionHouse() {
  return (
    <g stroke={INK} strokeWidth="3">
      {/* Fondasi & dinding papan kayu */}
      <rect x="1010" y="770" width="330" height="24" rx="4" fill="#8d6e63" />
      <rect x="1030" y="612" width="290" height="162" fill="#d4a373" />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M1030 ${634 + i * 22} L1320 ${634 + i * 22}`} stroke="#a47148" strokeWidth="2" />
      ))}

      {/* Cerobong & asap menggoreng keripik */}
      <rect x="1262" y="520" width="32" height="80" fill="#8d6e63" />
      <rect x="1256" y="512" width="44" height="14" rx="3" fill="#6d4c41" />
      {[0, 2, 4].map((d) => (
        <circle key={d} className="village-smoke" cx="1278" cy="496" r="16" fill="#f5f5f5" style={{ animationDelay: `${d}s` }} />
      ))}

      {/* Atap */}
      <path d="M992 624 L1175 498 L1358 624 Z" fill="#bc6c25" />
      <path d="M1040 590 L1310 590 M1080 562 L1270 562 M1120 534 L1230 534" stroke="#8c4a12" strokeWidth="2.5" />
      <path d="M985 628 L1175 494 L1365 628" fill="none" stroke={INK} strokeWidth="7" />

      {/* Papan nama */}
      <path d="M1112 548 L1100 528 M1238 548 L1250 528" strokeWidth="3" />
      <rect x="1055" y="546" width="240" height="40" rx="8" fill="#ffd23f" strokeWidth="4" />
      <text
        x="1175"
        y="572"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill="#5c3a1e"
        stroke="none"
        fontFamily="ui-rounded, 'Segoe UI', system-ui, sans-serif"
        textLength="212"
        lengthAdjust="spacingAndGlyphs"
      >
        DAPUR SUMBER REJEKI
      </text>

      {/* Pintu */}
      <rect x="1146" y="676" width="62" height="98" rx="4" fill="#8b5a2b" />
      <path d="M1177 676 L1177 774" stroke="#5d3a1a" strokeWidth="2.5" />
      <circle cx="1196" cy="728" r="4" fill="#ffd23f" />

      {/* Jendela berlampu hangat */}
      <rect x="1056" y="648" width="62" height="52" rx="4" fill="#ffe08a" />
      <path d="M1087 648 L1087 700 M1056 674 L1118 674" stroke={INK} strokeWidth="3" />
      <rect x="1050" y="700" width="74" height="12" rx="3" fill="#a0522d" />
      {[1062, 1078, 1096, 1112].map((fx, i) => (
        <circle key={fx} cx={fx} cy="696" r="6" fill={['#ef476f', '#ffd166', '#ef476f', '#ffd166'][i]} strokeWidth="2" />
      ))}
      <rect x="1238" y="648" width="58" height="52" rx="4" fill="#ffe08a" />
      <path d="M1267 648 L1267 700 M1238 674 L1296 674" stroke={INK} strokeWidth="3" />

      {/* Meja jemur keripik di depan rumah */}
      <rect x="1238" y="742" width="78" height="10" rx="3" fill="#a47148" />
      <path d="M1246 752 L1246 784 M1308 752 L1308 784" strokeWidth="4" />
      <ellipse cx="1277" cy="740" rx="36" ry="8" fill="#e0b062" />
      {[[1262, 737], [1274, 734], [1288, 738], [1280, 742], [1268, 742]].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="6" ry="3.5" fill="#f6c945" strokeWidth="1.5" />
      ))}
    </g>
  );
}
