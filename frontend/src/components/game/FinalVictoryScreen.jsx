import { useEffect, useMemo, useState } from 'react';
import { Clock, Code2, Coins, GraduationCap, Medal, Trophy } from 'lucide-react';
import BuRatnaCharacter from './BuRatnaCharacter';
import LeaderboardModal from './LeaderboardModal';
import { RoleCharacter } from './ShopCharacters';
import { useGameAudio } from './useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './theme';
import { formatDuration, formatRupiah } from '../../lib/api';

const CONFETTI_COLORS = ['#ffd23f', '#c4562f', '#4f8f3a', '#a5d68f', '#f4a582', '#e9b949', '#c4b5fd'];

/**
 * Layar kelulusan (phase === 'finished'): avatar pilihan kedua pemain,
 * ringkasan skor dari server (`ending.score`), dan Papan Peringkat.
 */
export default function FinalVictoryScreen({ me, partner, ending, token }) {
  const { playClick, playSuccess } = useGameAudio();
  const [boardOpen, setBoardOpen] = useState(false);
  const score = ending?.score;
  const players = [me, partner].filter(Boolean).sort((a, b) => (a.role === 'cashier' ? -1 : 0) - (b.role === 'cashier' ? -1 : 0));
  const confetti = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      left: (i * 29) % 100,
      size: 8 + (i % 4) * 3,
      delay: (i % 9) * 0.3,
      duration: 3 + (i % 5) * 0.6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })),
    [],
  );

  useEffect(() => {
    playSuccess();
  }, [playSuccess]);

  const rows = score
    ? [
        { icon: GraduationCap, label: 'Kelulusan semua bab', value: score.completion, max: 1000, note: 'Prolog, Bab 1, Bab Bonus, Bab 3' },
        { icon: Coins, label: 'Bab Bonus: laba kedai', value: score.bonus, max: 700, note: `Laba ${formatRupiah(score.profit)} (1 poin per Rp100)` },
        { icon: Code2, label: 'Ketelitian coding', value: score.coding, max: 300, note: `${score.chapter1_failures}× gagal uji Bab 1 · ${score.chapter3_attempts}× percobaan Bab 3 (berdua)` },
      ]
    : [];

  return (
    <section className="relative mx-auto max-w-4xl overflow-hidden" aria-labelledby="final-title">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{ left: `${c.left}%`, width: c.size, height: c.size * 0.45, backgroundColor: c.color, borderRadius: 2, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
          />
        ))}
      </div>

      <div className={`${CARD} celebration-pop relative overflow-hidden`}>
        <div className="border-b-2 border-slate-800 px-6 py-5 text-center" style={WOOD_BG}>
          <Trophy className="trophy-bounce mx-auto h-12 w-12 text-[#ffd23f] drop-shadow-[2px_2px_0_#1e293b]" aria-hidden />
          <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-[#ffd23f]">Lulus Pelatihan INSTHINK</p>
          <h2 id="final-title" className="text-3xl font-black text-[#fff3d6] [text-shadow:3px_3px_0_#3e2210] sm:text-4xl">Selamat, Kalian Lulus!</h2>
        </div>

        <div className="p-6 text-center">
          <p className="mx-auto max-w-xl text-slate-700">
            {ending?.message ?? 'Kedai Kopi & Camilan Desa kini punya kasir, gudang, dan Money Tracker yang ditulis sendiri oleh kalian.'}
          </p>

          <div className="mt-5 flex flex-wrap items-end justify-center gap-3">
            {players[0] && <RoleCharacter role={players[0].role} gender={players[0].avatar_skin} mood="happy" size={120} caption={players[0].name} />}
            <BuRatnaCharacter mood="happy" size={130} />
            {players[1] && <RoleCharacter role={players[1].role} gender={players[1].avatar_skin} mood="happy" size={120} caption={players[1].name} />}
          </div>

          {score && (
            <div className="mx-auto mt-6 max-w-2xl">
              <div className="stamp-in mx-auto w-fit rounded-2xl border-2 border-slate-800 bg-[#ffd23f] px-6 py-3 shadow-[4px_4px_0px_#1e293b]">
                <p className="text-xs font-black uppercase tracking-wider text-slate-800">Skor Tim</p>
                <p className="font-mono text-4xl font-black text-slate-900">
                  {score.total}<span className="text-lg text-slate-700"> / {score.max}</span>
                </p>
              </div>

              <ul className="mt-4 space-y-2 text-left">
                {rows.map(({ icon: Icon, label, value, max, note }) => (
                  <li key={label} className="rounded-xl border-2 border-slate-800 bg-white px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-[#c4562f]" aria-hidden />
                      <span className="flex-1 text-sm font-black text-slate-900">{label}</span>
                      <span className="font-mono text-sm font-black text-slate-900">{value}/{max}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border-2 border-slate-800 bg-slate-100">
                      <div className="h-full bg-[#4f8f3a]" style={{ width: `${Math.round((value / max) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{note}</p>
                  </li>
                ))}
              </ul>

              {score.duration_seconds != null && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700">
                  <Clock className="h-4 w-4" aria-hidden /> Total waktu bermain: {formatDuration(score.duration_seconds)}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => { playClick(); setBoardOpen(true); }}
            className={`${TACTILE} prolog-cta-pulse mx-auto mt-6 flex items-center gap-2 rounded-2xl bg-[#ffd23f] px-6 py-3.5 text-lg font-black text-slate-900`}
          >
            <Medal className="h-6 w-6" aria-hidden /> Lihat Papan Peringkat
          </button>
        </div>
      </div>

      {boardOpen && <LeaderboardModal token={token} onClose={() => { playClick(); setBoardOpen(false); }} />}
    </section>
  );
}
