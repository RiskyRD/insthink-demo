import { useEffect, useState } from 'react';
import { ArrowLeft, Coffee, FileCode2, FlaskConical, Lightbulb, Loader2, Play, RotateCcw, Trophy } from 'lucide-react';
import VillageBackdrop from './game/VillageBackdrop';
import BuRatnaCharacter from './game/BuRatnaCharacter';
import SoundToggle from './game/SoundToggle';
import CodeEditor from './game/chapter3/CodeEditor';
import { ConsoleOutput, FriendlyErrorBox, HintPanel, TestReport } from './game/Chapter3MoneyTracker';
import { HIDDEN_TESTS, HINTS, MISSION_STEPS, STARTER_CODE, STDIN_FIELDS, gradeTest, structureIssues, toConsole } from './game/chapter3/moneyTracker';
import { useGameAudio } from './game/useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './game/theme';
import { usePyodideRunner } from '../hooks/usePyodideRunner';
import { formatFriendlyPythonError } from '../lib/friendlyPythonError';

const STORAGE_KEY = 'insthink.practice.tracker';
const AUTO_HINT_AT = 3;

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

/**
 * Langkah 3: Praktik Money Tracker (hands-on mandiri, tanpa ruangan/backend).
 * Tampilan online compiler: kartu instruksi, editor Python (Pyodide lokal), masukan uji,
 * konsol output, penjelasan galat ramah, hint bertingkat Bu Ratna, dan cek jawaban lokal.
 *
 * @param {() => void} onBack       kembali ke Main Menu
 * @param {() => void} onPlayBonus  membuka Bonus: Minigame Kedai (lobby co-op)
 */
