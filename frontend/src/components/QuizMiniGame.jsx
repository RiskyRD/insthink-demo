import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Lightbulb, RotateCcw, Star, Timer, Users, X } from 'lucide-react';
import VillageBackdrop from './game/VillageBackdrop';
import BuRatnaCharacter from './game/BuRatnaCharacter';
import SoundToggle from './game/SoundToggle';
import { useGameAudio } from './game/useGameAudio';
import { CARD, TACTILE } from './game/theme';

/**
 * Data soal Quiz. Setiap soal:
 * - `code`      : baris kode Python yang ditampilkan (boleh kosong). `___` = slot kosong.
 * - `target`    : keluaran yang diinginkan (opsional, untuk soal tanpa kode).
 * - `options`   : pilihan jawaban. `kind: 'code'` tampil sebagai blok kode, `'output'` sebagai layar keluaran.
 * - `eliminate` : urutan id pilihan salah yang dicoret oleh hint 1 dan hint 2.
 * - `keywords`  : potongan kode yang disorot saat hint dibuka.
 * - `hints`     : 3 tingkat hint (arah → langkah → contoh), disampaikan Bu Ratna.
 */
const QUESTIONS = [
  {
    id: 'print',
    topic: 'print()',
    story: 'Kedai baru buka! Ibu ingin layar kasir menyapa pembeli dengan tulisan di bawah ini. Blok mana yang tepat?',
    target: 'Selamat datang di Kedai Bu Ratna!',
    kind: 'code',
    options: [
      { id: 'a', text: 'Print("Selamat datang di Kedai Bu Ratna!")', why: 'Hampir! Python membedakan huruf besar dan kecil, jadi `Print` tidak dikenal. Coba lagi, ya.' },
      { id: 'b', text: 'print("Selamat datang di Kedai Bu Ratna!")', correct: true },
      { id: 'c', text: 'print(Selamat datang di Kedai Bu Ratna!)', why: 'Teksnya belum diapit tanda kutip, jadi Python mengira itu nama variabel. Coba pilihan lain!' },
      { id: 'd', text: 'input("Selamat datang di Kedai Bu Ratna!")', why: '`input()` dipakai untuk bertanya dan menunggu ketikan, bukan sekadar menampilkan. Ayo coba lagi!' },
    ],
    eliminate: ['d', 'a'],
    keywords: ['print'],
    hints: [
      'Perintah untuk menampilkan tulisan ke layar ditulis dengan huruf kecil semua.',
      'Tulisan (teks) di dalam kurung wajib diapit tanda kutip `"..."`.',
      'Bentuknya: `print("teks yang ingin ditampilkan")`.',
    ],
    explain: '`print()` menampilkan teks ke layar, dan teksnya harus diapit tanda kutip.',
  },
  {
    id: 'input',
    topic: 'int(input())',
    story: 'Pembeli mengetik jumlah gelas kopi, lalu kasir mengalikannya dengan harga Rp5000. Blok apa yang mengisi kotak kosong agar perkaliannya benar?',
    code: ['jumlah = ___', 'total = jumlah * 5000', 'print(total)'],
    kind: 'code',
    options: [
      { id: 'a', text: 'input("Berapa gelas? ")', why: 'Hasil `input()` masih berupa teks. Kalau teks "3" dikali 5000, hasilnya malah "3" diulang 5000 kali, bukan 15000!' },
      { id: 'b', text: 'int("Berapa gelas? ")', why: '`int()` hanya bisa mengubah angka. Kalimat "Berapa gelas?" bukan angka, jadi Python akan bingung (ValueError).' },
      { id: 'c', text: 'int(input("Berapa gelas? "))', correct: true },
      { id: 'd', text: 'input(int("Berapa gelas? "))', why: 'Urutannya terbalik. Pembeli harus ditanya dulu dengan `input()`, baru jawabannya diubah dengan `int()`.' },
    ],
    eliminate: ['d', 'b'],
    keywords: ['*', 'int'],
    hints: [
      'Ingat, `input()` selalu menghasilkan teks, padahal di baris 2 jumlahnya akan dikali.',
      'Bungkus `input(...)` dengan `int(...)` agar teksnya berubah menjadi bilangan bulat.',
      'Polanya: `int(input("pertanyaan"))`, yaitu `input` di dalam, `int` di luar.',
    ],
    explain: '`input()` menghasilkan teks, lalu `int()` mengubahnya menjadi angka sehingga bisa dikali.',
  },
  {
    id: 'if',
    topic: 'if-else & %',
    story: 'Pelanggan bernomor antrean genap dapat bonus kerupuk. Nomor antrean Bli Komang adalah 7. Apa yang tampil di layar?',
    code: ['antrean = 7', 'if antrean % 2 == 0:', '    print("Dapat bonus kerupuk!")', 'else:', '    print("Terima kasih, Bli!")'],
    kind: 'output',
    options: [
      { id: 'a', text: 'Dapat bonus kerupuk!', why: '7 dibagi 2 masih bersisa 1, jadi syarat `== 0` tidak terpenuhi. Coba hitung lagi sisanya!' },
      { id: 'b', text: 'Terima kasih, Bli!', correct: true },
      { id: 'c', text: 'Dapat bonus kerupuk!\nTerima kasih, Bli!', why: 'Dalam `if-else`, hanya satu cabang yang dijalankan, tidak pernah keduanya sekaligus.' },
      { id: 'd', text: '1', why: 'Angka 1 memang hasil `7 % 2`, tetapi angka itu hanya dipakai untuk mengecek syarat, tidak dicetak.' },
    ],
    eliminate: ['c', 'd'],
    keywords: ['%', '=='],
    hints: [
      'Operator `%` menghasilkan sisa bagi. Bilangan genap selalu bersisa 0 jika dibagi 2.',
      'Hitung `7 % 2`. Apakah hasilnya sama dengan 0? Jika tidak, cabang `else` yang jalan.',
      '`7 % 2` hasilnya `1`, jadi syarat `1 == 0` salah dan program masuk ke `else:`.',
    ],
    explain: '`7 % 2` bersisa 1 (bukan 0), jadi syaratnya salah dan blok `else` yang dijalankan.',
  },
  {
    id: 'for',
    topic: 'for range()',
    story: 'Ada pesanan kopi untuk satu rombongan. Berapa kali tulisan "Kopi siap!" muncul di layar?',
    code: ['for i in range(3):', '    print("Kopi siap!")'],
    kind: 'output',
    options: [
      { id: 'a', text: '1 kali', why: 'Blok di dalam `for` diulang, bukan cuma sekali. Lihat angka di dalam `range()`!' },
      { id: 'b', text: '2 kali', why: '`range(3)` memang berhenti sebelum 3, tetapi dimulai dari 0. Coba hitung 0, 1, 2.' },
      { id: 'c', text: '3 kali', correct: true },
      { id: 'd', text: '4 kali', why: '`range(3)` tidak menyertakan angka 3 itu sendiri. Hitung lagi putarannya, ya!' },
    ],
    eliminate: ['a', 'd'],
    keywords: ['range', '3'],
    hints: [
      'Angka di dalam `range()` menentukan berapa kali blok di dalamnya diulang.',
      '`range(3)` menghasilkan nilai `i` = 0, 1, 2. Hitung ada berapa nilai.',
      'Putaran: i = 0 → cetak, i = 1 → cetak, i = 2 → cetak. Jadi totalnya…',
    ],
    explain: '`range(3)` memberi tiga putaran (i = 0, 1, 2), jadi "Kopi siap!" tercetak 3 kali.',
  },
];

