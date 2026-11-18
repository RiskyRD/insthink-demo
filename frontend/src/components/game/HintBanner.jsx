import { useState } from 'react';
import { BellRing, ClipboardCopy, Megaphone, X } from 'lucide-react';

export const HINT_KINDS = {
  variable: 'Konsultan menyoroti variabel!',
  formula: 'Konsultan menyoroti rumus!',
  rule: 'Konsultan menyoroti aturan usaha!',
  decision: 'Konsultan menyoroti keputusan!',
  sample: 'Konsultan mengirim contoh data uji!',
  price: 'Partner mengirim harga menu!',
  note: 'Partner mengirim catatan gudang!',
  restock: 'Kasir meminta restock!',
  stock_ready: 'Gudang: bahan sudah datang!',
};

/**
 * Banner petunjuk dari Konsultan (`hint_ping`) di ruang kerja Teknisi.
 * Petunjuk terbaru tampil besar dengan animasi; petunjuk sebelumnya tetap bisa dilihat.
 *
 * @param {Array} hints  terbaru lebih dulu: { id, kind, title, content, detail?, from? }
 */
export default function HintBanner({ hints, onDismiss }) {
  const [copiedId, setCopiedId] = useState(null);
  if (!hints.length) return null;

  const [latest, ...older] = hints;
  const copy = (hint) =>
    navigator.clipboard?.writeText(hint.content).then(() => setCopiedId(hint.id)).catch(() => {});

  return (
    <section aria-live="assertive" className="mb-6">
      {/* Kilatan tepi layar setiap petunjuk baru */}
      <div key={`glow-${latest.id}`} className="hint-glow pointer-events-none fixed inset-0 z-40" aria-hidden />

      <div
        key={latest.id}
        className="hint-in relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-[#fff6c7] shadow-[5px_5px_0px_#1e293b]"
      >
        <div className="flex flex-wrap items-start gap-4 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-slate-800 bg-[#ffd23f]">
            <BellRing className="hint-bell h-6 w-6 text-slate-900" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-slate-900">{HINT_KINDS[latest.kind]}</p>
            <p className="text-xs font-bold text-amber-800">
              {latest.from ? `${latest.from} · ` : ''}{latest.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="break-words rounded-lg border-2 border-slate-800 bg-white px-3 py-1.5 font-mono text-base font-black text-slate-900">
                {latest.content}
              </p>
              {latest.kind === 'sample' && (
                <button
                  type="button"
                  onClick={() => copy(latest)}
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-800 bg-white px-2.5 py-1.5 text-xs font-bold shadow-[2px_2px_0px_#1e293b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                  {copiedId === latest.id ? 'Tersalin! Tempel di kartu pelanggan' : 'Salin data pesanan'}
                </button>
              )}
            </div>
            {latest.detail && <p className="mt-1.5 text-sm text-slate-700">{latest.detail}</p>}
          </div>
          <button type="button" onClick={() => onDismiss(latest.id)} className="rounded-lg p-1 text-slate-600 hover:bg-amber-200" aria-label="Tutup petunjuk ini">
            <X className="h-5 w-5" />
          </button>
        </div>

        {older.length > 0 && (
          <div className="border-t-2 border-dashed border-amber-400 bg-amber-50/80 px-4 py-2">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-800">
              <Megaphone className="h-3.5 w-3.5" aria-hidden /> Petunjuk sebelumnya
            </p>
            <ul className="flex flex-wrap gap-2">
              {older.map((h) => (
                <li key={h.id} className="flex items-center gap-1 rounded-lg border-2 border-slate-800 bg-white py-0.5 pl-2 pr-1 text-xs">
                  <span className="font-semibold text-slate-500">{h.title}:</span>
                  <code className="font-mono font-bold text-slate-900">{h.content}</code>
                  <button type="button" onClick={() => onDismiss(h.id)} className="rounded p-0.5 text-slate-400 hover:text-rose-600" aria-label={`Hapus petunjuk ${h.title}`}>
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
