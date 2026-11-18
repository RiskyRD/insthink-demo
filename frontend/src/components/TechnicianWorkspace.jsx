import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BookOpen, Calculator, CheckCircle2, Lightbulb, Loader2, Plus, RotateCcw,
  Terminal, Trash2, XCircle,
} from 'lucide-react';
import CodeEditor from './CodeEditor';
import BuRatnaCharacter from './game/BuRatnaCharacter';
import VillagerAvatar, { VILLAGERS } from './game/VillagerAvatar';
import HintBanner from './game/HintBanner';
import { BananaBunchIcon, BasketIcon, CoinStackIcon, PriceTagIcon } from './game/CartoonIcons';
import { useGameAudio } from './game/useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './game/theme';
import { usePyodideRunner } from '../hooks/usePyodideRunner';
import { translatePythonError } from '../lib/pythonErrors';
import { api, formatDuration } from '../lib/api';

const MAX_TESTS = 10;
const TYPING_THROTTLE_MS = 1500;
// Ikon dekoratif saja — sengaja TIDAK dipetakan ke arti angka agar makna data tetap rahasia Konsultan.
const FIELD_ICONS = [BananaBunchIcon, PriceTagIcon, BasketIcon, CoinStackIcon];

const draftKey = (roomCode, mission) => `insthink.draft.${roomCode}.${mission}`;
const readDraft = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Layar Pemain 2 — Teknisi Sistem ("Terminal Mesin Kasir Pintar Desa").
 * Hanya menerima payload proyeksi Teknisi: kerangka kode, tips sintaks, terminal,
 * dan status lulus. Rumus serta nilai target hanya diketahui Konsultan.
 */
