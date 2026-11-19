import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, Check, CheckCircle2, ClipboardList, Coffee, Eraser, GraduationCap, Hourglass, Loader2, NotebookPen,
  PartyPopper, Play, Rocket, Store, Users, WifiOff, XCircle,
} from 'lucide-react';
import BuRatnaCharacter from './BuRatnaCharacter';
import HintBanner from './HintBanner';
import SendHintButton from './SendHintButton';
import VillagerAvatar, { VILLAGERS } from './VillagerAvatar';
import { CashierCharacter, WarehouseCharacter } from './ShopCharacters';
import { useGameAudio } from './useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './theme';
import { BlockBank, PointerHint, ProgramArea, PythonPreview } from './chapter1/BlockParts';
import {
  BLOCK_STYLE, MISSIONS, PARTNER_BOARDS, TUTORIAL_MISSION, TUTORIAL_START, TUTORIAL_STEPS,
  allVariables, blockErrorHint, createBlock, findIssues, generateCode, gradeResults, outputLines,
} from './chapter1/blockProgram';
import { usePyodideRunner } from '../../hooks/usePyodideRunner';
import { api } from '../../lib/api';

const ACTIVITY_THROTTLE_MS = 1500;
const CHEER_COOLDOWN_MS = 5000;

// ----------------------------------------------------------------------
// Penyimpanan lokal (susunan blok bertahan saat browser di-refresh)
// ----------------------------------------------------------------------
const storageKey = (roomCode, role) => `insthink.ch1.${roomCode}.${role}`;

function loadProgress(roomCode, role) {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(roomCode, role)) ?? 'null');
    return { tutorialDone: Boolean(data?.tutorialDone), program: Array.isArray(data?.program) ? data.program : [] };
  } catch {
    return { tutorialDone: false, program: [] };
  }
}

