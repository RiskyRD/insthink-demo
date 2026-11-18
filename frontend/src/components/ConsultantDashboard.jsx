import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Radio, RotateCcw, XCircle } from 'lucide-react';
import DecisionMatrix from './DecisionMatrix';
import BuRatnaCharacter from './game/BuRatnaCharacter';
import TechnicianAvatar from './game/TechnicianAvatar';
import SendHintButton from './game/SendHintButton';
import { useGameAudio } from './game/useGameAudio';
import { BananaChipIcon, CalculatorIcon, CoinStackIcon, PriceTagIcon, iconForRule } from './game/CartoonIcons';
import { CARD, TACTILE, WOOD_BG } from './game/theme';
import { formatDuration } from '../lib/api';

const AVATAR_REACTION_MS = 5000;

const RULE_STICKER = new Map([
  [CoinStackIcon, ['LABA', 'bg-[#ffd23f]']],
  [PriceTagIcon, ['HARGA', 'bg-[#ff9f68]']],
  [CalculatorIcon, ['TAMPIL', 'bg-[#99f6e4]']],
  [BananaChipIcon, ['PRODUKSI', 'bg-[#fde68a]']],
]);

const splitSentences = (text) =>
  (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean);

/**
 * Layar Pemain 1 â€” Konsultan Bisnis Desa.
 * Hanya memakai payload proyeksi Konsultan (aturan, rumus, variabel, diagnosis) â€” tidak ada kode Python.
 * Petunjuk ke Teknisi dikirim sebagai client whisper `hint_ping` atas pilihan Konsultan sendiri.
 */