const INTRO_DIALOGUE = 'Sebelum kedai dibuka, kita Quiz dulu! Ada 4 tantangan kilat. Salah tidak apa-apa, coba terus sampai benar.';
const WRONG_OPENERS = ['Belum tepat, tidak apa-apa!', 'Ups, hampir!', 'Sedikit lagi!', 'Coba lagi, kamu pasti bisa!'];

/** Bintang per soal: 3 jika langsung benar tanpa hint, berkurang 1 untuk tiap hint/percobaan salah (minimal 1). */
function starsFor({ wrong, hints }) {
  return Math.max(1, 3 - wrong - hints);
}

function formatTime(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/**
 * Quiz "Tebak & Rakit Cepat Kedai Bali": 4 soal pilihan blok
 * (print, int(input()), if-else %, for range) sebelum siswa masuk ke ruangan co-op.
 * Murni sisi klien: tidak memanggil API maupun Pyodide.
 */
export default function QuizMiniGame({ onBack, onNext, onStartGame }) {
  const { playClick, playSuccess, playError } = useGameAudio();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]); // { wrong, hints } per soal yang sudah selesai
  const [picked, setPicked] = useState([]); // id pilihan salah yang sudah dicoba
  const [hintLevel, setHintLevel] = useState(0);
  const [solved, setSolved] = useState(false);
  const [mood, setMood] = useState('idle');
  const [dialogue, setDialogue] = useState(INTRO_DIALOGUE);
  const [replay, setReplay] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const moodTimer = useRef(null);

  const finished = index >= QUESTIONS.length;
  const q = QUESTIONS[index];

  useEffect(() => {
    if (finished) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [finished]);
  useEffect(() => () => clearTimeout(moodTimer.current), []);

  const eliminated = useMemo(() => (q ? q.eliminate.slice(0, Math.min(hintLevel, 2)) : []), [q, hintLevel]);

  const choose = (opt) => {
    if (solved || picked.includes(opt.id) || eliminated.includes(opt.id)) return;
    clearTimeout(moodTimer.current);
    if (opt.correct) {
      playSuccess();
      setSolved(true);
      setMood('happy');
      setDialogue(`Tepat sekali! ${q.explain.replace(/`/g, '')}`);
      return;
    }
    playError();
    const nextPicked = [...picked, opt.id];
    setPicked(nextPicked);
    setReplay((r) => r + 1);
    setMood('shocked');
    setDialogue(`${WRONG_OPENERS[(nextPicked.length - 1) % WRONG_OPENERS.length]} ${opt.why.replace(/`/g, '')}`);
    moodTimer.current = setTimeout(() => setMood('thinking'), 1200);
  };

  const openHint = () => {
    if (hintLevel >= 3 || solved) return;
    playClick();
    clearTimeout(moodTimer.current);
    const level = hintLevel + 1;
    setHintLevel(level);
    setMood('thinking');
    setDialogue(`Petunjuk ${level}: ${q.hints[level - 1].replace(/`/g, '')}`);
  };

  const goNext = () => {
    playClick();
    clearTimeout(moodTimer.current);
    setResults((r) => [...r, { wrong: picked.length, hints: hintLevel }]);
    setIndex((i) => i + 1);
    setPicked([]);
    setHintLevel(0);
    setSolved(false);
    setMood(index + 1 >= QUESTIONS.length ? 'happy' : 'idle');
    const upcoming = QUESTIONS[index + 1];
    setDialogue(upcoming ? `Soal ${index + 2}: ${upcoming.topic}. Baca ceritanya, lalu pilih jawabanmu!` : "");
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const restart = () => {
    playClick();
    setIndex(0);
    setResults([]);
    setPicked([]);
    setHintLevel(0);
    setSolved(false);
    setMood('idle');
    setDialogue(INTRO_DIALOGUE);
    setSeconds(0);
  };

  const press = (fn) => () => {
    playClick();
    fn();
  };

  return (
    <VillageBackdrop>
      <header className="sticky top-0 z-30 border-b-2 border-slate-800 bg-[#fffaf0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={press(onBack)}
            className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-slate-900`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Menu Utama</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#c4562f]">Langkah 2</p>
            <h1 className="truncate text-lg font-black text-slate-900">Quiz Pemanasan Python</h1>
          </div>
          <span className="flex items-center gap-1 rounded-full border-2 border-slate-800 bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-800" aria-label={`Waktu ${formatTime(seconds)}`}>
            <Timer className="h-3.5 w-3.5" aria-hidden /> {formatTime(seconds)}
          </span>
          <SoundToggle />
        </div>
        <ProgressDots index={index} results={results} solved={solved} />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {finished ? (
          <FinishScreen results={results} seconds={seconds} onNext={press(onNext)} onStartGame={press(onStartGame)} onRestart={restart} onBack={press(onBack)} />
        ) : (
          <article key={q.id} className={`${CARD} prolog-slide-in grid gap-6 p-4 sm:p-6 md:grid-cols-[260px_1fr]`}>
            <div className="flex flex-col items-center md:items-start">
              <BuRatnaCharacter
                mood={mood}
                size={140}
                bubblePosition="top"
                replayKey={replay}
                title={hintLevel ? `Petunjuk ${hintLevel}/3` : 'Bu Ratna'}
                dialogue={dialogue}
              />
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-slate-800 bg-[#c4562f] px-3 py-0.5 text-xs font-black text-white shadow-[2px_2px_0px_#1e293b]">
                  Soal {index + 1}/{QUESTIONS.length}
                </span>
                <span className="rounded-full border-2 border-slate-800 bg-[#a5d68f] px-2.5 py-0.5 font-mono text-xs font-bold text-slate-900">{q.topic}</span>
              </div>
              <p className="mb-4 text-base font-semibold leading-relaxed text-slate-800">{q.story}</p>

              {q.target && <TargetScreen text={q.target} />}
              {q.code && <CodePanel lines={q.code} keywords={hintLevel ? q.keywords : []} fill={solved ? q.options.find((o) => o.correct).text : null} />}

              <p className="mb-2 mt-5 text-xs font-black uppercase tracking-wider text-slate-500">
                {q.kind === 'code' ? 'Pilih blok yang tepat' : 'Pilih keluaran yang tepat'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {q.options.map((opt) => (
                  <OptionButton
                    key={opt.id}
                    opt={opt}
                    kind={q.kind}
                    keywords={hintLevel ? q.keywords : []}
                    state={
                      solved && opt.correct ? 'correct'
                        : picked.includes(opt.id) ? 'wrong'
                          : eliminated.includes(opt.id) ? 'eliminated'
                            : solved ? 'idle-done' : 'idle'
                    }
                    onClick={() => choose(opt)}
                  />
                ))}
              </div>

              {solved ? (
                <div className="hint-in mt-5 rounded-xl border-2 border-slate-800 bg-[#e3f4d7] p-4 shadow-[3px_3px_0px_#1e293b]" role="status">
                  <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-slate-800">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6b2a]" strokeWidth={3} aria-hidden />
                    <span><RichText text={q.explain} /></span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <StarRow count={starsFor({ wrong: picked.length, hints: hintLevel })} size="h-6 w-6" />
                    <button
                      type="button"
                      onClick={goNext}
                      className={`${TACTILE} prolog-cta-pulse flex items-center gap-1 rounded-xl bg-[#ffd23f] px-4 py-2.5 font-black text-slate-900`}
                    >
                      {index + 1 < QUESTIONS.length ? `Lanjut ke Soal ${index + 2}` : 'Lihat Hasil'} <ChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={openHint}
                    disabled={hintLevel >= 3}
                    className={`${TACTILE} flex items-center gap-2 rounded-xl bg-[#fff1c1] px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Lightbulb className={`h-4 w-4 ${hintLevel === 0 ? 'hint-bell' : ''}`} aria-hidden />
                    {hintLevel === 0 ? 'Hint (Petunjuk)' : hintLevel < 3 ? `Hint berikutnya (${hintLevel + 1}/3)` : 'Semua hint terbuka'}
                  </button>
                  <span className="text-xs text-slate-600">
                    {hintLevel === 0 ? 'Hint menyoroti kata kunci dan mencoret 1 pilihan yang salah.' : 'Kata kunci penting disorot kuning.'}
                  </span>
                </div>
              )}
            </div>
          </article>
        )}
      </main>
    </VillageBackdrop>
  );
}

function ProgressDots({ index, results, solved }) {
  return (
    <ol aria-label="Kemajuan soal" className="mx-auto flex max-w-5xl items-center gap-2 px-4 pb-3">
      {QUESTIONS.map((q, i) => {
        const done = i < results.length || (i === index && solved);
        const current = i === index;
        return (
          <li key={q.id} className="flex flex-1 items-center gap-2">
            <span
              aria-current={current ? 'step' : undefined}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-slate-800 text-xs font-black transition-colors ${
                done ? 'bg-[#a5d68f]' : current ? 'bg-[#ffd23f]' : 'bg-white'
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={`hidden truncate font-mono text-xs font-bold sm:inline ${current ? 'text-slate-900' : 'text-slate-500'}`}>{q.topic}</span>
            {i < QUESTIONS.length - 1 && <span className={`h-1 flex-1 rounded-full ${i < results.length ? 'bg-[#4f8f3a]' : 'bg-slate-300'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Tampilan kode ---------- */

const TOKEN_RE = /("[^"]*"|___|%|==|\*|\b\d+\b|\b(?:if|else|for|in|range|print|input|int)\b)/;
const CONTROL = new Set(['if', 'else', 'for', 'in']);
const MARK = 'rounded bg-[#ffd23f] px-0.5 font-bold text-slate-900 ring-2 ring-[#c4562f] hint-glow';

function highlight(line, keywords, dark = true) {
  return line.split(TOKEN_RE).map((part, i) => {
    if (!part) return null;
    if (i % 2 === 0) return <span key={i}>{part}</span>;
    if (keywords.includes(part)) return <mark key={i} className={MARK}>{part}</mark>;
    let cls = dark ? 'text-sky-300' : 'text-sky-700';
    if (part.startsWith('"')) cls = dark ? 'text-[#a5d68f]' : 'text-[#2f6b2a]';
    else if (/^\d/.test(part)) cls = dark ? 'text-[#f4b942]' : 'text-[#b45309]';
    else if (CONTROL.has(part)) cls = dark ? 'font-bold text-pink-400' : 'font-bold text-pink-700';
    else if (['%', '==', '*'].includes(part)) cls = dark ? 'text-slate-100' : 'text-slate-800';
    return <span key={i} className={cls}>{part}</span>;
  });
}

function CodePanel({ lines, keywords, fill }) {
  return (
    <section className="overflow-hidden rounded-xl border-2 border-slate-800 bg-[#0f172a] shadow-[3px_3px_0px_#1e293b]">
      <div className="flex items-center gap-1.5 border-b-2 border-slate-700 bg-[#1e293b] px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 font-mono text-xs font-bold text-slate-400">kedai.py</span>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-7 sm:text-sm">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex px-1">
              <span className="mr-3 w-4 shrink-0 select-none text-right text-slate-500">{i + 1}</span>
              <span className="whitespace-pre text-slate-100">
                {line.includes('___') ? <SlotLine line={line} keywords={keywords} fill={fill} /> : highlight(line, keywords)}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </section>
  );
}

function SlotLine({ line, keywords, fill }) {
  const [before, after] = line.split('___');
  return (
    <>
      {highlight(before, keywords)}
      {fill ? (
        <span className="stamp-in inline-block rounded-md border-2 border-[#a5d68f] bg-emerald-500/20 px-1">{highlight(fill, [])}</span>
      ) : (
        <span className="inline-block min-w-[9rem] animate-pulse rounded-md border-2 border-dashed border-[#ffd23f] px-2 text-center text-[#ffd23f]">?</span>
      )}
      {highlight(after, keywords)}
    </>
  );
}

function TargetScreen({ text }) {
  return (
    <section className="rounded-xl border-2 border-slate-800 bg-slate-900 p-3 font-mono shadow-[3px_3px_0px_#1e293b]">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Layar kasir yang diinginkan</p>
      <p className="text-sm text-emerald-300 sm:text-base">{text}</p>
    </section>
  );
}

function RichText({ text }) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith('`') ? (
      <code key={i} className="rounded border border-slate-300 bg-white px-1 font-mono text-[0.92em] text-[#c4562f]">{part.slice(1, -1)}</code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/* ---------- Pilihan jawaban ---------- */

const OPTION_STYLE = {
  idle: 'bg-white hover:-translate-y-0.5 hover:bg-[#fff7e0] hover:shadow-[5px_5px_0px_#1e293b]',
  'idle-done': 'bg-white opacity-50',
  correct: 'stamp-in bg-[#c9ecb4] ring-4 ring-[#4f8f3a]',
  wrong: 'bg-rose-100 opacity-80',
  eliminated: 'bg-slate-100 opacity-40',
};

function OptionButton({ opt, kind, keywords, state, onClick }) {
  const disabled = state !== 'idle';
  const label = { correct: 'Benar', wrong: 'Belum tepat', eliminated: 'Dicoret hint' }[state];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${opt.text}${label ? ` (${label})` : ''}`}
      className={`${TACTILE} relative flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-3 text-left disabled:cursor-default ${OPTION_STYLE[state]}`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-slate-800 font-black uppercase ${
          state === 'correct' ? 'bg-[#4f8f3a] text-white' : state === 'wrong' ? 'bg-[#c4562f] text-white' : 'bg-[#ffd23f] text-slate-900'
        }`}
        aria-hidden
      >
        {state === 'correct' ? <Check className="h-4 w-4" strokeWidth={3} /> : state === 'wrong' || state === 'eliminated' ? <X className="h-4 w-4" strokeWidth={3} /> : opt.id}
      </span>

      {kind === 'code' ? (
        <span className={`min-w-0 flex-1 break-words rounded-lg border-2 border-slate-800 bg-[#4c97ff]/15 px-2 py-1.5 font-mono text-[13px] leading-snug text-slate-800 ${state === 'eliminated' ? 'line-through' : ''}`}>
          {highlight(opt.text, keywords, false)}
        </span>
      ) : (
        <span className={`min-w-0 flex-1 whitespace-pre-line rounded-lg border-2 border-slate-800 bg-slate-900 px-2 py-1.5 font-mono text-[13px] leading-snug text-emerald-300 ${state === 'eliminated' ? 'line-through' : ''}`}>
          {opt.text}
        </span>
      )}

      {state === 'wrong' && (
        <span className="absolute -right-2 -top-2.5 rounded-full border-2 border-slate-800 bg-white px-2 text-[10px] font-black text-[#c4562f]">Coba lagi</span>
      )}
    </button>
  );
}

/* ---------- Layar selesai ---------- */

function StarRow({ count, max = 3, size = 'h-8 w-8' }) {
  return (
    <span className="flex gap-1" aria-label={`${count} dari ${max} bintang`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${size} stamp-in ${i < count ? 'fill-[#ffd23f] text-slate-800' : 'fill-white text-slate-400'}`}
          strokeWidth={2.5}
          style={{ animationDelay: `${i * 0.15}s` }}
          aria-hidden
        />
      ))}
    </span>
  );
}

const CONFETTI_COLORS = ['#ffd23f', '#c4562f', '#4f8f3a', '#a5d68f', '#f4a582', '#e9b949'];

function FinishScreen({ results, seconds, onNext, onStartGame, onRestart, onBack }) {
  const total = results.reduce((sum, r) => sum + starsFor(r), 0);
  const max = QUESTIONS.length * 3;
  const rating = total >= max - 1 ? 3 : total >= max * 0.6 ? 2 : 1;
  const message = {
    3: 'Sempurna! Otakmu sudah panas dan siap meracik kode. Ayo buka kedai bersama partnermu!',
    2: 'Bagus sekali! Quiz beres. Sisanya kita latih langsung di kedai, ya!',
    1: 'Kerja bagus, kamu sudah mencoba sampai benar! Itulah semangat programmer. Ayo lanjut ke kedai!',
  }[rating];
  const confetti = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({
      left: (i * 37) % 100,
      size: 8 + (i % 4) * 3,
      delay: (i % 7) * 0.35,
      duration: 3 + (i % 5) * 0.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })),
    [],
  );

  return (
    <section className={`${CARD} celebration-pop relative overflow-hidden p-5 text-center sm:p-8`} aria-labelledby="ice-finish-title">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{ left: `${c.left}%`, width: c.size, height: c.size * 0.45, backgroundColor: c.color, borderRadius: 2, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
          />
        ))}
      </div>

      <p className="text-xs font-black uppercase tracking-wider text-[#c4562f]">Quiz selesai</p>
      <h2 id="ice-finish-title" className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Kedai Siap Dibuka!</h2>

      <div className="relative mt-4 flex justify-center">
        <StarRow count={rating} size="h-14 w-14 sm:h-16 sm:w-16" />
      </div>
      <p className="mt-2 font-bold text-slate-700">
        {total} / {max} bintang · waktu {formatTime(seconds)}
      </p>

      <div className="relative mx-auto mt-4 flex max-w-md justify-center">
        <BuRatnaCharacter mood="happy" size={130} bubblePosition="top" title="Bu Ratna" dialogue={message} />
      </div>

      <ul className="relative mx-auto mt-5 grid max-w-xl gap-2 text-left sm:grid-cols-2">
        {QUESTIONS.map((q, i) => (
          <li key={q.id} className="flex items-center justify-between gap-2 rounded-xl border-2 border-slate-800 bg-white px-3 py-2">
            <span className="text-sm font-bold text-slate-800">
              {i + 1}. <span className="font-mono">{q.topic}</span>
            </span>
            {results[i] && <StarRow count={starsFor(results[i])} size="h-4 w-4" />}
          </li>
        ))}
      </ul>

      <div className="relative mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onNext}
          className={`${TACTILE} prolog-cta-pulse flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-[#ffd23f] px-5 py-3.5 text-base font-black text-slate-900 sm:text-lg`}
        >
          <ChevronRight className="h-6 w-6 shrink-0" aria-hidden /> Lanjut ke Langkah 3: Praktik Money Tracker
        </button>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onStartGame} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-[#7c5cc4] px-4 py-2 text-sm font-bold text-white`}>
            <Users className="h-4 w-4" aria-hidden /> Bonus: Buka Kedai Bersama Partner (Co-op)
          </button>
          <button type="button" onClick={onRestart} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900`}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Ulangi Quiz
          </button>
          <button type="button" onClick={onBack} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-[#fff7e0] px-4 py-2 text-sm font-bold text-slate-900`}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Menu Utama
          </button>
        </div>
      </div>
    </section>
  );
}
