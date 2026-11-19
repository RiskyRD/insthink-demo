import { useEffect, useRef, useState } from 'react';
import { Award, Loader2, X } from 'lucide-react';
import { AvatarHead } from './ShopCharacters';
import { CARD, WOOD_BG } from './theme';
import { api, formatDuration, formatRupiah, ROLE_LABEL } from '../../lib/api';

const MEDAL = ['bg-[#ffd23f]', 'bg-slate-200', 'bg-[#f4a582]'];

/**
 * Papan Peringkat (GET /api/leaderboard): tim yang lulus dalam 24 jam terakhir.
 * Setiap nama pemain diberi mini-avatar sesuai peran & `avatar_skin`
 * (male = udeng, female = kebaya).
 */
export default function LeaderboardModal({ token, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    api('/leaderboard', { token })
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message));
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#3b2410]/70 p-4" role="dialog" aria-modal="true" aria-labelledby="board-title">
      <div className={`${CARD} celebration-pop my-auto w-full max-w-2xl overflow-hidden`}>
        <div className="flex items-center gap-2 border-b-2 border-slate-800 px-4 py-3" style={WOOD_BG}>
          <Award className="h-6 w-6 text-[#ffd23f]" aria-hidden />
          <h2 id="board-title" className="flex-1 text-xl font-black text-[#fff3d6] [text-shadow:2px_2px_0_#3e2210]">Papan Peringkat</h2>
          <button type="button" onClick={onClose} aria-label="Tutup papan peringkat" className="rounded-lg border-2 border-slate-800 bg-white p-1 text-slate-900">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {error && <p className="rounded-lg border-2 border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
          {!data && !error && (
            <p className="flex items-center justify-center gap-2 py-8 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Memuat peringkat…</p>
          )}
          {data && (
            <>
              <p className="mb-3 text-sm text-slate-600">
                Tim yang lulus dalam 24 jam terakhir. {data.my_rank ? <b className="text-slate-900">Tim kalian peringkat {data.my_rank} dari {data.total_teams} tim.</b> : null}
              </p>
              {data.entries.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Belum ada tim yang lulus.</p>}
              <ol className="space-y-2">
                {data.entries.map((e) => (
                  <li
                    key={e.rank}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${e.is_mine ? 'border-slate-800 bg-[#fff1c1] shadow-[3px_3px_0px_#1e293b]' : 'border-slate-200 bg-white'}`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-slate-800 font-black ${MEDAL[e.rank - 1] ?? 'bg-white'}`}>{e.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {e.players.map((p) => (
                          <span key={p.role} className="flex min-w-0 items-center gap-1.5" title={`${p.name} · ${ROLE_LABEL[p.role]}`}>
                            <AvatarHead role={p.role} gender={p.avatar_skin} size={28} />
                            <span className="min-w-0">
                              <span className="block max-w-[9rem] truncate text-sm font-black leading-tight text-slate-900">{p.name}</span>
                              <span className="block text-[10px] font-semibold leading-tight text-slate-500">{ROLE_LABEL[p.role]}</span>
                            </span>
                          </span>
                        ))}
                        {e.is_mine && <span className="rounded-full bg-[#4f8f3a] px-1.5 text-[10px] font-black text-white">Tim kalian</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {e.duration_seconds != null ? formatDuration(e.duration_seconds) : '-'} · laba {formatRupiah(e.profit)}
                      </span>
                    </span>
                    <span className="font-mono text-lg font-black text-slate-900">{e.score}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