function saveProgress(roomCode, role, data) {
  try {
    localStorage.setItem(storageKey(roomCode, role), JSON.stringify(data));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

// ----------------------------------------------------------------------
// Pengelola susunan blok (dipakai tutorial dan sistem utama)
// ----------------------------------------------------------------------
function useProgramEditor(initial, mission, onEdit) {
  const [program, setProgram] = useState(initial);
  const [selectedId, setSelectedId] = useState(null);
  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;

  const commit = (next) => {
    setProgram(next);
    onEditRef.current?.(next);
  };

  const insertAt = (type, index) => {
    const block = createBlock(type, mission, program, program[index - 1] ?? null);
    commit([...program.slice(0, index), block, ...program.slice(index)]);
    setSelectedId(block.id);
  };

  /** Klik dari bank: sisipkan di bawah blok terpilih, atau di paling bawah. */
  const add = (type) => {
    const at = program.findIndex((b) => b.id === selectedId);
    insertAt(type, at >= 0 ? at + 1 : program.length);
  };

  const update = (id, key, value) =>
    commit(program.map((b) => (b.id === id ? { ...b, fields: { ...b.fields, [key]: value } } : b)));

  const move = (id, dir) => {
    const i = program.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= program.length || program[j].locked) return;
    const next = [...program];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const toggleNest = (id) => commit(program.map((b) => (b.id === id ? { ...b, nested: !b.nested } : b)));

  const remove = (id) => {
    commit(program.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const dropMove = (id, index) => {
    const from = program.findIndex((b) => b.id === id);
    if (from < 0) return;
    const block = program[from];
    const rest = program.filter((b) => b.id !== id);
    const firstFree = rest.findIndex((b) => !b.locked);
    const to = Math.max(index > from ? index - 1 : index, firstFree < 0 ? rest.length : firstFree);
    commit([...rest.slice(0, to), block, ...rest.slice(to)]);
  };

  const clear = () => {
    commit(program.filter((b) => b.locked));
    setSelectedId(null);
  };

  return { program, selectedId, setSelectedId, add, insertAt, update, move, toggleNest, remove, dropMove, clear };
}

function editorProps(editor) {
  return {
    program: editor.program,
    selectedId: editor.selectedId,
    onSelect: editor.setSelectedId,
    onUpdate: editor.update,
    onMove: editor.move,
    onToggleNest: editor.toggleNest,
    onRemove: editor.remove,
    onDropNew: editor.insertAt,
    onDropMove: editor.dropMove,
  };
}

function PanelTitle({ icon: Icon, children, aside = null }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
        {Icon && <Icon className="h-4 w-4 text-amber-700" aria-hidden />} {children}
      </h3>
      {aside}
    </div>
  );
}

const MyCharacter = ({ role, ...props }) => (role === 'cashier' ? <CashierCharacter {...props} /> : <WarehouseCharacter {...props} />);
const PartnerCharacter = ({ role, ...props }) => (role === 'cashier' ? <WarehouseCharacter {...props} /> : <CashierCharacter {...props} />);

/**
 * Chapter 1: merakit sistem dengan blok kode bergaya Scratch.
 * Alur: tutorial wajib (Step 1.0) → rakit sistem utama → uji dengan Pyodide →
 * POST chapter1-complete → layar tunggu sampai partner selesai.
 */
export default function Chapter1BlockCoding({ me, room, partner, token, realtime, hints = [], onDismissHint, nudge, onStateChange }) {
  const role = me.role;
  const runner = usePyodideRunner();
  const [progress] = useState(() => loadProgress(room.room_code, role));
  const [tutorialDone, setTutorialDone] = useState(progress.tutorialDone);
  const programRef = useRef(progress.program);
  const lastActivityRef = useRef(0);
  const { playClick } = useGameAudio();

  const persist = useCallback((patch) => {
    const data = { tutorialDone, program: programRef.current, ...patch };
    programRef.current = data.program;
    saveProgress(room.room_code, role, data);
  }, [room.room_code, role, tutorialDone]);

  /** Status ringan ke partner: "sedang menyusun blok" (dibatasi agar tidak membanjiri whisper). */
  const signalTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityRef.current = now;
    realtime.sendActivity?.('typing');
  }, [realtime]);

  const sendBoardHint = useCallback((item) => {
    const ok = realtime.sendHint?.({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: role === 'warehouse' ? 'price' : 'note',
      title: item.label,
      content: item.value,
      detail: item.detail,
      from: me.name,
    });
    if (ok) playClick();
    return ok;
  }, [realtime, role, me.name, playClick]);

  const board = PARTNER_BOARDS[role];
  const boardProps = { board, onSend: sendBoardHint, partnerOnline: realtime.partnerOnline };

  if (me.is_chapter1_done) {
    return <WaitingStage me={me} partner={partner} realtime={realtime} boardProps={boardProps} nudge={nudge} hints={hints} onDismissHint={onDismissHint} />;
  }

  if (!tutorialDone) {
    return (
      <TutorialStage
        runner={runner}
        onFinish={() => {
          setTutorialDone(true);
          persist({ tutorialDone: true });
        }}
      />
    );
  }

  return (
    <BuildStage
      me={me}
      room={room}
      partner={partner}
      token={token}
      realtime={realtime}
      runner={runner}
      initialProgram={programRef.current}
      onProgramChange={(program) => {
        persist({ program });
        signalTyping();
      }}
      boardProps={boardProps}
      hints={hints}
      onDismissHint={onDismissHint}
      nudge={nudge}
      onStateChange={onStateChange}
    />
  );
}

// ----------------------------------------------------------------------
// Step 1.0 — Tutorial wajib 3 langkah
// ----------------------------------------------------------------------
function TutorialStage({ runner, onFinish }) {
  const { playClick, playSuccess, playError, playCashRegister } = useGameAudio();
  const editor = useProgramEditor(TUTORIAL_START, TUTORIAL_MISSION, () => playClick());
  const [ran, setRan] = useState(false);
  const [run, setRun] = useState(null);
  const [running, setRunning] = useState(false);

  const { code, lines } = generateCode(editor.program, TUTORIAL_MISSION);
  const stepIndex = TUTORIAL_STEPS.findIndex((s) => !s.done(editor.program, ran));
  const finished = stepIndex === -1;
  const step = finished ? null : TUTORIAL_STEPS[stepIndex];
  const highlight = step?.target(editor.program) ?? null;

  const tryRun = async () => {
    playClick();
    const issues = findIssues(editor.program);
    if (issues.length) {
      setRun({ ok: false, message: issues[0].message });
      playError();
      return;
    }
    setRunning(true);
    const result = await runner.run(code, TUTORIAL_MISSION.sampleInput);
    setRunning(false);
    const out = outputLines(result.stdout);
    const ok = !result.error && out.join() === TUTORIAL_MISSION.expected.join();
    setRun({
      ok,
      out,
      message: ok
        ? 'Berhasil! Untuk 2 pesanan, total = 9000 × 2 = 18000.'
        : result.error
          ? blockErrorHint(result.error)
          : `Hasilnya "${out.join(' ') || '(kosong)'}", seharusnya 18000. Periksa operator dan isi blok print().`,
    });
    if (ok) {
      setRan(true);
      playCashRegister();
    } else {
      playError();
    }
  };

  let dialogue = step ? `Langkah ${stepIndex + 1}: ${step.text}` : 'Hebat! Kamu sudah paham cara kerja blok. Sekarang saatnya merakit sistem utama bersama partnermu.';
  if (run && !run.ok && !finished) dialogue = `Hampir! ${run.message}`;
  const mood = finished ? 'happy' : run && !run.ok ? 'shocked' : running ? 'thinking' : 'talking';

  return (
    <section className={`${CARD} mx-auto max-w-6xl p-4 sm:p-6`} aria-labelledby="tutorial-title">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-700">
            <GraduationCap className="h-4 w-4" aria-hidden /> Chapter 1 · Step 1.0 · Tutorial Wajib
          </p>
          <h2 id="tutorial-title" className="text-2xl font-black text-slate-900">{TUTORIAL_MISSION.title}</h2>
        </div>
        <ol className="flex flex-wrap gap-2" aria-label="Langkah tutorial">
          {TUTORIAL_STEPS.map((s, i) => {
            const done = finished || i < stepIndex;
            const active = i === stepIndex;
            return (
              <li
                key={s.title}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-1.5 rounded-full border-2 border-slate-800 px-3 py-1 text-xs font-black shadow-[2px_2px_0px_#1e293b] ${done ? 'bg-emerald-400 text-white' : active ? 'hud-pulse bg-[#ffd23f] text-slate-900' : 'bg-white text-slate-500'}`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={4} aria-hidden /> : <span>{i + 1}</span>}
                {s.title}
              </li>
            );
          })}
        </ol>
      </header>

      <div className="mb-5 rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-[#e3f4fb] to-[#fff6dc] p-3">
        <BuRatnaCharacter mood={mood} size={110} dialogue={dialogue} title="Pemilik Kedai" replayKey={run?.ok === false ? run.message : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)_minmax(0,320px)]">
        <div className={`${CARD} p-4`}>
          <PanelTitle icon={ClipboardList}>Bank Blok Kode</PanelTitle>
          <BlockBank types={TUTORIAL_MISSION.bank} onAdd={editor.add} highlight={highlight} />
        </div>

        <div className={`${CARD} p-4`}>
          <PanelTitle icon={BookOpen}>Area Susun Program</PanelTitle>
          <ProgramArea {...editorProps(editor)} mission={TUTORIAL_MISSION} highlight={highlight} issueIds={new Set()} />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <PanelTitle icon={Coffee}>Pratinjau Kode Python Asli</PanelTitle>
            <PythonPreview lines={lines} selectedId={editor.selectedId} />
          </div>

          <div className="relative">
            {highlight === 'run' && <PointerHint label="Tekan untuk mencoba" />}
            <button
              type="button"
              onClick={tryRun}
              disabled={!runner.isReady || running}
              className={`${TACTILE} ${highlight === 'run' ? 'tutorial-glow' : ''} flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-black text-white hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60`}
            >
              {running || !runner.isReady ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
              {runner.isReady ? 'Coba Jalankan (jumlah = 2)' : 'Menyiapkan mesin Python…'}
            </button>
            {runner.loadError && <p className="mt-2 text-sm font-semibold text-rose-700">{runner.loadError}</p>}
          </div>

          {run && (
            <div className={`rounded-xl border-2 border-slate-800 p-3 text-sm font-semibold ${run.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-50 text-rose-800'}`} role="status">
              {run.out?.length > 0 && <p className="mb-1 font-mono text-base font-black">Layar: {run.out.join(' ')}</p>}
              {run.message}
            </div>
          )}

          {finished && (
            <button
              type="button"
              onClick={() => { playSuccess(); onFinish(); }}
              className={`${TACTILE} prolog-cta-pulse flex items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-4 py-3 text-lg font-black text-slate-900 hover:bg-[#ffdc5e]`}
            >
              <Rocket className="h-6 w-6" aria-hidden /> Mulai Rakit Sistem Utama
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// Rakit sistem utama
// ----------------------------------------------------------------------
function BuildStage({
  me, room, partner, token, realtime, runner, initialProgram, onProgramChange, boardProps, hints, onDismissHint, nudge, onStateChange,
}) {
  const role = me.role;
  const mission = MISSIONS[role];
  const { playClick, playSuccess, playError, playPing } = useGameAudio();
  const editor = useProgramEditor(initialProgram, mission, onProgramChange);
  const [showIssues, setShowIssues] = useState(false);
  const [testing, setTesting] = useState(false);
  const [report, setReport] = useState(null);
  const [errorBlockId, setErrorBlockId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  const { code, lines } = useMemo(() => generateCode(editor.program, mission), [editor.program, mission]);
  const issues = useMemo(() => findIssues(editor.program), [editor.program]);
  const issueIds = useMemo(() => new Set(showIssues ? issues.map((i) => i.blockId).filter(Boolean) : []), [issues, showIssues]);
  const errorLine = report?.find((r) => !r.passed && r.errorLine)?.errorLine ?? null;

  useEffect(() => {
    if (!nudge) return;
    playPing();
    setFeedback({ mood: 'happy', text: `${nudge.from || 'Partnermu'} menyemangatimu! Ayo selesaikan sistemmu.` });
  }, [nudge]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (payload) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const state = await api(`/rooms/${room.room_code}/chapter1-complete`, { method: 'POST', token, body: payload });
      onStateChange(state);
    } catch (err) {
      setSubmitError(err.message);
      setPendingSubmit(payload);
      playError();
    } finally {
      setSubmitting(false);
    }
  };

  const testAndActivate = async () => {
    if (testing || submitting) return;
    playClick();
    setShowIssues(true);
    setErrorBlockId(null);

    if (issues.length) {
      setFeedback({ mood: 'shocked', text: issues[0].message });
      playError();
      return;
    }

    setTesting(true);
    setReport(null);
    setFeedback({ mood: 'thinking', text: 'Pelanggan desa mulai berdatangan. Ayo kita lihat apakah sistemmu bekerja…' });
    realtime.sendActivity?.('running');

    const results = await runner.runTests(code, mission.tests.map((t) => t.inputs));
    const graded = gradeResults(mission.tests, results);
    setReport(graded);
    setTesting(false);
    realtime.sendActivity?.('idle');

    const passed = graded.filter((g) => g.passed).length;
    const failed = graded.find((g) => !g.passed);
    if (failed) {
      setErrorBlockId(failed.errorLine ? lines[failed.errorLine - 1]?.blockId ?? null : null);
      setFeedback({ mood: 'shocked', text: `${passed} dari ${graded.length} pelanggan terlayani dengan benar. ${failed.reason}` });
      playError();
      // Catat uji gagal untuk dashboard fasilitator; kegagalan jaringan diabaikan agar tidak mengganggu siswa.
      api(`/rooms/${room.room_code}/chapter1-attempt`, {
        method: 'POST',
        token,
        body: { code, output: `${passed}/${graded.length} uji lulus. ${failed.reason}`.slice(0, 5000) },
      }).catch(() => {});
      return;
    }

    playSuccess();
    setFeedback({ mood: 'happy', text: 'Luar biasa! Semua pelanggan terlayani dengan benar. Sistemmu sedang diaktifkan…' });
    await submit({
      code,
      output: graded.map((g, i) => `Uji ${i + 1} [${g.inputs.join(', ')}]: ${g.actual.join(' | ')}`).join('\n').slice(0, 5000),
    });
  };

  const defaultDialogue = `Susun blok ${mission.title} sesuai Kartu Misi. Ingat, beberapa angka hanya diketahui oleh ${partner?.name ?? 'partnermu'}. Tanyakan atau minta dikirimi petunjuk!`;
  const mood = testing ? 'thinking' : feedback?.mood ?? 'idle';
  const allPassed = report?.every((r) => r.passed);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <HintBanner hints={hints} onDismiss={onDismissHint} />

      {/* Panggung: Bu Ratna, Kasir, Penjaga Gudang, dan tombol uji */}
      <section className={`${CARD} flex flex-wrap items-center gap-4 p-4`}>
        <div className="min-w-[260px] flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Chapter 1 · Merakit Sistem</p>
          <h2 className="mb-2 text-2xl font-black text-slate-900">{mission.title}</h2>
          <BuRatnaCharacter mood={mood} size={95} dialogue={feedback?.text ?? defaultDialogue} title="Pemilik Kedai" replayKey={feedback?.text} />
        </div>
        <div className="flex items-end gap-2">
          <MyCharacter role={role} mood={testing ? 'thinking' : allPassed ? 'happy' : feedback?.mood === 'shocked' ? 'shocked' : 'idle'} size={100} caption={`${me.name} (Kamu)`} />
          <PartnerCharacter role={role} mood={partnerMood(partner, realtime)} size={85} caption={partner?.name ?? 'Partner'} dim />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <button
            type="button"
            onClick={testAndActivate}
            disabled={!runner.isReady || testing || submitting}
            className={`${TACTILE} flex items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-3 text-lg font-black text-slate-900 hover:bg-[#ffdc5e] disabled:cursor-wait disabled:opacity-60`}
          >
            {testing || submitting || !runner.isReady ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <Rocket className="h-6 w-6" aria-hidden />}
            {!runner.isReady ? 'Menyiapkan Python…' : testing ? 'Menguji…' : submitting ? 'Mengaktifkan…' : 'Uji & Aktifkan Sistem'}
          </button>
          {runner.loadError && <p className="max-w-xs text-sm font-semibold text-rose-700">{runner.loadError}</p>}
          {submitError && (
            <div className="max-w-xs rounded-lg border-2 border-rose-300 bg-rose-50 p-2 text-sm font-semibold text-rose-700" role="alert">
              {submitError}
              {pendingSubmit && (
                <button type="button" onClick={() => submit(pendingSubmit)} className="ml-1 underline">Kirim ulang</button>
              )}
            </div>
          )}
          <PartnerStatus partner={partner} realtime={realtime} doneText="sudah mengaktifkan sistemnya!" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_minmax(0,350px)]">
        <aside className="flex flex-col gap-5">
          <div className={`${CARD} p-4`}>
            <PanelTitle icon={ClipboardList}>Bank Blok Kode</PanelTitle>
            <BlockBank types={mission.bank} onAdd={editor.add} />
            <p className="mt-4 text-xs font-semibold text-slate-500">Tip: pilih sebuah blok di area susun, maka blok baru akan dipasang tepat di bawahnya.</p>
          </div>
          <MissionBrief mission={mission} />
        </aside>

        <section className={`${CARD} p-4`}>
          <PanelTitle
            icon={BookOpen}
            aside={(
              <button
                type="button"
                onClick={() => { if (window.confirm('Lepas semua blok dari Area Susun Program?')) editor.clear(); }}
                disabled={editor.program.length === 0}
                className={`${TACTILE} inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700 disabled:opacity-40`}
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Kosongkan
              </button>
            )}
          >
            Area Susun Program
          </PanelTitle>
          <ProgramArea {...editorProps(editor)} mission={mission} issueIds={issueIds} errorBlockId={errorBlockId} disabled={testing || submitting} />
          {showIssues && issues.length > 0 && (
            <ul className="mt-4 space-y-1.5 rounded-xl border-2 border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800" role="alert">
              {issues.slice(0, 4).map((issue, i) => (
                <li key={`${issue.blockId}-${i}`} className="flex gap-1.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {issue.blockId ? `Baris ${editor.program.findIndex((b) => b.id === issue.blockId) + 1}: ` : ''}{issue.message}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-5 lg:col-span-2 xl:col-span-1">
          <div>
            <PanelTitle icon={Coffee}>Pratinjau Kode Python Asli</PanelTitle>
            <PythonPreview lines={lines} errorLine={errorLine} selectedId={editor.selectedId} />
          </div>
          <PartnerBoard {...boardProps} />
        </aside>
      </div>

      <CustomerQueue role={role} tests={mission.tests} report={report} testing={testing} />
    </div>
  );
}

function partnerMood(partner, realtime) {
  if (!partner || !realtime.partnerOnline) return 'offline';
  if (partner.is_chapter1_done) return 'happy';
  if (realtime.partnerActivity === 'running' || realtime.partnerActivity === 'typing') return 'thinking';
  return 'idle';
}

function PartnerStatus({ partner, realtime, doneText }) {
  let icon = Hourglass;
  let tone = 'bg-amber-100 text-amber-900';
  let text = `${partner?.name} sedang berpikir…`;
  if (!partner) {
    text = 'Partner belum bergabung.';
    tone = 'bg-slate-100 text-slate-600';
  } else if (partner.is_chapter1_done) {
    icon = CheckCircle2;
    tone = 'bg-emerald-100 text-emerald-800';
    text = `${partner.name} ${doneText}`;
  } else if (!realtime.partnerOnline) {
    icon = WifiOff;
    tone = 'bg-slate-100 text-slate-600';
    text = `${partner.name} sedang offline.`;
  } else if (realtime.partnerActivity === 'typing') {
    text = `${partner.name} sedang menyusun blok…`;
  } else if (realtime.partnerActivity === 'running') {
    text = `${partner.name} sedang menguji sistemnya…`;
  }
  const Icon = icon;
  return (
    <p className={`flex max-w-xs items-center gap-1.5 rounded-full border-2 border-slate-800 px-3 py-1 text-xs font-bold ${tone}`} role="status" aria-live="polite">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> {text}
    </p>
  );
}

function MissionBrief({ mission }) {
  const chip = (type, name) => (
    <span key={name} className={`rounded-full border-2 border-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold ${BLOCK_STYLE[type].bg} ${BLOCK_STYLE[type].text}`}>{name}</span>
  );
  return (
    <div className={`${CARD} p-4`}>
      <PanelTitle icon={NotebookPen}>Kartu Misi</PanelTitle>
      <p className="mb-2 text-sm font-bold text-slate-800">{mission.goal}</p>
      <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
        {mission.brief.map((line) => <li key={line}>{line}</li>)}
      </ol>
      <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500">Nama variabel</p>
      <div className="flex flex-wrap gap-1.5">
        {mission.inputs.map((i) => chip('input', i.name))}
        {mission.constants.map((n) => chip('const', n))}
        {mission.computed.map((n) => chip('calc', n))}
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-500">Total {allVariables(mission).length} variabel. Pakai nama persis seperti di atas.</p>
    </div>
  );
}

/** Kartu informasi yang hanya dipegang peran ini, lengkap dengan tombol whisper ke partner. */
function PartnerBoard({ board, onSend, partnerOnline }) {
  return (
    <div className="rounded-2xl border-2 border-slate-800 p-3 shadow-[4px_4px_0px_#1e293b]" style={WOOD_BG}>
      <div className="rounded-xl bg-[#fffaf0] p-3">
        <PanelTitle icon={Users}>{board.title}</PanelTitle>
        <p className="-mt-2 mb-3 text-xs font-semibold text-slate-600">{board.subtitle}</p>
        <ul className="space-y-2.5">
          {board.items.map((item) => (
            <li key={item.label} className="rounded-xl border-2 border-slate-800 bg-white p-2.5">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                <span className="whitespace-nowrap font-mono text-base font-black text-emerald-700">{item.value}</span>
              </div>
              <SendHintButton
                onSend={() => onSend(item)}
                disabled={!partnerOnline}
                disabledReason="Partner belum online"
                label="Kirim Petunjuk ke Partner"
                sentLabel="Terkirim ke partner!"
                className="w-full"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Simulasi pesanan pelanggan desa: setiap kasus uji adalah satu pelanggan. */
function CustomerQueue({ role, tests, report, testing }) {
  return (
    <section className={`${CARD} p-4`} aria-label="Simulasi pesanan pelanggan desa">
      <PanelTitle icon={Store}>Simulasi Pelanggan Desa</PanelTitle>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tests.map((test, i) => {
          const r = report?.[i];
          return (
            <li
              key={test.inputs.join('-')}
              className={`customer-reveal relative overflow-hidden rounded-xl border-2 border-slate-800 p-3 ${r ? (r.passed ? 'bg-emerald-50' : 'bg-rose-50') : 'bg-white'}`}
              style={r ? { animationDelay: `${i * 0.25}s` } : undefined}
            >
              <div className="flex items-center gap-2">
                <VillagerAvatar index={i} className={`h-12 w-12 shrink-0 ${testing ? 'tech-breathe' : ''}`} />
                <div className="min-w-0">
                  <p className="font-black text-slate-900">{VILLAGERS[i % VILLAGERS.length].name}</p>
                  <p className="text-xs font-semibold text-slate-600">{test.order}</p>
                  <p className="text-xs text-slate-500">{test.pay}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Data {role === 'cashier' ? 'pesanan' : 'stok'}: <span className="font-mono normal-case">{test.inputs.join(', ')}</span></p>
              <p className="text-sm text-slate-700">Harapan layar: <span className="font-mono font-black">{test.expected.join(' / ')}</span></p>
              {r && (
                <>
                  <p className="text-sm text-slate-700">Layar sistem: <span className="font-mono font-black">{r.actual.join(' / ') || '(kosong)'}</span></p>
                  {!r.passed && <p className="mt-1 text-xs font-semibold text-rose-700">{r.reason}</p>}
                  <span className={`stamp-in absolute right-2 top-2 rounded-md border-[3px] px-1.5 text-xs font-black ${r.passed ? 'border-emerald-600 text-emerald-600' : 'border-rose-600 text-rose-600'}`}>
                    {r.passed ? 'LULUS' : 'GAGAL'}
                  </span>
                </>
              )}
              {testing && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-slate-500" aria-label="Sedang diuji" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ----------------------------------------------------------------------
// Layar tunggu interaktif (satu pemain sudah selesai)
// ----------------------------------------------------------------------
function WaitingStage({ me, partner, realtime, boardProps, nudge, hints, onDismissHint }) {
  const { playClick, playPing, playCashRegister } = useGameAudio();
  const [cheered, setCheered] = useState(false);
  const [brew, setBrew] = useState(0);
  const [cups, setCups] = useState(0);
  const [banner, setBanner] = useState(null);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!nudge) return;
    playPing();
    setBanner(`${nudge.from || 'Partnermu'} mengirim semangat!`);
  }, [nudge]); // eslint-disable-line react-hooks/exhaustive-deps

  const cheer = () => {
    if (cheered) return;
    playClick();
    if (realtime.sendNudge?.({ from: me.name }) === false) return;
    setCheered(true);
    timerRef.current = setTimeout(() => setCheered(false), CHEER_COOLDOWN_MS);
  };

  // Mini-game: seduh kopi sambil menunggu.
  const pour = () => {
    const next = brew + 20;
    if (next >= 100) {
      setBrew(0);
      setCups((c) => c + 1);
      playCashRegister();
    } else {
      setBrew(next);
      playClick();
    }
  };

  const partnerName = partner?.name ?? 'partnermu';

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <HintBanner hints={hints} onDismiss={onDismissHint} />
      <section className={`${CARD} p-5`}>
        {banner && (
          <p className="prolog-nudge mx-auto mb-3 w-fit rounded-full border-2 border-slate-800 bg-[#ffd23f] px-4 py-1 text-sm font-black" role="status">{banner}</p>
        )}
        <div className="flex flex-wrap items-end justify-center gap-6">
          <BuRatnaCharacter
            mood="happy"
            size={120}
            title="Pemilik Kedai"
            dialogue={`Sistemmu sudah aktif! Sekarang tunggu ${partnerName}. Bantu dia dengan mengirim data dari papanmu, ya.`}
          />
          <div className="flex items-end gap-3">
            <MyCharacter role={me.role} mood="happy" size={120} caption={`${me.name} · Selesai`} />
            <PartnerCharacter role={me.role} mood={partnerMood(partner, realtime)} size={120} caption={partner?.name ?? 'Partner'} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <PartnerStatus partner={partner} realtime={realtime} doneText="juga sudah selesai!" />
          <button
            type="button"
            onClick={cheer}
            disabled={cheered || !realtime.partnerOnline}
            className={`${TACTILE} inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold disabled:opacity-60 ${cheered ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800 hover:bg-amber-50'}`}
          >
            {cheered ? <Check className="h-4 w-4" aria-hidden /> : <PartyPopper className="h-4 w-4" aria-hidden />}
            {cheered ? 'Semangat terkirim!' : `Semangati ${partnerName}`}
          </button>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <PartnerBoard {...boardProps} />
        <div className={`${CARD} flex flex-col items-center p-5 text-center`}>
          <PanelTitle icon={Coffee}>Sambil Menunggu: Seduh Kopi!</PanelTitle>
          <p className="mb-3 text-sm text-slate-600">Klik teko untuk menuang air panas. Siapkan kopi untuk pelanggan pertama!</p>
          <button type="button" onClick={pour} className="group relative" aria-label={`Tuang air, cangkir terisi ${brew} persen`}>
            <svg viewBox="0 0 120 110" className="h-32 w-36 transition-transform duration-100 group-active:scale-95" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round">
              {brew > 0 && <path className="ratna-think-dot" d="M48 12 Q44 4 50 0 M62 12 Q58 4 64 0" fill="none" strokeWidth="2.5" />}
              <path d="M24 30 L96 30 L88 96 Q60 104 32 96 Z" fill="#fffaf0" />
              <clipPath id="cup-fill"><path d="M24 30 L96 30 L88 96 Q60 104 32 96 Z" /></clipPath>
              <rect x="20" y={100 - (brew / 100) * 70} width="80" height="80" fill="#6b3f1d" clipPath="url(#cup-fill)" stroke="none" className="transition-all duration-300" />
              <path d="M24 30 L96 30 L88 96 Q60 104 32 96 Z" fill="none" />
              <path d="M95 44 Q114 46 108 66 Q104 78 90 78" fill="none" strokeWidth="5" />
            </svg>
          </button>
          <p className="mt-2 font-mono text-sm font-black text-slate-800">{brew}% · {cups} cangkir siap</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Transisi "Toko Resmi Dibuka!" (dipasang di PlayPage saat chapter1 → chapter2)
// ----------------------------------------------------------------------
export function ShopOpeningTransition({ open, me, partner, onClose }) {
  const { playSuccess, playCashRegister } = useGameAudio();

  useEffect(() => {
    if (!open) return undefined;
    playSuccess();
    const t = setTimeout(playCashRegister, 900);
    return () => clearTimeout(t);
  }, [open, playSuccess, playCashRegister]);

  if (!open) return null;

  const names = { [me.role]: `${me.name}`, ...(partner ? { [partner.role]: partner.name } : {}) };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/70 p-4" role="dialog" aria-modal="true" aria-labelledby="shop-open-title">
      <div className="victory-rays pointer-events-none absolute -inset-[50%]" aria-hidden />
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="coin-fall flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-800 bg-[#ffd23f] text-[10px] font-black text-amber-900"
          style={{ left: `${(i * 37) % 100}%`, animationDuration: `${3 + (i % 4)}s`, animationDelay: `${(i % 5) * 0.4}s` }}
          aria-hidden
        >
          Rp
        </span>
      ))}

      <div className="celebration-pop relative w-full max-w-2xl">
        {/* Tenda bergaris kunyit-krem */}
        <div className="awning-drop relative z-10 h-14 rounded-t-2xl border-2 border-slate-800 bg-[repeating-linear-gradient(90deg,#f4b942_0_40px,#fffaf0_40px_80px)]">
          <div className="absolute -bottom-4 left-0 right-0 flex overflow-hidden" aria-hidden>
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className={`h-8 flex-1 rounded-b-full border-2 border-t-0 border-slate-800 ${i % 2 ? 'bg-[#fffaf0]' : 'bg-[#f4b942]'}`} />
            ))}
          </div>
        </div>

        <div className="rounded-b-2xl border-2 border-t-0 border-slate-800 bg-[#fffaf0] px-6 pb-6 pt-8 text-center shadow-[6px_6px_0px_#1e293b]">
          <div className="shop-sign-swing mx-auto -mt-2 mb-4 w-fit origin-top">
            <div className="mx-auto flex w-40 justify-between px-6" aria-hidden>
              <span className="h-5 w-0.5 bg-slate-800" />
              <span className="h-5 w-0.5 bg-slate-800" />
            </div>
            <h2
              id="shop-open-title"
              style={WOOD_BG}
              className="rounded-xl border-2 border-slate-800 px-6 py-3 text-3xl font-black tracking-wide text-[#fff3d6] shadow-[4px_4px_0px_#1e293b] [text-shadow:2px_2px_0_#3e2210] sm:text-4xl"
            >
              Toko Resmi Dibuka!
            </h2>
          </div>
          <p className="mx-auto max-w-md text-slate-700">
            Sistem Kasir dan Sistem Stok Gudang sudah aktif. Kedai Kopi &amp; Camilan Desa siap melayani pelanggan pertama!
          </p>

          <div className="mt-4 flex items-end justify-center gap-2">
            <CashierCharacter mood="happy" size={110} caption={names.cashier ?? 'Kasir'} />
            <BuRatnaCharacter mood="happy" size={120} />
            <WarehouseCharacter mood="happy" size={110} caption={names.warehouse ?? 'Penjaga Gudang'} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`${TACTILE} prolog-cta-pulse mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-lg font-black text-white hover:bg-emerald-600`}
          >
            <Store className="h-6 w-6" aria-hidden /> Masuk ke Chapter 2
          </button>
        </div>
      </div>
    </div>
  );
}
