const INK = '#1e293b';

/** Ikon kartun 6 bahan baku kedai (viewBox 48×48). */
export default function IngredientIcon({ item, className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {ICONS[item] ?? <circle cx="24" cy="24" r="16" fill="#e2e8f0" />}
    </svg>
  );
}

const ICONS = {
  kopi: (
    <>
      <path d="M12 14 L36 14 L38 42 L10 42 Z" fill="#a0522d" />
      <path d="M12 14 Q24 6 36 14" fill="#8b4513" />
      <ellipse cx="24" cy="28" rx="5" ry="7" fill="#3b2416" />
      <path d="M24 22 Q21 28 24 34" fill="none" stroke="#a0522d" strokeWidth="2" />
    </>
  ),
  susu: (
    <>
      <path d="M18 6 L30 6 L30 12 L35 20 L35 42 L13 42 L13 20 L18 12 Z" fill="#f8fafc" />
      <rect x="17" y="3" width="14" height="5" rx="2" fill="#3b82f6" />
      <path d="M13 26 L35 26 L35 36 L13 36 Z" fill="#93c5fd" />
      <path d="M20 31 Q24 28 28 31" fill="none" strokeWidth="2" />
    </>
  ),
  gula_aren: (
    <>
      <path d="M8 22 L24 14 L40 22 L40 34 L24 42 L8 34 Z" fill="#b5651d" />
      <path d="M8 22 L24 30 L40 22 M24 30 L24 42" fill="none" />
      <circle cx="16" cy="25" r="1.5" fill="#fcd34d" stroke="none" />
      <circle cx="32" cy="25" r="1.5" fill="#fcd34d" stroke="none" />
    </>
  ),
  pisang: (
    <>
      <path d="M10 14 Q12 36 34 38 Q40 38 40 34 Q22 32 18 12 Z" fill="#f4d35e" />
      <path d="M18 12 Q14 8 10 10 L10 14" fill="#6b8e23" />
      <path d="M16 20 Q20 30 32 34" fill="none" stroke="#c9a227" strokeWidth="2" />
    </>
  ),
  cokelat: (
    <>
      <rect x="9" y="10" width="30" height="30" rx="3" fill="#4a2c1a" />
      <path d="M19 10 L19 40 M29 10 L29 40 M9 20 L39 20 M9 30 L39 30" fill="none" stroke="#6b3f1d" strokeWidth="2" />
      <path d="M9 32 L22 40 L9 40 Z" fill="#e2e8f0" strokeWidth="2" />
    </>
  ),
  kemasan: (
    <>
      <path d="M8 18 L24 10 L40 18 L40 36 L24 44 L8 36 Z" fill="#8fbc8f" />
      <path d="M8 18 L24 26 L40 18 M24 26 L24 44" fill="none" />
      <path d="M14 15 L30 23" fill="none" stroke="#fffaf0" strokeWidth="3" />
    </>
  ),
};
