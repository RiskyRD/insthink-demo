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

      {/* Pohon kelapa di pematang sawah terasering */}
      <CoconutPalm x={150} y={724} scale={0.9} delay={-1} />
      <CoconutPalm x={420} y={712} scale={0.75} delay={-3} />

      <ProductionHouse />
      <BananaTree x={1395} y={800} scale={0.85} delay={-2} />

      {/* Gerbang kedai: candi bentar mengapit jalan setapak, penjor, dan pohon jepun */}
      <FrangipaniTree x={590} y={846} />
      <CandiBentarHalf x={712} y={852} />
      <CandiBentarHalf x={922} y={852} mirror />
      <Penjor x={1002} y={852} />

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

      {/* Saka (tiang) kayu berukir di sudut bale */}
      {[1030, 1306].map((x) => (
        <g key={x}>
          <rect x={x} y="612" width="14" height="162" fill="#8b5a2b" />
          <rect x={x - 3} y="612" width="20" height="10" rx="2" fill="#e9b949" />
          <rect x={x - 3} y="762" width="20" height="10" rx="2" fill="#e9b949" />
        </g>
      ))}

      {/* Atap bale Bali bersusun dari ijuk/alang-alang */}
      <path d="M984 636 L1064 562 L1286 562 L1366 636 Q1175 650 984 636 Z" fill="#8a5a2b" />
      {Array.from({ length: 18 }, (_, i) => {
        const x = 1004 + i * 19;
        return <path key={i} d={`M${x} 636 L${x + (x < 1175 ? 10 : -10)} 600`} stroke="#5d3a1a" strokeWidth="2" />;
      })}
      <path d="M984 636 Q1175 650 1366 636" fill="none" stroke="#d9a35b" strokeWidth="5" />
      <path d="M1040 566 L1124 512 L1226 512 L1310 566 Q1175 576 1040 566 Z" fill="#9c6a35" />
      {Array.from({ length: 10 }, (_, i) => {
        const x = 1064 + i * 25;
        return <path key={i} d={`M${x} 566 L${x + (x < 1175 ? 7 : -7)} 538`} stroke="#5d3a1a" strokeWidth="2" />;
      })}
      {/* Murdha (mahkota bubungan) */}
      <path d="M1124 512 L1226 512" stroke={INK} strokeWidth="7" />
      <path d="M1160 512 L1166 488 L1175 474 L1184 488 L1190 512 Z" fill="#e9b949" />
      <circle cx="1175" cy="470" r="6" fill="#c4562f" />

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
        KEDAI KOPI BU RATNA
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

/**
 * Separuh candi bentar (gerbang terbelah khas Bali), bata terakota dengan list batu paras.
 * `x` = sisi dalam (belahan), `y` = alas. `mirror` membalik ke kanan.
 */
