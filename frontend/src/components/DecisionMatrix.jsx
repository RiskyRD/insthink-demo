import { ArrowDown, Scale } from 'lucide-react';

const TONES = [
  { card: 'border-emerald-300 bg-emerald-50', badge: 'bg-emerald-600 text-white', bar: 'bg-emerald-500', text: 'text-emerald-800' },
  { card: 'border-amber-300 bg-amber-50', badge: 'bg-amber-500 text-white', bar: 'bg-amber-400', text: 'text-amber-800' },
  { card: 'border-rose-300 bg-rose-50', badge: 'bg-rose-600 text-white', bar: 'bg-rose-500', text: 'text-rose-800' },
];

const prettyCondition = (c) => c.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');

/**
 * Diagram keputusan kelayakan usaha (Misi 3): satu nilai → tiga cabang keputusan.
 * Data hanya tersedia di payload Konsultan.
 */
export default function DecisionMatrix({ table, variable = 'laba_bersih', renderAction }) {
  if (!table?.length) return null;

  return (
    <div>
      {/* Garis bilangan: dari rugi (kiri) ke layak ekspansi (kanan) */}
      <div className="mb-5">
        <div className="flex h-3 overflow-hidden rounded-full">
          {[...table].reverse().map((row, i) => (
            <div key={row.output} className={`flex-1 ${TONES[table.length - 1 - i].bar}`} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>Rugi</span>
          <span>Rp0</span>
          <span>Rp2.000.000</span>
          <span>Untung besar</span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm">
          <Scale className="h-4 w-4 text-slate-500" aria-hidden />
          <span className="text-sm text-slate-600">Bandingkan nilai</span>
          <code className="rounded bg-sky-100 px-2 py-0.5 font-mono text-sm font-semibold text-sky-800">{variable}</code>
        </div>
        <ArrowDown className="my-2 h-5 w-5 text-slate-400" aria-hidden />
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {table.map((row, i) => {
          const tone = TONES[i] ?? TONES[2];
          const keyword = i === 0 ? 'if' : i === table.length - 1 ? 'else' : 'elif';
          return (
            <li key={row.output} className={`flex flex-col rounded-xl border-2 border-slate-800 p-4 shadow-[3px_3px_0px_#1e293b] ${tone.card}`}>
              <span className={`mb-2 w-fit rounded-md px-2 py-0.5 font-mono text-xs font-bold uppercase ${tone.badge}`}>
                {keyword}
              </span>
              <p className="font-mono text-sm text-slate-700">{prettyCondition(row.condition)}</p>
              <ArrowDown className="my-2 h-4 w-4 text-slate-400" aria-hidden />
              <p className={`text-base font-bold tracking-wide ${tone.text}`}>"{row.output}"</p>
              <p className="mt-1 text-sm text-slate-600">{row.meaning}</p>
              {renderAction && <div className="mt-auto pt-3">{renderAction(row, i)}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