export default function MoneyTrackerPractice({ onBack, onPlayBonus }) {
  const runner = usePyodideRunner();
  const { playClick, playSuccess, playError, playPing } = useGameAudio();
  const [saved] = useState(loadProgress);

  const [code, setCode] = useState(saved.code ?? '');
  const [stdin, setStdin] = useState(() => Object.fromEntries(STDIN_FIELDS.map((f) => [f.key, f.example])));
  const [consoleLines, setConsoleLines] = useState([]);
  const [friendly, setFriendly] = useState(null);
  const [testReport, setTestReport] = useState(null);
  const [attempts, setAttempts] = useState(saved.attempts ?? 0);
  const [errorCount, setErrorCount] = useState(saved.errors ?? 0);
  const [solved, setSolved] = useState(Boolean(saved.solved));
  const [autoHintDone, setAutoHintDone] = useState(Boolean(saved.autoHint));
  const [hintLevel, setHintLevel] = useState(0);
  const [hintAuto, setHintAuto] = useState(false);
  const [busy, setBusy] = useState(null); // 'run' | 'test'
  const [say, setSay] = useState(null);

  useEffect(() => {
    saveProgress({ code, attempts, errors: errorCount, solved, autoHint: autoHintDone });
  }, [code, attempts, errorCount, solved, autoHintDone]);

  // Auto-hint Bu Ratna setelah 3 kali galat/gagal uji.
  useEffect(() => {
    if (errorCount >= AUTO_HINT_AT && !autoHintDone) {
      setAutoHintDone(true);
      setHintAuto(true);
      setHintLevel((l) => Math.max(1, l));
      playPing();
    }
  }, [errorCount, autoHintDone, playPing]);

  const press = (fn) => () => {
    playClick();
    fn?.();
  };

  const handleCodeChange = (next) => {
    setCode(next);
    if (friendly) setFriendly(null);
  };

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

    const result = await runner.run(code, STDIN_FIELDS.map((f) => stdin[f.key]));
    setConsoleLines(toConsole(result));
    if (result.error) {
      const info = formatFriendlyPythonError(result.error, code);
      setFriendly(info);
      setSay({ mood: 'shocked', text: `Ups, ada galat${info.line ? ` di baris ${info.line}` : ''}: ${info.title}. Baca kotak merah di bawah editor, ya.` });
      playError();
      setErrorCount((c) => c + 1);
    } else {
      setSay({ mood: 'happy', text: 'Program berjalan! Cocokkan hasil di Konsol Output dengan hitunganmu. Kalau sudah yakin, tekan "Cek Jawaban".' });
    }
    setBusy(null);
  };

  const check = async () => {
    if (!runner.isReady || busy) return;
    if (!code.trim()) {
      setSay({ mood: 'thinking', text: 'Tulis kodenya dulu, baru kita cek bersama.' });
      return;
    }
    playClick();
    setAttempts((a) => a + 1);
    setFriendly(null);
    setTestReport(null);
    setBusy('test');
    setSay({ mood: 'thinking', text: 'Ibu uji dengan 2 catatan keuangan rahasia: satu hari yang hemat dan satu hari yang boros…' });

    const results = await runner.runTests(code, HIDDEN_TESTS.map((t) => t.inputs));
    const report = HIDDEN_TESTS.map((test, i) => {
      const result = results[i] ?? { error: { type: 'TimeoutError', message: 'uji dihentikan', line: null }, stdout: '' };
      return { label: test.label, error: result.error, stdout: result.stdout, ...gradeTest(result, test) };
    });
    setBusy(null);

    // Struktur wajib dicek setelah kode terbukti berjalan, agar galat penulisan dijelaskan lebih dulu.
    const issues = report.some((r) => r.error) ? [] : structureIssues(code);
    if (issues.length) {
      setFriendly({ type: 'Struktur', title: 'Struktur program belum sesuai misi', line: null, lineText: null, explanation: issues.join(' '), example: null });
      setSay({ mood: 'thinking', text: issues[0] });
      playError();
      setErrorCount((c) => c + 1);
      return;
    }
    setTestReport(report);

    const failed = report.find((r) => !r.passed);
    if (failed) {
      playError();
      setErrorCount((c) => c + 1);
      if (failed.error) {
        const info = formatFriendlyPythonError(failed.error, code);
        setFriendly(info);
        setSay({ mood: 'shocked', text: `Uji "${failed.label}" berhenti karena galat${info.line ? ` di baris ${info.line}` : ''}. ${info.title}.` });
      } else {
        setSay({ mood: 'shocked', text: `${report.filter((r) => r.passed).length} dari ${report.length} uji lulus. ${failed.reason}` });
      }
      return;
    }

    playSuccess();
    setSolved(true);
    setSay({ mood: 'happy', text: 'Hebat! Money Tracker-mu menghitung dengan tepat di kedua uji. Kedai Ibu sekarang punya pencatat keuangan!' });
  };

  const restart = () => {
    playClick();
    if (!window.confirm('Ulangi praktik dari awal? Kode dan catatan percobaan akan dihapus.')) return;
    setCode('');
    setConsoleLines([]);
    setFriendly(null);
    setTestReport(null);
    setAttempts(0);
    setErrorCount(0);
    setSolved(false);
    setAutoHintDone(false);
    setHintLevel(0);
    setSay(null);
  };

  return (
    <VillageBackdrop>
      <header className="sticky top-0 z-30 border-b-2 border-slate-800 bg-[#fffaf0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <button type="button" onClick={press(onBack)} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-slate-900`}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Menu Utama</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#c4562f]">Langkah 3</p>
            <h1 className="truncate text-lg font-black text-slate-900">Praktik Money Tracker</h1>
          </div>
          <span className="hidden rounded-full border-2 border-slate-800 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 sm:inline">
            Percobaan: {attempts} · Galat: {errorCount}
          </span>
          <SoundToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        {/* Kartu instruksi Bu Ratna */}
        <section className={`${CARD} overflow-hidden`} aria-labelledby="tracker-title">
          <div className="flex flex-wrap items-center gap-3 border-b-2 border-slate-800 px-4 py-3" style={WOOD_BG}>
            <span className="rounded-full border-2 border-slate-800 bg-[#ffd23f] px-3 py-0.5 text-xs font-black tracking-wider text-slate-900 shadow-[2px_2px_0px_#1e293b]">HANDS-ON</span>
            <h2 id="tracker-title" className="text-lg font-black text-[#fff3d6] [text-shadow:2px_2px_0_#3e2210] sm:text-xl">Coding Money Tracker Kedai</h2>
          </div>
          <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <BuRatnaCharacter
              mood={busy ? 'thinking' : say?.mood ?? 'idle'}
              size={110}
              title="Bu Ratna"
              replayKey={say?.text}
              dialogue={say?.text ?? 'Setiap hari Ibu belanja 3 kali untuk kedai. Bantu Ibu membuat program yang menghitung total pengeluaran dan sisa modal, lalu memberi peringatan kalau pengeluarannya kebablasan!'}
            />
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-slate-800">
                <FileCode2 className="h-4 w-4 text-[#c4562f]" aria-hidden /> Instruksi
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

        {solved && <SolvedBanner onPlayBonus={press(onPlayBonus)} onRestart={restart} onBack={press(onBack)} />}

        {hintLevel > 0 && (
          <HintPanel level={hintLevel} auto={hintAuto} onNext={nextHint} onClose={() => { playClick(); setHintLevel(0); }} />
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Editor ala online compiler */}
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
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden /> {hintLevel >= HINTS.length ? 'Semua hint terbuka' : `Butuh Bantuan? (${hintLevel + 1}/${HINTS.length})`}
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
            <section className={`${CARD} p-4`} aria-labelledby="stdin-title">
              <h3 id="stdin-title" className="mb-1 text-sm font-black uppercase tracking-wide text-slate-800">Masukan Uji (Stdin Compiler)</h3>
              <p className="mb-3 text-xs text-slate-600">Angka ini diberikan ke input() secara berurutan saat kamu menekan Jalankan. Coba ganti angkanya!</p>
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
                  onClick={check}
                  disabled={!runner.isReady || Boolean(busy)}
                  className={`${TACTILE} flex items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-3 py-2.5 font-black text-slate-900 disabled:cursor-wait disabled:opacity-60`}
                >
                  {busy === 'test' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <FlaskConical className="h-5 w-5" aria-hidden />}
                  Cek Jawaban
                </button>
              </div>
              {runner.loadError && <p className="mt-2 text-sm font-semibold text-rose-700">{runner.loadError}</p>}
            </section>

            <ConsoleOutput lines={consoleLines} onClear={() => setConsoleLines([])} />
            {testReport && <TestReport report={testReport} />}
          </div>
        </div>
      </main>
    </VillageBackdrop>
  );
}

function SolvedBanner({ onPlayBonus, onRestart, onBack }) {
  return (
    <section className={`${CARD} celebration-pop flex flex-wrap items-center gap-4 !bg-[#e3f4d7] p-4`} role="status">
      <Trophy className="trophy-bounce h-10 w-10 shrink-0 text-amber-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black text-slate-900">Praktik Money Tracker selesai!</p>
        <p className="text-sm text-slate-700">Programmu lulus kedua uji. Mau lanjut bersenang-senang di minigame kedai bersama partner?</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onPlayBonus} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-[#7c5cc4] px-4 py-2 text-sm font-black text-white`}>
          <Coffee className="h-4 w-4" aria-hidden /> Main Bonus Kedai
        </button>
        <button type="button" onClick={onRestart} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900`}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Ulangi
        </button>
        <button type="button" onClick={onBack} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-[#fff7e0] px-3 py-2 text-sm font-bold text-slate-900`}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Menu Utama
        </button>
      </div>
    </section>
  );
}