function CandiBentarHalf({ x, y, mirror = false }) {
  // [lebar, tinggi] tiap tingkat dari bawah ke atas (koordinat lokal, meluas ke kiri dari x=0).
  const tiers = [[74, 36], [62, 40], [50, 36], [38, 30], [26, 26]];
  let top = 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${mirror ? -1 : 1} 1)`} stroke={INK} strokeWidth="3">
      {tiers.map(([w, h], i) => {
        const y0 = top - h;
        top = y0;
        return (
          <g key={i}>
            <rect x={-w} y={y0} width={w} height={h} fill="#c4562f" />
            {i < 2 && (
              <path
                d={`M${-w} ${y0 + h / 2} L0 ${y0 + h / 2} M${-w / 2} ${y0} L${-w / 2} ${y0 + h / 2} M${-w / 4} ${y0 + h / 2} L${-w / 4} ${y0 + h}`}
                stroke="#8f3a1d"
                strokeWidth="2"
              />
            )}
            <rect x={-w - 4} y={y0 - 5} width={w + 4} height="8" rx="2" fill="#efe3c6" />
          </g>
        );
      })}
      {/* Ukiran paras dan mahkota kecil di puncak */}
      <circle cx="-31" cy="-60" r="7" fill="#efe3c6" strokeWidth="2.5" />
      <path d="M-26 -168 L-13 -186 L0 -168 Z" fill="#efe3c6" />
      <circle cx="-13" cy="-190" r="4" fill="#e9b949" strokeWidth="2.5" />
    </g>
  );
}

/** Penjor: bambu melengkung berhias janur dan lamak, dipasang di depan gerbang. */
function Penjor({ x, y }) {
  const pole = `M${x} ${y} Q${x + 6} ${y - 200} ${x - 10} ${y - 250} Q${x - 40} ${y - 310} ${x - 100} ${y - 296}`;
  return (
    <g strokeLinecap="round">
      <path d={pole} fill="none" stroke={INK} strokeWidth="10" />
      <path d={pole} fill="none" stroke="#e9c46a" strokeWidth="5" />
      {/* Lamak (hiasan janur) di bagian bawah */}
      <path d={`M${x - 12} ${y - 110} L${x + 14} ${y - 110} L${x + 10} ${y - 60} L${x - 8} ${y - 60} Z`} fill="#fff1c1" stroke={INK} strokeWidth="2.5" />
      <path d={`M${x - 6} ${y - 100} L${x + 1} ${y - 88} L${x + 8} ${y - 100} M${x - 4} ${y - 82} L${x + 1} ${y - 72} L${x + 6} ${y - 82}`} fill="none" stroke="#4f8f3a" strokeWidth="2.5" />
      {/* Sampian di ujung yang menjuntai */}
      <g className="village-sway" style={{ transformOrigin: `${x - 100}px ${y - 296}px` }}>
        <path d={`M${x - 100} ${y - 296} L${x - 100} ${y - 262}`} stroke={INK} strokeWidth="2.5" />
        <path
          d={`M${x - 110} ${y - 262} L${x - 90} ${y - 262} L${x - 94} ${y - 240} L${x - 100} ${y - 230} L${x - 106} ${y - 240} Z`}
          fill="#fff1c1"
          stroke={INK}
          strokeWidth="2.5"
        />
      </g>
      {/* Janur kecil di sepanjang lengkungan */}
      {[[x - 30, y - 290], [x - 55, y - 300], [x - 78, y - 300]].map(([jx, jy]) => (
        <path key={jx} d={`M${jx} ${jy} q-4 14 2 22`} fill="none" stroke="#e9c46a" strokeWidth="3" />
      ))}
    </g>
  );
}

/** Pohon kelapa melengkung dengan pelepah bergoyang dan buah kelapa. */
function CoconutPalm({ x, y, scale = 1, delay = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeWidth="3">
      <path d="M-8 0 Q-2 -120 30 -230 L42 -226 Q14 -120 8 0 Z" fill="#a1785a" />
      {[-40, -85, -130, -175].map((ty, i) => (
        <path key={ty} d={`M${-5 + i * 7} ${ty} L${10 + i * 8} ${ty - 4}`} stroke="#6d4c33" strokeWidth="2.5" />
      ))}
      <g className="village-sway" style={{ transformOrigin: '36px -228px', animationDelay: `${delay}s` }}>
        {[
          'M36 -228 Q-20 -270 -70 -220 Q-20 -246 36 -224 Z',
          'M36 -228 Q90 -280 140 -226 Q90 -250 36 -224 Z',
          'M36 -230 Q10 -300 -30 -300 Q8 -270 34 -226 Z',
          'M36 -230 Q70 -306 110 -290 Q70 -266 38 -226 Z',
          'M36 -226 Q-10 -220 -40 -180 Q0 -206 36 -222 Z',
          'M36 -226 Q90 -214 112 -172 Q76 -204 36 -222 Z',
        ].map((d, i) => (
          <path key={i} d={d} fill={i % 2 ? '#4caf50' : '#43a047'} />
        ))}
        {[[28, -218], [42, -216], [35, -208]].map(([cx, cy]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="8" fill="#7a5230" />
        ))}
      </g>
    </g>
  );
}

/** Pohon jepun (kamboja) bercabang dengan bunga putih-kuning. */
function FrangipaniTree({ x, y }) {
  const tips = [[-58, -118], [-20, -150], [26, -146], [62, -110]];
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth="3">
      <path d="M-10 0 Q-12 -40 -4 -70 L8 -70 Q12 -40 10 0 Z" fill="#9b8b7a" />
      {tips.map(([tx, ty]) => (
        <path key={tx} d={`M2 -66 Q${tx / 2} ${ty / 2 - 20} ${tx} ${ty}`} fill="none" stroke="#9b8b7a" strokeWidth="9" />
      ))}
      {tips.map(([tx, ty]) => (
        <path key={`o${tx}`} d={`M2 -66 Q${tx / 2} ${ty / 2 - 20} ${tx} ${ty}`} fill="none" stroke={INK} strokeWidth="2" opacity="0.35" />
      ))}
      {tips.map(([tx, ty]) => (
        <g key={`l${tx}`}>
          <ellipse cx={tx - 14} cy={ty - 4} rx="18" ry="8" fill="#4f8f3a" transform={`rotate(-25 ${tx - 14} ${ty - 4})`} />
          <ellipse cx={tx + 14} cy={ty - 4} rx="18" ry="8" fill="#43a047" transform={`rotate(25 ${tx + 14} ${ty - 4})`} />
          <ellipse cx={tx} cy={ty - 14} rx="8" ry="16" fill="#4caf50" />
          <g transform={`translate(${tx} ${ty - 6})`} strokeWidth="2">
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse key={deg} cx="0" cy="-6" rx="4.5" ry="7" fill="#fffdf5" transform={`rotate(${deg})`} />
            ))}
            <circle r="4" fill="#ffd23f" />
          </g>
        </g>
      ))}
    </g>
  );
}