export default function ConsultantDashboard({ mission, roomStatus, partner, realtime, lastEvaluation, history, meName }) {
  const { playClick, playSuccess, playError } = useGameAudio();
  const [ratnaReaction, setRatnaReaction] = useState(null);
  const [avatarReaction, setAvatarReaction] = useState(null);
  const seenLogRef = useRef(lastEvaluation?.log_id ?? null);

  // Hasil evaluasi baru (bukan dari pemulihan state): bunyi + reaksi karakter.
  useEffect(() => {
    if (!lastEvaluation || lastEvaluation.log_id === seenLogRef.current) return;
    seenLogRef.current = lastEvaluation.log_id;
    if (lastEvaluation.is_passed) playSuccess();
    else playError();
    setRatnaReaction(lastEvaluation);
    setAvatarReaction({ mood: lastEvaluation.is_passed ? 'happy' : 'shocked', id: lastEvaluation.log_id });
  }, [lastEvaluation, playSuccess, playError]);

  // Reaksi avatar Teknisi hanya sebentar, lalu kembali mengikuti aktivitas langsung.
  useEffect(() => {
    if (!avatarReaction) return undefined;
    const id = setTimeout(() => setAvatarReaction(null), AVATAR_REACTION_MS);
    return () => clearTimeout(id);
  }, [avatarReaction]);

  const hintDisabled = !realtime.isConnected || !realtime.partnerOnline;
  const hintReason = !realtime.isConnected ? 'Belum terhubung ke server' : 'Teknisi belum online';
  const sendHint = (payload) => {
    const ok = realtime.sendHint({
      ...payload,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from: meName,
    });
    if (ok) playClick();
    return ok;
  };
  const hintProps = { disabled: hintDisabled, disabledReason: hintReason };
  const inputNames = mission.required_variables.inputs.map((v) => v.name);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <StoryPanel
          mission={mission}
          partnerActivity={realtime.partnerActivity}
          reaction={ratnaReaction}
          onDismissReaction={() => setRatnaReaction(null)}
        />

        {/* ---------- Meja Aturan Usaha ---------- */}
        <section>
          <WoodSign sub="Jelaskan dengan kata-katamu sendiri, atau sorot satu nota ke layar Teknisi.">Meja Aturan Usaha</WoodSign>
          <div className="grid gap-5 sm:grid-cols-2">
            {mission.rules.map((rule, i) => {
              const Icon = iconForRule(rule);
              const [sticker, stickerTone] = RULE_STICKER.get(Icon);
              return (
                <article
                  key={rule}
                  className="relative flex flex-col rounded-xl border-2 border-slate-800 bg-[#fffdf5] p-4 pt-5 shadow-[4px_4px_0px_#1e293b]"
                  style={{ transform: `rotate(${i % 2 ? 0.7 : -0.7}deg)` }}
                >
                  <div className="absolute -top-2 left-0 right-0 flex justify-center gap-6" aria-hidden>
                    {[0, 1, 2].map((h) => <span key={h} className="h-3.5 w-3.5 rounded-full border-2 border-slate-800 bg-[#e9dcc0]" />)}
                  </div>
                  <header className="mb-3 flex items-center gap-3 border-b-2 border-dashed border-slate-300 pb-2">
                    <Icon />
                    <div className="flex-1">
                      <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-slate-500">NOTA ATURAN</p>
                      <p className="text-lg font-black leading-none text-slate-900">#{i + 1}</p>
                    </div>
                    <span className={`rotate-6 rounded-md border-2 border-slate-800 px-2 py-0.5 font-mono text-[10px] font-black ${stickerTone}`}>
                      {sticker}
                    </span>
                  </header>
                  <p className="flex-1 leading-relaxed text-slate-800">{rule}</p>
                  <div className="mt-3 border-t-2 border-dashed border-slate-300 pt-3">
                    <SendHintButton
                      {...hintProps}
                      className="w-full"
                      onSend={() => sendHint({ kind: 'rule', title: `Nota aturan #${i + 1}`, content: rule })}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- Kalkulator Hitungan ---------- */}
        <section>
          <WoodSign sub="Nilai di kiri dihitung, hasilnya disimpan di kotak kuning.">Kalkulator Hitungan</WoodSign>
          <div className="space-y-4">
            {mission.formula_steps.map((step, i) => (
              <CalculatorCard
                key={step}
                step={step}
                index={i}
                action={
                  <SendHintButton
                    {...hintProps}
                    onSend={() => sendHint({ kind: 'formula', title: `Rumus langkah ${i + 1}`, content: step })}
                  />
                }
              />
            ))}
          </div>
          <div className={`${CARD} mt-4 flex flex-wrap items-center gap-2 px-4 py-3 text-sm`}>
            <span className="font-bold text-slate-700">Urutan yang ditampilkan program:</span>
            {mission.output_order.map((o, i) => (
              <span key={o} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="h-4 w-4 text-slate-500" aria-hidden />}
                <code className="rounded-md border-2 border-slate-800 bg-white px-2 py-0.5 font-mono font-bold">{o}</code>
              </span>
            ))}
          </div>
        </section>

        {mission.decision_table && (
          <section>
            <WoodSign sub="Hanya kamu yang tahu batas angka dan teks keputusannya.">Matriks Keputusan Usaha</WoodSign>
            <div className={`${CARD} p-5`}>
              <DecisionMatrix
                table={mission.decision_table}
                renderAction={(row) => (
                  <SendHintButton
                    {...hintProps}
                    className="w-full"
                    label="Kirim Petunjuk Ini"
                    onSend={() => sendHint({ kind: 'decision', title: 'Keputusan usaha', content: `${row.condition} â†’ "${row.output}"`, detail: row.meaning })}
                  />
                )}
              />
            </div>
          </section>
        )}

        {/* ---------- Label Harga Variabel ---------- */}
        <section>
          <WoodSign sub="Ejaan nama harus sama persis di program Teknisi.">Label Variabel Wajib</WoodSign>
          <ul className="grid gap-4 md:grid-cols-2">
            {mission.required_variables.inputs.map((v) => (
              <PriceTag
                key={v.name}
                label={`Masukan ke-${v.order}`}
                name={v.name}
                description={v.description}
                tone="bg-[#ffe8a3]"
                action={
                  <SendHintButton
                    {...hintProps}
                    className="w-full"
                    onSend={() => sendHint({ kind: 'variable', title: `Masukan ke-${v.order}`, content: v.name, detail: v.description })}
                  />
                }
              />
            ))}
            {mission.required_variables.computed.map((v) => (
              <PriceTag
                key={v.name}
                label="Hasil hitungan"
                name={v.name}
                description={v.description}
                tone="bg-[#c7f0d8]"
                action={
                  <SendHintButton
                    {...hintProps}
                    className="w-full"
                    onSend={() => sendHint({ kind: 'variable', title: 'Hasil hitungan', content: v.name, detail: v.description })}
                  />
                }
              />
            ))}
          </ul>
        </section>

        {/* ---------- Contoh Pesanan Uji ---------- */}
        <section>
          <WoodSign sub="Hasil benar hanya terlihat olehmu. Yang dikirim ke Teknisi hanya data masukannya.">Contoh Pesanan Uji</WoodSign>
          <div className="grid gap-4 md:grid-cols-3">
            {mission.sample_cases.map((c, i) => (
              <article key={i} className="flex flex-col rounded-xl border-2 border-dashed border-slate-800 bg-white p-4 shadow-[3px_3px_0px_#1e293b]">
                <header className="mb-2 flex items-center gap-2">
                  <BananaChipIcon className="h-8 w-8" />
                  <p className="font-mono text-xs font-black tracking-widest text-slate-600">PESANAN #{i + 1}</p>
                </header>
                <dl className="flex-1 space-y-0.5 font-mono text-xs">
                  {c.inputs.map((value, k) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="truncate text-slate-500">{inputNames[k]}</dt>
                      <dd className="font-bold text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
                  Hasil benar: <span className="font-mono font-bold">{c.expected.join(' lalu ')}</span>
                </p>
                <SendHintButton
                  {...hintProps}
                  className="mt-3 w-full"
                  label="Kirim Data Ini ke Teknisi"
                  onSend={() => sendHint({ kind: 'sample', title: `Pesanan uji #${i + 1}`, content: c.inputs.join(', '), detail: 'Masukkan berurutan ke kolom Data Uji.' })}
                />
              </article>
            ))}
          </div>
          {mission.must_test_all_decisions && (
            <p className="mt-3 w-fit rounded-lg border-2 border-slate-800 bg-[#fff6c7] px-3 py-1.5 text-sm font-semibold text-amber-900">
              Misi ini baru selesai jika ketiga keputusan sudah pernah diuji.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <TechnicianStatusPanel partner={partner} realtime={realtime} roomStatus={roomStatus} reaction={avatarReaction?.mood} lastEvaluation={lastEvaluation} />
        {lastEvaluation && <EvaluationReport evaluation={lastEvaluation} />}
        {history.length > 0 && <AttemptHistory history={history} />}
      </aside>
    </div>
  );
}

// ----------------------------------------------------------------------

function WoodSign({ children, sub }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <h2
        style={WOOD_BG}
        className="relative rounded-lg border-2 border-slate-800 px-4 py-1.5 text-base font-black tracking-wide text-[#fff3d6] shadow-[3px_3px_0px_#1e293b] [text-shadow:1px_1px_0_#3e2210]"
      >
        <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-slate-800/70" aria-hidden />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-slate-800/70" aria-hidden />
        {children}
      </h2>
      {sub && <p className="rounded-md bg-[#fffaf0]/90 px-2 py-0.5 text-sm font-medium text-slate-700">{sub}</p>}
    </div>
  );
}

function SmallButton({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40 ${TACTILE}`}
    >
      {children}
    </button>
  );
}

/** Bu Ratna menceritakan masalah produksi kalimat demi kalimat, lalu bereaksi pada hasil uji. */
function StoryPanel({ mission, partnerActivity, reaction, onDismissReaction }) {
  const { playClick } = useGameAudio();
  const lines = useMemo(() => splitSentences(mission.narrative), [mission.narrative]);
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [mission.number]);

  const go = (delta) => {
    playClick();
    setPage((p) => Math.min(lines.length - 1, Math.max(0, p + delta)));
  };

  let mood;
  let dialogue;
  let actions;
  if (reaction) {
    mood = reaction.is_passed ? 'happy' : 'shocked';
    dialogue = reaction.is_passed
      ? `Hore! Hitungan Misi ${reaction.mission_number} sudah cocok dengan catatan saya. Terima kasih, ayo lanjut ke tantangan berikutnya!`
      : `Waduh! ${reaction.title}. ${reaction.diagnosis}`;
    actions = (
      <SmallButton onClick={() => { playClick(); onDismissReaction(); }}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {reaction.is_passed ? 'Dengar cerita berikutnya' : 'Kembali ke cerita'}
      </SmallButton>
    );
  } else {
    mood = partnerActivity === 'running' ? 'thinking' : 'idle';
    dialogue = lines[page];
    actions = (
      <>
        <SmallButton onClick={() => go(-1)} disabled={page === 0}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Sebelumnya
        </SmallButton>
        <span className="font-mono text-xs font-bold text-slate-500">{page + 1}/{lines.length}</span>
        <SmallButton onClick={() => go(1)} disabled={page >= lines.length - 1}>
          Lanjut <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </SmallButton>
      </>
    );
  }

  return (
    <section className={`${CARD} relative overflow-hidden bg-gradient-to-br from-[#fffaf0] to-[#fdf0d0] p-5`}>
      <span className="absolute right-4 top-4 rounded-full border-2 border-slate-800 bg-emerald-500 px-3 py-1 text-xs font-black text-white shadow-[2px_2px_0px_#1e293b]">
        Pos {mission.number} Â· {mission.title}
      </span>
      <div className="pt-8 sm:pt-4">
        <BuRatnaCharacter mood={mood} dialogue={dialogue} size={170} replayKey={reaction?.log_id} actions={actions} />
      </div>
    </section>
  );
}

function CalculatorCard({ step, index, action }) {
  const [target, expr = ''] = step.split(' = ');
  return (
    <article className="rounded-2xl border-2 border-slate-800 bg-[#2a9d8f] p-3 shadow-[4px_4px_0px_#1e293b]">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-black text-white [text-shadow:1px_1px_0_#134e4a]">
          <CalculatorIcon className="h-7 w-7" /> Langkah {index + 1}
        </span>
        <span className="h-3 w-14 rounded border-2 border-slate-800 bg-[#1d6f66]" aria-hidden title="panel surya" />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-slate-800 bg-[#d9f99d] p-3 font-mono shadow-[inset_3px_3px_0_rgba(0,0,0,0.12)]">
        {expr.split(' ').map((t, i) =>
          /^[a-z_]+$/.test(t) ? (
            <code key={i} className="rounded-md border-2 border-slate-800 bg-white px-2 py-0.5 text-sm font-bold text-sky-800">{t}</code>
          ) : (
            <span key={i} className="text-xl font-black text-slate-800">{t}</span>
          ),
        )}
        <ArrowRight className="h-5 w-5 text-slate-800" aria-hidden />
        <code className="rounded-md border-2 border-slate-800 bg-[#ffd23f] px-2 py-0.5 text-sm font-black text-slate-900">{target}</code>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5" aria-hidden>
          {['Ã—', 'âˆ’', '='].map((k) => (
            <span key={k} className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-slate-800 bg-[#fffaf0] text-sm font-black shadow-[2px_2px_0px_#1e293b]">{k}</span>
          ))}
        </div>
        {action}
      </div>
    </article>
  );
}

function PriceTag({ label, name, description, tone, action }) {
  return (
    <li className={`flex flex-col gap-2 rounded-xl border-2 border-slate-800 p-3 shadow-[3px_3px_0px_#1e293b] ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-slate-800 bg-[#fffaf0]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</p>
          <code className="break-all font-mono text-base font-black text-slate-900">{name}</code>
          <p className="text-xs text-slate-700">{description}</p>
        </div>
        <PriceTagIcon className="h-8 w-8 shrink-0" />
      </div>
      {action}
    </li>
  );
}

function TechnicianStatusPanel({ partner, realtime, roomStatus, reaction, lastEvaluation }) {
  const name = partner?.name ?? 'Teknisi';
  let state;
  let text;

  if (!realtime.isConnected) {
    [state, text] = ['offline', 'Menghubungkan ke server waktu nyataâ€¦'];
  } else if (roomStatus === 'waiting' || !partner) {
    [state, text] = ['offline', 'Menunggu Teknisi bergabung ke ruanganâ€¦'];
  } else if (!realtime.partnerOnline) {
    [state, text] = ['offline', `${name} sedang tidak terhubung.`];
  } else if (reaction === 'happy') {
    [state, text] = ['happy', `${name} berhasil! Programnya lolos uji.`];
  } else if (reaction === 'shocked') {
    [state, text] = ['shocked', `Ups! Program ${name} belum lolos: ${lastEvaluation?.title ?? 'ada yang perlu diperbaiki'}.`];
  } else if (realtime.partnerActivity === 'running') {
    [state, text] = ['thinking', `${name} sedang menjalankan uji sistemâ€¦`];
  } else if (realtime.partnerActivity === 'typing') {
    [state, text] = ['typing', `${name} sedang mengetik kodeâ€¦`];
  } else {
    [state, text] = ['idle', `${name} siap mendengar penjelasanmu.`];
  }

  return (
    <section className={`${CARD} overflow-hidden`} aria-live="polite">
      <h2 className="flex items-center gap-2 border-b-2 border-slate-800 bg-sky-100 px-4 py-2 text-sm font-black uppercase tracking-wide text-slate-800">
        <Radio className={`h-4 w-4 ${realtime.isConnected ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden />
        Status Teknisi
        <span className={`ml-auto h-2.5 w-2.5 rounded-full border-2 border-slate-800 ${state === 'offline' ? 'bg-slate-300' : 'bg-emerald-400'}`} aria-hidden />
      </h2>
      <div className="flex justify-center bg-gradient-to-b from-sky-50 to-[#fffaf0] px-4 pt-4">
        <TechnicianAvatar state={state} size={190} />
      </div>
      <p className="mx-4 mb-4 mt-2 rounded-xl border-2 border-slate-800 bg-white px-3 py-2 text-center text-sm font-bold text-slate-800">{text}</p>
    </section>
  );
}

function EvaluationReport({ evaluation: raw }) {
  // Item riwayat dari GET /state tidak memuat tabel uji; beri nilai bawaan.
  const evaluation = { missing_variables: [], missing_branches: [], cases: [], ...raw };
  const passed = evaluation.is_passed;
  return (
    <section
      className={`rounded-2xl border-2 border-slate-800 p-5 shadow-[4px_4px_0px_#1e293b] ${passed ? 'bg-emerald-50' : 'bg-rose-50'}`}
      aria-live="polite"
    >
      <div className="mb-1 flex items-center gap-2">
        {passed ? <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden /> : <AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden />}
        <h2 className={`font-black ${passed ? 'text-emerald-900' : 'text-rose-900'}`}>{evaluation.title}</h2>
      </div>
      <p className="text-xs font-semibold text-slate-500">
        Misi {evaluation.mission_number}
        {evaluation.attempt_number ? ` Â· percobaan ke-${evaluation.attempt_number}` : ''} Â· {formatDuration(evaluation.duration_seconds)}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-800">{evaluation.diagnosis}</p>

      {(evaluation.missing_variables.length > 0 || evaluation.missing_branches.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[...evaluation.missing_variables, ...evaluation.missing_branches].map((m) => (
            <span key={m} className="rounded-md border-2 border-rose-700 bg-white px-2 py-0.5 font-mono text-xs font-bold text-rose-700">{m}</span>
          ))}
        </div>
      )}

      {evaluation.cases.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border-2 border-slate-800 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-1.5">Uji</th>
                <th className="px-2 py-1.5">Diharapkan</th>
                <th className="px-2 py-1.5">Hasil program</th>
                <th className="px-2 py-1.5" aria-label="Status" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {evaluation.cases.map((c) => (
                <tr key={c.index} className="align-top">
                  <td className="px-2 py-2">
                    <span className="font-bold">#{c.index}</span>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {c.inputs.map((x) => (x.name ? `${x.name}=${x.value}` : x.value)).join(', ')}
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-emerald-800">{c.expected ? c.expected.join(' / ') : 'â€”'}</td>
                  <td className="px-2 py-2 font-mono text-slate-800">
                    {c.crashed ? <span className="text-rose-700">program berhenti</span> : c.actual.join(' / ') || 'â€”'}
                  </td>
                  <td className="px-2 py-2">
                    {c.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Benar" /> : <XCircle className="h-4 w-4 text-rose-600" aria-label="Salah" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AttemptHistory({ history }) {
  return (
    <section className={`${CARD} p-5`}>
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-600">Riwayat Percobaan</h2>
      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {[...history].reverse().map((h) => (
          <li key={h.log_id} className="flex items-start gap-2 text-sm">
            {h.is_passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />}
            <div>
              <p className="font-semibold text-slate-800">Misi {h.mission_number}: {h.title}</p>
              <p className="text-xs text-slate-500">{formatDuration(h.duration_seconds)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
