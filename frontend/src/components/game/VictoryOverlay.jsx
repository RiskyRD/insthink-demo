import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, Clock, PartyPopper, RotateCw, Star } from 'lucide-react';
import BuRatnaCharacter from './BuRatnaCharacter';
import { ROLE_LABEL, formatDuration } from '../../lib/api';

const INK = '#1e293b';
const CONFETTI = ['#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#facc15'];

/**
 * Layar kemenangan kartun penuh untuk KEDUA peran. Dibuka serentak karena kedua
 * layar menerima event `mission.evaluated` yang sama dari Reverb.
 *
 * @param {'mission'|'final'} variant  mission = satu pos selesai, final = Chapter 1 tamat
 * @param {object} evaluation  payload evaluasi yang lulus (untuk variant mission)
 */
export default function VictoryOverlay({ open, variant, evaluation, room, ending, history, onClose }) {
  const closeRef = useRef(null);
  const isFinal = variant === 'final';

  const coins = useMemo(
    () => Array.from({ length: isFinal ? 26 : 14 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2.6 + Math.random() * 2.4,
      size: 18 + Math.random() * 14,
    })),
    [isFinal],
  );
  const confetti = useMemo(
    () => Array.from({ length: isFinal ? 60 : 24 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 2.8 + Math.random() * 2.5,
      size: 6 + Math.random() * 7,
      color: CONFETTI[i % CONFETTI.length],
    })),
    [isFinal],
  );

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalSeconds =
    ending?.total_duration_seconds ??
    (room.started_at && room.completed_at
      ? Math.round((new Date(room.completed_at) - new Date(room.started_at)) / 1000)
      : null);

  const perMission = Array.from({ length: room.total_missions }, (_, i) => {
    const n = i + 1;
    const logs = history.filter((h) => h.mission_number === n);
    return { n, attempts: logs.length, duration: logs.find((h) => h.is_passed)?.duration_seconds ?? null };
  });

  const dialogue = isFinal
    ? 'Luar biasa! Mesin kasir pintar kita sudah siap. Keripik pisang Desa Sukamaju resmi naik kelas dan siap dijual ke Pasar Kecamatan. Terima kasih, tim!'
    : `Pos ${evaluation?.mission_number} beres! Hitungannya pas dengan catatan usaha. Ayo lanjut ke pos berikutnya!`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#3b2410]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="victory-title">
      {/* Sinar matahari berputar, koin & konfeti berjatuhan */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="victory-rays absolute left-1/2 top-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        {confetti.map((c, i) => (
          <span
            key={`c${i}`}
            className="confetti-piece"
            style={{ left: `${c.left}%`, width: c.size, height: c.size * 0.45, backgroundColor: c.color, borderRadius: 2, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
          />
        ))}
        {coins.map((c, i) => (
          <svg key={`k${i}`} viewBox="0 0 32 32" className="coin-fall" style={{ left: `${c.left}%`, width: c.size, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}>
            <circle cx="16" cy="16" r="13" fill="#ffd23f" stroke={INK} strokeWidth="2.5" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="#d69e00" strokeWidth="2" />
            <text x="16" y="20" textAnchor="middle" fontSize="10" fontWeight="900" fill="#8a5a00" fontFamily="system-ui, sans-serif">Rp</text>
          </svg>
        ))}
      </div>

      <div className="celebration-pop relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-slate-800 bg-[#fffaf0] shadow-[8px_8px_0px_#1e293b]">
        {/* Pita judul */}
        <div className="border-b-2 border-slate-800 bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-5 text-center text-white">
          <div className="mb-1 flex justify-center gap-1" aria-hidden>
            {Array.from({ length: room.total_missions }, (_, i) => (
              <Star
                key={i}
                className="h-7 w-7"
                fill={isFinal || i < (evaluation?.mission_number ?? 0) ? '#ffd23f' : 'transparent'}
                stroke={INK}
                strokeWidth={2.5}
              />
            ))}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-100">
            {isFinal ? 'Chapter 1 Tamat' : `Pos ${evaluation?.mission_number} dari ${room.total_missions} Selesai`}
          </p>
          <h2 id="victory-title" className="mt-1 text-2xl font-black [text-shadow:2px_2px_0_#134e4a] sm:text-3xl">
            {isFinal ? 'Usaha Desa Sukamaju Berhasil!' : 'Misi Berhasil!'}
          </h2>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex justify-center">
            <BuRatnaCharacter mood="happy" dialogue={dialogue} size={isFinal ? 150 : 120} />
          </div>

          {isFinal && (
            <div className="flex items-end justify-center gap-3 sm:gap-5" aria-label="Keripik pisang kemasan siap jual">
              {['#ffd23f', '#ff9f68', '#7dd3a8'].map((color, i) => (
                <ChipPouch key={color} color={color} delay={0.2 + i * 0.15} big={i === 1} />
              ))}
            </div>
          )}

          {/* Ringkasan tim */}
          <div className="rounded-2xl border-2 border-slate-800 bg-white p-4">
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {room.players.map((p) => (
                <span key={p.role} className="rounded-full border-2 border-slate-800 bg-[#ffe8a3] px-3 py-1 text-sm font-bold">
                  {p.name} <span className="font-semibold text-slate-600">· {ROLE_LABEL[p.role]}</span>
                </span>
              ))}
            </div>

            {isFinal ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <Stat icon={Clock} label="Total waktu tim" value={formatDuration(totalSeconds)} />
                  <Stat icon={RotateCw} label="Total percobaan" value={ending?.total_attempts ?? history.length} />
                </div>
                <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                  {perMission.map((m) => (
                    <li key={m.n} className="rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 text-center text-xs">
                      <p className="font-black text-slate-900">Pos {m.n}</p>
                      <p className="text-slate-600">{formatDuration(m.duration)} · {m.attempts}× uji</p>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-center">
                <Stat icon={Clock} label="Waktu pos ini" value={formatDuration(evaluation?.duration_seconds)} />
                <Stat icon={RotateCw} label="Berhasil pada" value={`percobaan ke-${evaluation?.attempt_number ?? '-'}`} />
              </div>
            )}
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-800 bg-[#ffd23f] px-4 py-3 text-lg font-black text-slate-900 shadow-[0_6px_0_#b45309,0_6px_0_2px_#1e293b] transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_#b45309,0_2px_0_2px_#1e293b]"
          >
            {isFinal ? <PartyPopper className="h-6 w-6" aria-hidden /> : <ArrowRight className="h-6 w-6" aria-hidden />}
            {isFinal ? 'Hore, tutup perayaan!' : `Lanjut ke Pos ${(evaluation?.mission_number ?? 0) + 1}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border-2 border-slate-800 bg-[#fffaf0] p-2">
      <Icon className="mx-auto mb-0.5 h-4 w-4 text-emerald-600" aria-hidden />
      <p className="font-black text-slate-900">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

/** Kemasan keripik pisang "Sumber Rejeki" siap jual. */
function ChipPouch({ color, delay, big }) {
  return (
    <svg
      viewBox="0 0 80 110"
      className="pouch-pop h-auto"
      style={{ width: big ? 96 : 76, animationDelay: `${delay}s` }}
      stroke={INK}
      strokeWidth="3"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 14 L14 8 L20 14 L26 8 L32 14 L38 8 L44 14 L50 8 L56 14 L62 8 L68 14 L72 10 L74 98 Q40 106 6 98 L8 14 Z" fill={color} />
      <path d="M9 22 L71 22" strokeWidth="2.5" />
      <ellipse cx="40" cy="52" rx="22" ry="16" fill="#fff8e1" />
      {[[30, 50, -20], [42, 46, 15], [50, 56, -10], [36, 58, 25]].map(([cx, cy, r]) => (
        <ellipse key={`${cx}${cy}`} cx={cx} cy={cy} rx="7" ry="4.5" fill="#f6c945" strokeWidth="2" transform={`rotate(${r} ${cx} ${cy})`} />
      ))}
      <rect x="12" y="74" width="56" height="18" rx="4" fill="#fffaf0" strokeWidth="2.5" />
      <text x="40" y="82" textAnchor="middle" fontSize="7" fontWeight="900" fill="#5c3a1e" stroke="none" fontFamily="system-ui, sans-serif" textLength="48" lengthAdjust="spacingAndGlyphs">KERIPIK PISANG</text>
      <text x="40" y="89.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#2a9d8f" stroke="none" fontFamily="system-ui, sans-serif">Sumber Rejeki</text>
      <path d="M62 30 q5 -6 8 0 q-4 3 -8 0 Z" fill="#43a047" strokeWidth="2" />
    </svg>
  );
}
