import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Eraser, FileCode2, FlaskConical, Hourglass, Lightbulb, Loader2, Play, RotateCcw,
  Terminal, Wifi, WifiOff, XCircle,
} from 'lucide-react';
import BuRatnaCharacter from './BuRatnaCharacter';
import { AvatarHead, RoleCharacter } from './ShopCharacters';
import CodeEditor from './chapter3/CodeEditor';
import { HIDDEN_TESTS, HINTS, MISSION_STEPS, STARTER_CODE, STDIN_FIELDS, gradeTest, structureIssues, toConsole } from './chapter3/moneyTracker';
import { useGameAudio } from './useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './theme';
import { usePyodideRunner } from '../../hooks/usePyodideRunner';
import { api, ROLE_LABEL } from '../../lib/api';
import { formatFriendlyPythonError } from '../../lib/friendlyPythonError';

const AUTO_HINT_AT = 3;
const storageKey = (roomCode, role) => `insthink.ch3.${roomCode}.${role}`;

function loadProgress(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function saveProgress(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

/**
 * Chapter 3: Coding Money Tracker. Editor Python ala online compiler (Pyodide lokal),
 * panel Masukan Uji (stdin), konsol output, penjelasan galat ramah, auto-hint Bu Ratna,
 * dan uji tersembunyi sebelum POST chapter3-complete.
 */
export default function Chapter3MoneyTracker({ me, room, partner, token, realtime, onStateChange }) {
  const runner = usePyodideRunner();
  const { playClick, playSuccess, playError, playPing } = useGameAudio();
  const key = storageKey(room.room_code, me.role);
  const [saved] = useState(() => loadProgress(key));

  const [code, setCode] = useState(saved.code ?? '');
  const [stdin, setStdin] = useState(() => Object.fromEntries(STDIN_FIELDS.map((f) => [f.key, f.example])));
  const [consoleLines, setConsoleLines] = useState([]);
  const [friendly, setFriendly] = useState(null);
  const [testReport, setTestReport] = useState(null);
  const [attempts, setAttempts] = useState(saved.attempts ?? 0);
  const [errorCount, setErrorCount] = useState(saved.errors ?? 0);
  const [autoHintDone, setAutoHintDone] = useState(Boolean(saved.autoHint));
  const [hintLevel, setHintLevel] = useState(0);
  const [hintAuto, setHintAuto] = useState(false);
  const [busy, setBusy] = useState(null); // 'run' | 'test' | 'submit'
  const [say, setSay] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    saveProgress(key, { code, attempts, errors: errorCount, autoHint: autoHintDone });
  }, [key, code, attempts, errorCount, autoHintDone]);

  // Auto-hint Bu Ratna setelah 3 kali gagal/galat.
  useEffect(() => {
    if (errorCount >= AUTO_HINT_AT && !autoHintDone) {
      setAutoHintDone(true);
      setHintAuto(true);
      setHintLevel((l) => Math.max(1, l));
      playPing();
    }
  }, [errorCount, autoHintDone, playPing]);

  const handleCodeChange = (next) => {
    setCode(next);
    if (friendly) setFriendly(null);
    const now = Date.now();
    if (now - lastTypingRef.current > 3000) {
      lastTypingRef.current = now;
      realtime.sendActivity?.('typing');
    }
  };

  const registerFailure = useCallback((output) => {
    setErrorCount((c) => c + 1);
    // Catatan untuk dashboard fasilitator; kegagalan jaringan diabaikan.
    api(`/rooms/${room.room_code}/chapter3-attempt`, {
      method: 'POST',
      token,
      body: { code: code || '(kosong)', output: String(output).slice(0, 5000) },
    }).catch(() => {});
  }, [room.room_code, token, code]);

  const loadStarter = () => {
    playClick();
    if (code.trim() && code !== STARTER_CODE && !window.confirm('Ganti kode sekarang dengan kerangka awal? Kode yang sudah kamu tulis akan terhapus.')) return;
    setCode(STARTER_CODE);
    setFriendly(null);
    setSay({ mood: 'happy', text: 'Kerangka sudah dimuat. Tulis kode di bawah setiap komentar Langkah 1 sampai 5, ya!' });
  };

  const nextHint = () => {
    playPing();
    setHintAuto(false);
    setHintLevel((l) => Math.min(HINTS.length, l + 1));
  };

  const run = async () => {
    if (!runner.isReady || busy) return;
    if (!code.trim()) {
      setSay({ mood: 'thinking', text: 'Editor masih kosong. Tekan "Muat Kerangka Awal" untuk mulai dari panduan Langkah 1 sampai 5.' });
      return;
    }
    playClick();
    setBusy('run');
    setFriendly(null);
    setTestReport(null);
    realtime.sendActivity?.('running');

    const result = await runner.run(code, STDIN_FIELDS.map((f) => stdin[f.key]));
    setConsoleLines(toConsole(result));
    if (result.error) {
      const info = formatFriendlyPythonError(result.error, code);
      setFriendly(info);
      setSay({ mood: 'shocked', text: `Ups, ada galat${info.line ? ` di baris ${info.line}` : ''}: ${info.title}. Baca kotak merah di bawah editor, ya.` });
      playError();
      registerFailure(`${result.error.type}: ${result.error.message}`);
    } else {
      setSay({ mood: 'happy', text: 'Program berjalan! Cocokkan hasil di Konsol Output dengan hitunganmu. Kalau sudah benar, tekan "Uji & Selesaikan Bab 3".' });
    }
    realtime.sendActivity?.('idle');
    setBusy(null);
  };

  const submit = async (payload) => {
    setBusy('submit');
    setSubmitError(null);
    try {
      const state = await api(`/rooms/${room.room_code}/chapter3-complete`, { method: 'POST', token, body: payload });
      setPendingSubmit(null);
      onStateChange(state);
    } catch (err) {
      setSubmitError(err.message);
      setPendingSubmit(payload);
      playError();
    } finally {
      setBusy(null);
    }
  };

  const testAndFinish = async () => {
    if (!runner.isReady || busy) return;
    playClick();
    const attemptNo = attempts + 1;
    setAttempts(attemptNo);
    setFriendly(null);
    setTestReport(null);

    setBusy('test');
    realtime.sendActivity?.('running');
    setSay({ mood: 'thinking', text: 'Ibu uji dengan 2 catatan keuangan rahasia: satu hari yang hemat dan satu hari yang boros…' });
    const results = await runner.runTests(code, HIDDEN_TESTS.map((t) => t.inputs));
    realtime.sendActivity?.('idle');

    const report = HIDDEN_TESTS.map((test, i) => {
      const result = results[i] ?? { error: { type: 'TimeoutError', message: 'uji dihentikan', line: null }, stdout: '' };
      return { label: test.label, error: result.error, stdout: result.stdout, ...gradeTest(result, test) };
    });

    // Struktur wajib (for, if-else, int(input)) dicek setelah kode terbukti bisa berjalan,
    // agar galat penulisan (mis. lupa titik dua) tetap dijelaskan lebih dulu.
    const issues = report.some((r) => r.error) ? [] : structureIssues(code);
    if (issues.length) {
      setBusy(null);
      setFriendly({ type: 'Struktur', title: 'Struktur program belum sesuai misi', line: null, lineText: null, explanation: issues.join(' '), example: null });
      setSay({ mood: 'thinking', text: issues[0] });
      playError();
      registerFailure(`Struktur: ${issues.join(' ')}`);
      return;
    }
    setTestReport(report);

    const failed = report.find((r) => !r.passed);
    if (failed) {
      setBusy(null);
      playError();
      if (failed.error) {
        const info = formatFriendlyPythonError(failed.error, code);
        setFriendly(info);
        setSay({ mood: 'shocked', text: `Uji "${failed.label}" berhenti karena galat${info.line ? ` di baris ${info.line}` : ''}. ${info.title}.` });
      } else {
        setSay({ mood: 'shocked', text: `${report.filter((r) => r.passed).length} dari ${report.length} uji lulus. ${failed.reason}` });
      }
      registerFailure(report.map((r) => `${r.label}: ${r.passed ? 'lulus' : r.reason ?? r.error?.type}`).join('\n'));
      return;
    }

    playSuccess();
    setSay({ mood: 'happy', text: 'Hebat! Money Tracker kalian menghitung dengan tepat di kedua uji. Ibu simpan programmu, ya…' });
    const startedAt = room.phase_started_at ? Date.parse(room.phase_started_at) : null;
    await submit({
      code,
      output: report.map((r, i) => `Uji ${i + 1} (${r.label}): ${r.stdout.replace(/\n/g, ' | ')}`).join('\n').slice(0, 5000),
      attempt_count: Math.min(1000, attemptNo),
      duration_seconds: startedAt ? Math.min(86400, Math.max(0, Math.round((Date.now() - startedAt) / 1000))) : undefined,
    });
  };

  const myStatus = me.is_chapter3_done ? 'done' : busy === 'test' || busy === 'submit' || busy === 'run' ? 'running' : 'typing';

  if (me.is_chapter3_done) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <ProgressStrip me={me} partner={partner} realtime={realtime} myStatus="done" />
        <section className={`${CARD} prolog-slide-in p-6 text-center`}>
          <p className="text-xs font-black uppercase tracking-widest text-[#4f8f3a]">Bab 3 selesai</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Money Tracker kamu lulus semua uji!</h2>
          <div className="mt-4 flex flex-wrap items-end justify-center gap-4">
            <RoleCharacter role={me.role} gender={me.avatar_skin} mood="happy" size={120} caption={`${me.name} · Selesai`} />
            <BuRatnaCharacter
              mood="happy"
              size={120}
              bubblePosition="top"
              title="Bu Ratna"
              dialogue={partner?.is_chapter3_done
                ? 'Kalian berdua sudah selesai. Sebentar lagi pengumuman kelulusan!'
                : `Sambil menunggu ${partner?.name ?? 'partnermu'}, coba bantu lewat diskusi: ingatkan soal titik dua, Tab, dan int(input(...)). Jangan kirim jawabanmu, ya!`}
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <ProgressStrip me={me} partner={partner} realtime={realtime} myStatus={myStatus} />

      {/* Kartu misi Bu Ratna */}
      <section className={`${CARD} overflow-hidden`} aria-labelledby="ch3-title">
        <div className="flex flex-wrap items-center gap-3 border-b-2 border-slate-800 px-4 py-3" style={WOOD_BG}>
          <span className="rounded-full border-2 border-slate-800 bg-[#c4b5fd] px-3 py-0.5 text-xs font-black tracking-wider text-slate-900 shadow-[2px_2px_0px_#1e293b]">BAB 3</span>
          <h2 id="ch3-title" className="text-lg font-black text-[#fff3d6] [text-shadow:2px_2px_0_#3e2210] sm:text-xl">Coding Money Tracker Kedai</h2>
        </div>
        <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <BuRatnaCharacter
            mood={busy === 'test' || busy === 'run' ? 'thinking' : say?.mood ?? 'idle'}
            size={110}
            title="Bu Ratna"
            replayKey={say?.text}
            dialogue={say?.text ?? `Kedai sudah tutup. Sekarang kalian berdua menulis program Money Tracker untuk menghitung 3 pengeluaran harian dan sisa modal. Kerjakan masing-masing, tapi boleh saling berdiskusi dengan ${partner?.name ?? 'partnermu'}!`}
          />
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-slate-800">
              <FileCode2 className="h-4 w-4 text-[#c4562f]" aria-hidden /> Kartu Misi: Money Tracker
            </h3>
            <ol className="space-y-1.5">
              {MISSION_STEPS.map((step, i) => (
                <li key={step.code} className="flex gap-2 rounded-lg border-2 border-slate-200 bg-white px-2.5 py-1.5 text-sm">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-slate-800 bg-[#ffd23f] text-[10px] font-black">{i + 1}</span>
                  <span className="min-w-0">
                    <code className="break-words font-mono text-[12px] font-bold text-[#c4562f]">{step.code}</code>
                    <span className="block text-xs text-slate-600">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {hintLevel > 0 && (
        <HintPanel level={hintLevel} auto={hintAuto} onNext={nextHint} onClose={() => { playClick(); setHintLevel(0); }} />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Editor */}
        <section className={`${CARD} overflow-hidden`} aria-label="Editor kode">
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-slate-800 bg-[#1e293b] px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-1 font-mono text-xs font-bold text-slate-300">money_tracker.py</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" onClick={loadStarter} className={`${TACTILE} flex items-center gap-1 rounded-lg bg-[#fff7e0] px-2.5 py-1 text-xs font-black text-slate-900`}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Muat Kerangka Awal
              </button>
              <button type="button" onClick={nextHint} disabled={hintLevel >= HINTS.length} className={`${TACTILE} flex items-center gap-1 rounded-lg bg-[#ffd23f] px-2.5 py-1 text-xs font-black text-slate-900 disabled:opacity-60`}>
                <Lightbulb className="h-3.5 w-3.5" aria-hidden /> {hintLevel >= HINTS.length ? 'Semua hint terbuka' : `Minta Hint (${hintLevel + 1}/3)`}
              </button>
            </div>
          </div>
          <div className="relative">
            <CodeEditor value={code} onChange={handleCodeChange} errorLine={friendly?.line ?? null} onRun={run} label="Editor kode Money Tracker" />
            {!code && (
              <div className="pointer-events-none absolute left-14 top-3 max-w-[80%] font-mono text-sm text-slate-500">
                # Tulis kode Money Tracker di sini,<br /># atau tekan tombol “Muat Kerangka Awal”.
              </div>
            )}
          </div>
          <p className="border-t-2 border-slate-800 bg-[#fffaf0] px-3 py-1.5 text-[11px] font-semibold text-slate-600">
            Tab = 4 spasi · Shift+Tab = mundur · Enter setelah “:” otomatis menjorok · Ctrl+Enter = Jalankan
          </p>
          {friendly && <FriendlyErrorBox info={friendly} />}
        </section>

        <div className="space-y-5">
          {/* Stdin */}
          <section className={`${CARD} p-4`} aria-labelledby="stdin-title">
            <h3 id="stdin-title" className="mb-1 text-sm font-black uppercase tracking-wide text-slate-800">Masukan Uji (Stdin Compiler)</h3>
            <p className="mb-3 text-xs text-slate-600">Angka ini diberikan ke input() secara berurutan saat kamu menekan Jalankan.</p>
            <div className="grid grid-cols-2 gap-2">
              {STDIN_FIELDS.map((f, i) => (
                <label key={f.key} className="block">
                  <span className="mb-0.5 block text-[11px] font-black text-slate-700">{i + 1}. {f.label}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stdin[f.key]}
                    onChange={(e) => setStdin((s) => ({ ...s, [f.key]: e.target.value.replace(/[^\d-]/g, '').slice(0, 9) }))}
                    className="w-full rounded-lg border-2 border-slate-800 bg-white px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-[#e9b949]"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={run}
                disabled={!runner.isReady || Boolean(busy)}
                className={`${TACTILE} flex items-center justify-center gap-2 rounded-xl bg-[#4f8f3a] px-3 py-2.5 font-black text-white disabled:cursor-wait disabled:opacity-60`}
              >
                {busy === 'run' || !runner.isReady ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
                {runner.isReady ? 'Jalankan Kode (Run)' : 'Menyiapkan Python…'}
              </button>
              <button
                type="button"
                onClick={testAndFinish}
                disabled={!runner.isReady || Boolean(busy)}
                className={`${TACTILE} flex items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-3 py-2.5 font-black text-slate-900 disabled:cursor-wait disabled:opacity-60`}
              >
                {busy === 'test' || busy === 'submit' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <FlaskConical className="h-5 w-5" aria-hidden />}
                Uji &amp; Selesaikan Bab 3
              </button>
            </div>
            {runner.loadError && <p className="mt-2 text-sm font-semibold text-rose-700">{runner.loadError}</p>}
            {submitError && (
              <div className="mt-3 rounded-lg border-2 border-rose-300 bg-rose-50 p-2 text-sm font-semibold text-rose-700" role="alert">
                {submitError}
                {pendingSubmit && (
                  <button type="button" onClick={() => submit(pendingSubmit)} className="ml-2 underline">Kirim ulang</button>
                )}
              </div>
            )}
            <p className="mt-3 text-[11px] font-semibold text-slate-500">Percobaan uji: {attempts} · Galat/gagal: {errorCount}</p>
          </section>

          <ConsoleOutput lines={consoleLines} onClear={() => setConsoleLines([])} />
          {testReport && <TestReport report={testReport} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- Bagian tampilan ---------- */

const STATUS_STYLE = {
  done: { text: 'Sudah selesai', cls: 'bg-[#a5d68f] text-slate-900', icon: CheckCircle2 },
  running: { text: 'Sedang menguji kode…', cls: 'bg-[#ffd23f] text-slate-900', icon: Loader2, spin: true },
  typing: { text: 'Sedang menulis kode…', cls: 'bg-sky-100 text-sky-900', icon: FileCode2 },
  idle: { text: 'Sedang berpikir…', cls: 'bg-amber-100 text-amber-900', icon: Hourglass },
  offline: { text: 'Offline', cls: 'bg-slate-100 text-slate-500', icon: WifiOff },
  waiting: { text: 'Belum bergabung', cls: 'bg-slate-100 text-slate-500', icon: Hourglass },
};

function partnerStatus(partner, realtime) {
  if (!partner) return 'waiting';
  if (partner.is_chapter3_done) return 'done';
  if (!realtime.partnerOnline) return 'offline';
  if (realtime.partnerActivity === 'running') return 'running';
  if (realtime.partnerActivity === 'typing') return 'typing';
  return 'idle';
}

/** Indikator progres live kedua pemain di bagian atas. */
function ProgressStrip({ me, partner, realtime, myStatus }) {
  const rows = [
    { key: 'me', person: me, label: `${me.name} (Kamu)`, status: myStatus },
    { key: 'partner', person: partner ?? { role: me.role === 'cashier' ? 'warehouse' : 'cashier' }, label: partner?.name ?? 'Partner', status: partnerStatus(partner, realtime) },
  ];
  return (
    <section className={`${CARD} flex flex-wrap items-center gap-3 px-4 py-2.5`} aria-label="Progres pemain di Bab 3" aria-live="polite">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">Progres Bab 3</span>
      {rows.map(({ key, person, label, status }) => {
        const s = STATUS_STYLE[status] ?? STATUS_STYLE.idle;
        const Icon = s.icon;
        return (
          <span key={key} className="flex items-center gap-2 rounded-full border-2 border-slate-800 bg-white py-0.5 pl-0.5 pr-1.5">
            <AvatarHead role={person.role} gender={person.avatar_skin} size={28} className={status === 'offline' || status === 'waiting' ? 'grayscale' : ''} />
            <span className="text-sm font-bold text-slate-900">{label}</span>
            <span className="hidden text-[10px] font-semibold text-slate-500 sm:inline">{ROLE_LABEL[person.role]}</span>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${s.cls}`}>
              <Icon className={`h-3.5 w-3.5 ${s.spin ? 'animate-spin' : ''}`} aria-hidden /> {s.text}
            </span>
          </span>
        );
      })}
      <span className="ml-auto hidden items-center gap-1 text-xs font-semibold text-slate-500 md:flex">
        {realtime.isConnected ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <WifiOff className="h-3.5 w-3.5 text-rose-500" aria-hidden />}
        {realtime.isConnected ? 'Terhubung' : 'Tidak terhubung'}
      </span>
    </section>
  );
}

export function FriendlyErrorBox({ info }) {
  return (
    <div className="hint-in m-3 overflow-hidden rounded-xl border-2 border-slate-800 bg-rose-50 shadow-[4px_4px_0px_#1e293b]" role="alert">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-slate-800 bg-[#c4562f] px-3 py-2 text-white">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
        <p className="flex-1 font-black">{info.title}</p>
        {info.line && <span className="rounded-full border-2 border-slate-800 bg-white px-2 text-xs font-black text-[#c4562f]">Baris {info.line}</span>}
        {info.type && <span className="rounded-full bg-white/20 px-2 font-mono text-[11px] font-bold">{info.type}</span>}
      </div>
      <div className="space-y-2 p-3 text-sm text-slate-800">
        {info.lineText != null && (
          <pre className="overflow-x-auto rounded-lg border-2 border-rose-300 bg-white px-2 py-1 font-mono text-[13px] text-rose-700">
            <span className="mr-2 select-none text-rose-400">{info.line} │</span>{info.lineText || ' '}
          </pre>
        )}
        <p className="leading-relaxed">{info.explanation}</p>
        {info.example && (
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#2f6b2a]">Contoh perbaikan</p>
            <pre className="mt-1 overflow-x-auto rounded-lg border-2 border-slate-800 bg-[#0f172a] px-3 py-2 font-mono text-[13px] leading-6 text-emerald-300">{info.example}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

const CONSOLE_COLOR = { out: 'text-slate-100', in: 'text-sky-300', err: 'text-rose-300', meta: 'text-slate-500 italic' };

export function ConsoleOutput({ lines, onClear }) {
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-slate-800 bg-[#0b1120] shadow-[4px_4px_0px_#1e293b]" aria-labelledby="console-title">
      <div className="flex items-center gap-2 border-b-2 border-slate-700 bg-[#1e293b] px-3 py-1.5">
        <Terminal className="h-4 w-4 text-emerald-300" aria-hidden />
        <h3 id="console-title" className="font-mono text-xs font-bold text-slate-300">Konsol Output</h3>
        <button type="button" onClick={onClear} className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-400 hover:bg-slate-700 hover:text-white">
          <Eraser className="h-3.5 w-3.5" aria-hidden /> Bersihkan
        </button>
      </div>
      <pre className="h-56 overflow-auto p-3 font-mono text-[13px] leading-6" aria-live="polite">
        {lines.length === 0 ? (
          <span className="italic text-slate-500">Tekan “Jalankan Kode (Run)” untuk melihat hasil print() di sini.</span>
        ) : (
          lines.map((l, i) => (
            <div key={`${i}-${l.text}`} className={`whitespace-pre-wrap break-words ${CONSOLE_COLOR[l.kind] ?? ''}`}>{l.text}</div>
          ))
        )}
      </pre>
    </section>
  );
}

export function TestReport({ report }) {
  return (
    <section className={`${CARD} p-4`} aria-label="Hasil uji tersembunyi">
      <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-800">Hasil Uji Tersembunyi</h3>
      <ul className="space-y-2">
        {report.map((r, i) => (
          <li key={r.label} className={`flex gap-2 rounded-xl border-2 px-3 py-2 text-sm ${r.passed ? 'border-[#4f8f3a] bg-[#e3f4d7]' : 'border-[#c4562f] bg-rose-50'}`}>
            {r.passed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6b2a]" aria-hidden /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#c4562f]" aria-hidden />}
            <span>
              <span className="font-black text-slate-900">Uji {i + 1}: {r.label}</span>
              <span className="block text-slate-700">
                {r.passed ? 'Lulus.' : r.reason ?? `Program berhenti karena ${r.error?.type ?? 'galat'}. Lihat kotak merah di bawah editor.`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Panel hint bertingkat Bu Ratna (manual lewat "Minta Hint" atau otomatis setelah 3 kali gagal). */
export function HintPanel({ level, auto, onNext, onClose }) {
  const hint = HINTS[level - 1];
  return (
    <section className={`${CARD} hint-in border-[#e9b949] p-4`} aria-label={`Hint ${level} dari ${HINTS.length}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-full border-2 border-slate-800 bg-[#ffd23f] px-2.5 py-0.5 text-xs font-black text-slate-900">
          <Lightbulb className="hint-bell h-3.5 w-3.5" aria-hidden /> {auto ? 'Auto-Hint Bu Ratna' : 'Hint Bu Ratna'}
        </span>
        <span className="text-xs font-semibold text-slate-600">
          {auto ? 'Kamu sudah mencoba beberapa kali. Ibu bantu sedikit, ya!' : `Hint ${level} dari ${HINTS.length}`}
        </span>
      </div>
      <BuRatnaCharacter
        mood="thinking"
        size={90}
        title={hint.title}
        replayKey={level}
        dialogue={hint.text}
        actions={
          <div className="w-full">
            <pre className="overflow-x-auto rounded-lg border-2 border-slate-800 bg-[#0f172a] px-3 py-2 text-left font-mono text-[12px] leading-5 text-emerald-300">{hint.code}</pre>
            <div className="mt-2 flex flex-wrap gap-2">
              {level < HINTS.length && (
                <button type="button" onClick={onNext} className={`${TACTILE} rounded-lg bg-[#ffd23f] px-3 py-1 text-xs font-black text-slate-900`}>
                  Hint berikutnya ({level + 1}/{HINTS.length})
                </button>
              )}
              <button type="button" onClick={onClose} className={`${TACTILE} rounded-lg bg-white px-3 py-1 text-xs font-bold text-slate-900`}>
                Tutup hint
              </button>
            </div>
          </div>
        }
      />
    </section>
  );
}
