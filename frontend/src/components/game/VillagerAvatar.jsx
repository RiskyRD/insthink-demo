const INK = '#1e293b';

export const VILLAGERS = [
  { name: 'Pak Darto', greeting: 'Saya mau borong keripik buat hajatan!' },
  { name: 'Bu Sumi', greeting: 'Titip keripik untuk dijual di warung, ya.' },
  { name: 'Dik Bayu', greeting: 'Mau beli keripik buat bekal sekolah!' },
  { name: 'Mbah Karso', greeting: 'Keripik yang renyah satu, Nak.' },
];

/** Avatar kepala-bahu warga Desa Sukamaju (pelanggan simulasi). */
export default function VillagerAvatar({ index = 0, className = 'h-14 w-14' }) {
  const v = index % VILLAGERS.length;
  return (
    <svg viewBox="0 0 64 64" className={className} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <circle cx="32" cy="32" r="31" fill={['#fef3c7', '#fce7f3', '#e0f2fe', '#ede9fe'][v]} stroke="none" />
      {v === 0 && <PakDarto />}
      {v === 1 && <BuSumi />}
      {v === 2 && <DikBayu />}
      {v === 3 && <MbahKarso />}
    </svg>
  );
}

function Face({ skin, cy = 32 }) {
  return (
    <g>
      <circle cx="32" cy={cy} r="13" fill={skin} />
      <circle cx="27.5" cy={cy} r="1.8" fill={INK} stroke="none" />
      <circle cx="36.5" cy={cy} r="1.8" fill={INK} stroke="none" />
      <path d={`M27.5 ${cy + 5} Q32 ${cy + 9} 36.5 ${cy + 5}`} fill="none" strokeWidth="2" />
      <ellipse cx="24.5" cy={cy + 4} rx="2.5" ry="1.5" fill="#f28b82" stroke="none" opacity="0.6" />
      <ellipse cx="39.5" cy={cy + 4} rx="2.5" ry="1.5" fill="#f28b82" stroke="none" opacity="0.6" />
    </g>
  );
}

const Shoulders = ({ fill }) => <path d="M10 64 Q12 47 32 45 Q52 47 54 64 Z" fill={fill} />;

function PakDarto() {
  return (
    <g>
      <Shoulders fill="#4caf50" />
      <Face skin="#c68642" cy={33} />
      {/* Caping */}
      <path d="M6 25 L32 8 L58 25 Q32 30 6 25 Z" fill="#e9c46a" />
      <path d="M20 22 Q32 25 44 22" fill="none" stroke="#b7791f" strokeWidth="2" />
    </g>
  );
}

function BuSumi() {
  return (
    <g>
      <Shoulders fill="#8b5cf6" />
      <path d="M17 32 Q16 14 32 14 Q48 14 47 32 Q49 44 52 50 Q32 57 12 50 Q15 44 17 32 Z" fill="#ec4899" />
      <Face skin="#f1c27d" cy={32} />
      <path d="M20 27 Q22 17 32 17 Q42 17 44 27 Q38 21 32 21 Q26 21 20 27 Z" fill="#ec4899" />
    </g>
  );
}

function DikBayu() {
  return (
    <g>
      <Shoulders fill="#ffffff" />
      <path d="M26 46 L32 54 L38 46" fill="none" />
      <path d="M30 50 L32 60 L34 50 Z" fill="#ef4444" strokeWidth="1.5" />
      <Face skin="#e0ac69" cy={32} />
      <path d="M18 30 Q17 16 32 16 Q47 16 46 30 Q40 22 32 23 Q24 22 18 30 Z" fill="#1f1209" />
    </g>
  );
}

function MbahKarso() {
  return (
    <g>
      <Shoulders fill="#a16207" />
      <Face skin="#d2a679" cy={33} />
      <path d="M19 21 Q32 14 45 21 L45 26 Q32 22 19 26 Z" fill={INK} />
      <circle cx="27.5" cy="33" r="4" fill="none" strokeWidth="1.8" />
      <circle cx="36.5" cy="33" r="4" fill="none" strokeWidth="1.8" />
      <path d="M31.5 33 L32.5 33" strokeWidth="1.8" />
      <path d="M27 37.5 Q32 35.5 37 37.5" fill="none" stroke="#f8fafc" strokeWidth="3" />
    </g>
  );
}