export default function TechnicianWorkspace({
  mission, roomCode, roomStatus, token, serverDraft, lastEvaluation, history, sendActivity, onSubmitted,
  hints = [], onDismissHint = () => {},
}) {
  const runner = usePyodideRunner();
  const { playClick, playCashRegister } = useGameAudio();
  const storageKey = draftKey(roomCode, mission.number);

  const [code, setCode] = useState(() => readDraft(storageKey) ?? serverDraft ?? mission.skeleton);
  const [tests, setTests] = useState(() =>
    Array.from({ length: Math.max(1, mission.min_test_runs) }, () => Array(mission.input_count).fill('')),
  );
  const [phase, setPhase] = useState('idle'); // idle | running | submitting
  const [results, setResults] = useState([]);
  const [runCount, setRunCount] = useState(0);
  const [localFeedback, setLocalFeedback] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submittedLogId, setSubmittedLogId] = useState(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, code);
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
  }, [code, storageKey]);

  const evaluation = lastEvaluation?.mission_number === mission.number ? lastEvaluation : null;
  const caseStatus = useMemo(
    () => (evaluation && evaluation.log_id === submittedLogId ? new Map(evaluation.cases.map((c) => [c.index, c])) : null),
    [evaluation, submittedLogId],
  );

  const busy = phase !== 'idle';
  const canRun = runner.isReady && !busy && roomStatus === 'active';
  const errorLine = results.find((r) => r.error)?.error?.line ?? null;

  const handleCodeChange = (next) => {
    setCode(next);
    const now = Date.now();
    if (now - lastTypingRef.current > TYPING_THROTTLE_MS) {
      lastTypingRef.current = now;
      sendActivity('typing');
    }
  };

  const updateTest = (row, col, value) =>
    setTests((t) => t.map((r, i) => (i === row ? r.map((v, j) => (j === col ? value : v)) : r)));

  // Tempel "6000, 10000, 50" ke satu kolom → otomatis dibagi ke semua kolom.
  const handlePaste = (row, event) => {
    const text = event.clipboardData.getData('text');
    const parts = text.split(/[,;\t\n]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      event.preventDefault();
      setTests((t) => t.map((r, i) => (i === row ? r.map((v, j) => parts[j] ?? v) : r)));
    }
  };

  const addCustomer = () => {
    playClick();
    setResults([]);
    setTests((t) => [...t, Array(mission.input_count).fill('')]);
  };

  const removeCustomer = (index) => {
    playClick();
    setResults([]);
    setTests((t) => t.filter((_, k) => k !== index));
  };

  const handleRun = async () => {
    if (!canRun) return;
    playClick();
    setPhase('running');
    setSubmitError(null);
    setLocalFeedback(null);
    setRunCount((n) => n + 1);
    sendActivity('running');

    try {
      const testCases = tests.map((row) => row.map((v) => v.trim()));
      const runResults = await runner.runTests(code, testCases);
      setResults(runResults);

      const firstError = runResults.find((r) => r.error)?.error;
      const unused = runResults.find((r) => !r.error && r.unusedInputs > 0);
      if (firstError) {
        setLocalFeedback({ ...translatePythonError(firstError), kind: 'error' });
      } else {
        playCashRegister(); // struk tercetak
        if (unused) {
          setLocalFeedback({
            kind: 'warning',
            title: 'Ada data masukan yang tidak dipakai',
            hint: `Program hanya membaca sebagian data uji (${unused.unusedInputs} data tersisa). Cek lagi apakah semua input() sudah ditulis.`,
          });
        }
      }

      setPhase('submitting');
      const payload = await api(`/rooms/${roomCode}/submit`, {
        method: 'POST',
        token,
        body: {
          mission_number: mission.number,
          code,
          runs: runResults.map((r) => ({
            inputs: r.inputs,
            stdout: r.stdout.slice(0, 5000),
            error: r.error ? { type: r.error.type, message: r.error.message.slice(0, 500), line: r.error.line } : null,
          })),
        },
      });
      setSubmittedLogId(payload.log_id);
      onSubmitted(payload);
    } catch (err) {
      setSubmitError(err.message ?? 'Gagal mengirim hasil ke server.');
    } finally {
      setPhase('idle');
      sendActivity('idle');
    }
  };

  const resetSkeleton = () => {
    if (window.confirm('Kembalikan kode ke kerangka awal? Kode yang sudah kamu tulis akan hilang.')) {
      setCode(mission.skeleton);
      setResults([]);
      setLocalFeedback(null);
    }
  };

  // ---------------- Status mesin & reaksi Bu Ratna ----------------
  const lastRunHadError = results.some((r) => r.error);
  let lamp = 'green';
  if (runner.status === 'error' || (!busy && (lastRunHadError || submitError))) lamp = 'red';
  else if (busy || runner.status === 'loading' || runner.status === 'running') lamp = 'yellow';

  let ratna = { mood: 'idle', text: 'Ayo layani pelanggan dan uji mesin kasirnya!' };
  if (roomStatus !== 'active') {
    ratna = { mood: 'idle', text: 'Tunggu Konsultan bergabung dulu, ya. Setelah itu kita uji mesin kasirnya!' };
  } else if (busy) {
    ratna = { mood: 'thinking', text: phase === 'running' ? 'Mesin kasir sedang menghitung pesanan…' : 'Struknya sedang dicocokkan dengan catatan Konsultan…' };
  } else if (localFeedback?.kind === 'error') {
    ratna = { mood: 'shocked', text: `Waduh, mesinnya macet! ${localFeedback.title}.` };
  } else if (caseStatus && evaluation && !evaluation.is_passed) {
    ratna = { mood: 'shocked', text: `Lho, kok begitu? ${evaluation.title}. Coba tanyakan lagi ke Konsultan.` };
  } else if (caseStatus && evaluation?.is_passed) {
    ratna = { mood: 'happy', text: 'Hore, semua struk cocok dengan catatan usaha!' };
  } else if (submitError) {
    ratna = { mood: 'shocked', text: 'Struknya gagal terkirim. Coba tekan tombol uji sekali lagi.' };
  }

  const runLabel = (() => {
    if (runner.status === 'loading') return 'Menyalakan mesin kasir…';
    if (runner.status === 'error') return 'Mesin kasir rusak (Python gagal dimuat)';
    if (roomStatus !== 'active') return 'Tunggu Konsultan bergabung';
    if (phase === 'running') return 'Mesin kasir menghitung…';
    if (phase === 'submitting') return 'Mengirim struk ke sistem…';
    return 'UJI MESIN KASIR (RUN)';
  })();

  return (
    <div>
      <HintBanner hints={hints} onDismiss={onDismissHint} />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---------------- Kolom kerja ---------------- */}
        <div className="space-y-6 lg:col-span-3">
          {/* Terminal mesin kasir */}
          <section className="rounded-3xl border-2 border-slate-800 bg-[#e9c46a] p-3 shadow-[5px_5px_0px_#1e293b]">
            <header className="mb-3 flex flex-wrap items-center gap-3">
              <div style={WOOD_BG} className="rounded-lg border-2 border-slate-800 px-3 py-1 shadow-[2px_2px_0px_#1e293b]">
                <h2 className="text-sm font-black leading-tight text-[#fff3d6] [text-shadow:1px_1px_0_#3e2210]">Terminal Mesin Kasir Pintar Desa</h2>
                <p className="text-[10px] font-bold text-[#ffe8a3]">Pos {mission.number} · {mission.title}</p>
              </div>
              <MachineLamps lamp={lamp} />
              <button
                type="button"
                onClick={() => { playClick(); resetSkeleton(); }}
                disabled={busy}
                className={`ml-auto flex items-center gap-1 rounded-lg bg-[#fffaf0] px-2.5 py-1 text-xs font-bold text-slate-800 disabled:opacity-50 ${TACTILE}`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Kerangka awal
              </button>
            </header>
            <div className="rounded-2xl border-2 border-slate-800 bg-slate-800 p-1.5">
              <CodeEditor value={code} onChange={handleCodeChange} errorLine={errorLine} disabled={busy} />
            </div>
            {runner.loadError && <p className="mt-2 rounded-lg bg-rose-100 px-2 py-1 text-sm font-semibold text-rose-800">{runner.loadError}</p>}
            <div className="mt-3 flex items-center justify-between gap-3 px-2">
              <span className="text-[11px] font-bold text-amber-900">Tab = 4 spasi · Enter setelah ":" otomatis menjorok</span>
              <span className="h-2.5 w-28 rounded-full border-2 border-slate-800 bg-slate-700" aria-hidden title="slot struk" />
            </div>
          </section>

          {/* Simulasi transaksi pelanggan */}
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 style={WOOD_BG} className="w-fit rounded-lg border-2 border-slate-800 px-4 py-1.5 text-base font-black text-[#fff3d6] shadow-[3px_3px_0px_#1e293b] [text-shadow:1px_1px_0_#3e2210]">
                  Simulasi Transaksi Pelanggan
                </h2>
                <p className="mt-1.5 w-fit rounded-md bg-[#fffaf0]/90 px-2 py-0.5 text-sm font-medium text-slate-700">
                  Isi {mission.input_count} angka per pesanan sesuai urutan dari Konsultan. Angka masuk otomatis ke setiap input().
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomer}
                disabled={busy || tests.length >= MAX_TESTS}
                className={`flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-slate-800 disabled:opacity-50 ${TACTILE}`}
              >
                <Plus className="h-4 w-4" aria-hidden /> Tambah pelanggan
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {tests.map((row, i) => (
                <CustomerCard
                  key={i}
                  index={i}
                  row={row}
                  busy={busy}
                  canRemove={tests.length > 1}
                  stamp={busy ? null : stampFor(caseStatus?.get(i + 1), results[i])}
                  onChange={(j, value) => updateTest(i, j, value)}
                  onPaste={(e) => handlePaste(i, e)}
                  onRemove={() => removeCustomer(i)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={!canRun}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-800 bg-emerald-500 px-4 py-4 text-xl font-black tracking-wide text-white shadow-[0_7px_0_#166534,0_7px_0_2px_#1e293b] transition-all duration-75 [text-shadow:2px_2px_0_#14532d] hover:bg-emerald-400 enabled:active:translate-y-[5px] enabled:active:shadow-[0_2px_0_#166534,0_2px_0_2px_#1e293b] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-[0_4px_0_#94a3b8,0_4px_0_2px_#1e293b] disabled:[text-shadow:none]"
            >
              {busy || runner.status === 'loading' ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden /> : <Calculator className="h-7 w-7" aria-hidden />}
              {runLabel}
            </button>
            {submitError && <p className="mt-3 rounded-lg border-2 border-rose-700 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">{submitError}</p>}
          </section>

          <TerminalPanel results={results} caseStatus={caseStatus} />
        </div>

        {/* ---------------- Kolom informasi ---------------- */}
        <aside className="space-y-5 lg:col-span-2">
          <section className={`${CARD} bg-gradient-to-br from-[#fffaf0] to-[#fdf0d0] p-4`}>
            <BuRatnaCharacter mood={ratna.mood} dialogue={ratna.text} size={105} replayKey={`${runCount}-${submittedLogId}`} />
          </section>

          <section className={`${CARD} p-5`}>
            <h2 className="mb-2 flex items-center gap-2 font-black text-slate-900">
              <BookOpen className="h-5 w-5 text-emerald-600" aria-hidden />
              Pos {mission.number}: {mission.title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">{mission.narrative}</p>
          </section>

          <section className="rounded-2xl border-2 border-slate-800 bg-sky-50 p-5 shadow-[4px_4px_0px_#1e293b]">
            <h2 className="mb-2 flex items-center gap-2 font-black text-sky-900">
              <Lightbulb className="h-5 w-5" aria-hidden /> Petunjuk Sintaks
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-sky-900">
              {mission.syntax_tips.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </section>

          {localFeedback && (
            <FeedbackCard
              tone={localFeedback.kind === 'error' ? 'rose' : 'amber'}
              title={localFeedback.title}
              body={localFeedback.hint}
              footer="Petunjuk dari hasil menjalankan program di komputermu."
            />
          )}

          {evaluation && (
            <FeedbackCard
              tone={evaluation.is_passed ? 'emerald' : 'rose'}
              title={evaluation.title}
              body={evaluation.hint}
              extra={
                evaluation.untested_decision_count > 0
                  ? `Masih ada ${evaluation.untested_decision_count} keputusan yang belum pernah muncul saat diuji.`
                  : evaluation.forbidden_constructs.length > 0
                    ? `Perintah yang perlu dihapus: ${evaluation.forbidden_constructs.join(', ')}`
                    : null
              }
              footer={`Penilaian sistem · percobaan ke-${evaluation.attempt_number} · ${formatDuration(evaluation.duration_seconds)}`}
            />
          )}

          {history.length > 0 && (
            <section className={`${CARD} p-5`}>
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-600">Riwayat Pengiriman</h2>
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {[...history].reverse().map((h) => (
                  <li key={h.log_id} className="flex items-center gap-2 text-sm">
                    {h.is_passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> : <XCircle className="h-4 w-4 text-rose-500" aria-hidden />}
                    <span className="text-slate-700">Misi {h.mission_number}: {h.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function stampFor(status, result) {
  if (status) {
    if (status.passed) return { text: 'COCOK', tone: 'border-emerald-700 text-emerald-700' };
    return result?.error
      ? { text: 'MACET', tone: 'border-rose-700 text-rose-700' }
      : { text: 'BELUM COCOK', tone: 'border-rose-700 text-rose-700' };
  }
  if (result?.error) return { text: 'MACET', tone: 'border-rose-700 text-rose-700' };
  return null;
}

function MachineLamps({ lamp }) {
  const lamps = [
    ['green', 'SIAP', '#22c55e'],
    ['yellow', 'PROSES', '#facc15'],
    ['red', 'GALAT', '#ef4444'],
  ];
  const label = { green: 'siap', yellow: 'sedang memproses', red: 'ada galat' }[lamp];
  return (
    <div className="flex items-center gap-2.5 rounded-xl border-2 border-slate-800 bg-slate-800 px-2.5 py-1" role="status" aria-label={`Status mesin: ${label}`}>
      {lamps.map(([key, text, color]) => {
        const on = lamp === key;
        return (
          <span key={key} className="flex flex-col items-center gap-0.5">
            <span
              className={`h-4 w-4 rounded-full border-2 border-slate-900 ${on && key === 'yellow' ? 'lamp-blink' : ''}`}
              style={{ backgroundColor: on ? color : '#475569', boxShadow: on ? `0 0 10px 2px ${color}` : 'none' }}
            />
            <span className={`text-[8px] font-black ${on ? 'text-white' : 'text-slate-400'}`}>{text}</span>
          </span>
        );
      })}
    </div>
  );
}

function CustomerCard({ index, row, busy, canRemove, stamp, onChange, onPaste, onRemove }) {
  const villager = VILLAGERS[index % VILLAGERS.length];
  return (
    <article className="relative rounded-2xl border-2 border-slate-800 bg-white p-3 shadow-[3px_3px_0px_#1e293b]">
      <header className="flex items-center gap-2.5">
        <VillagerAvatar index={index} className="h-12 w-12 shrink-0 rounded-full border-2 border-slate-800" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pelanggan #{index + 1}</p>
          <p className="truncate font-black text-slate-900">
            {villager.name}{index >= VILLAGERS.length ? ` ${Math.floor(index / VILLAGERS.length) + 1}` : ''}
          </p>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            aria-label={`Hapus pelanggan ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>
      <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-xs italic text-slate-600">"{villager.greeting}"</p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {row.map((value, j) => {
          const Icon = FIELD_ICONS[j % FIELD_ICONS.length];
          return (
            <label
              key={j}
              className="flex items-center gap-1.5 rounded-lg border-2 border-slate-800 bg-[#fffaf0] px-1.5 py-1 focus-within:ring-2 focus-within:ring-emerald-500"
            >
              <Icon className="h-7 w-7 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[9px] font-black uppercase tracking-wide text-slate-500">Angka ke-{j + 1}</span>
                <input
                  value={value}
                  onChange={(e) => onChange(j, e.target.value)}
                  onPaste={onPaste}
                  disabled={busy}
                  maxLength={30}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label={`Pelanggan ${index + 1}, angka ke-${j + 1}`}
                  className="w-full min-w-0 bg-transparent font-mono text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300"
                />
              </span>
            </label>
          );
        })}
      </div>

      {stamp && (
        <span
          key={stamp.text}
          className={`stamp-in pointer-events-none absolute right-10 top-3 rounded-md border-[3px] bg-white/80 px-2 py-0.5 font-mono text-sm font-black tracking-widest ${stamp.tone}`}
        >
          {stamp.text}
        </span>
      )}
    </article>
  );
}

function TerminalPanel({ results, caseStatus }) {
  return (
    <section className="rounded-2xl border-2 border-slate-800 bg-black p-4 shadow-[4px_4px_0px_#1e293b]">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-300">
        <Terminal className="h-4 w-4" aria-hidden /> Layar Struk & Terminal
      </h2>
      <div className="max-h-80 space-y-4 overflow-y-auto font-mono text-sm" aria-live="polite">
        {results.length === 0 && <p className="text-slate-500">Struk hasil program akan tercetak di sini setelah kamu menekan "UJI MESIN KASIR (RUN)".</p>}
        {results.map((r, i) => {
          const status = caseStatus?.get(i + 1);
          return (
            <div key={i}>
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                <span>── Pelanggan {i + 1} · angka: {r.inputs.join(', ') || '-'}</span>
                {status && (
                  <span className={status.passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {status.passed ? '✔ cocok' : '✘ belum cocok'}
                  </span>
                )}
              </div>
              {r.transcript.map((line, k) => {
                if (line.kind === 'input') {
                  return (
                    <div key={k} className="text-slate-400">
                      {line.prompt || 'input()'}{' '}
                      <span className="text-cyan-300">{line.value ?? '(data habis)'}</span>
                    </div>
                  );
                }
                return (
                  <div key={k} className={`whitespace-pre-wrap ${line.kind === 'err' ? 'text-rose-400' : 'text-slate-100'}`}>
                    {line.text}
                  </div>
                );
              })}
              {r.error && (
                <pre className="mt-1 whitespace-pre-wrap text-rose-400">
                  {r.error.traceback || `${r.error.type}: ${r.error.message}`}
                </pre>
              )}
              {!r.error && r.transcript.every((l) => l.kind !== 'out') && (
                <div className="text-slate-500">(program tidak menampilkan apa pun)</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeedbackCard({ tone, title, body, extra, footer }) {
  const tones = {
    emerald: ['bg-emerald-50 text-emerald-900', CheckCircle2],
    rose: ['bg-rose-50 text-rose-900', AlertTriangle],
    amber: ['bg-amber-50 text-amber-900', AlertTriangle],
  };
  const [cls, Icon] = tones[tone];
  return (
    <section className={`rounded-2xl border-2 border-slate-800 p-5 shadow-[4px_4px_0px_#1e293b] ${cls}`} aria-live="polite">
      <h2 className="mb-1 flex items-center gap-2 font-black">
        <Icon className="h-5 w-5" aria-hidden /> {title}
      </h2>
      <p className="text-sm leading-relaxed">{body}</p>
      {extra && <p className="mt-2 text-sm font-bold">{extra}</p>}
      {footer && <p className="mt-3 text-xs opacity-70">{footer}</p>}
    </section>
  );
}
