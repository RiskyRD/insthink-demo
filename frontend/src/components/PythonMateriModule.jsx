import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Home, Lightbulb, Play, Printer, RefreshCw, RotateCcw, X, Zap,
} from 'lucide-react';
import VillageBackdrop from './game/VillageBackdrop';
import BuRatnaCharacter from './game/BuRatnaCharacter';
import { CashierCharacter, WarehouseCharacter } from './game/ShopCharacters';
import SoundToggle from './game/SoundToggle';
import { useGameAudio } from './game/useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './game/theme';

/**
 * Modul "Kenalan Blok Python": 6 kartu materi interaktif (variabel, input/int, print,
 * operator, if-else, for). Semua simulasi dihitung di klien tanpa server.
 *
 * @param {() => void} onBack  kembali ke Main Menu
 * @param {() => void} onNext  lanjut ke Quiz
 * @param {number} initialStep  kartu yang dibuka pertama (0–5)
 */
export default function PythonMateriModule({ onBack, onNext, initialStep = 0 }) {
  const audio = useGameAudio();
  const [step, setStep] = useState(initialStep);
  const [visited, setVisited] = useState(() => new Set([initialStep]));
  const [hintLevel, setHintLevel] = useState(0);
  const [mood, setMood] = useState('idle');
  const moodTimer = useRef(null);

  const react = useCallback((next, ms = 1800) => {
    clearTimeout(moodTimer.current);
    setMood(next);
    moodTimer.current = setTimeout(() => setMood('idle'), ms);
  }, []);
  useEffect(() => () => clearTimeout(moodTimer.current), []);

  const goTo = (index) => {
    audio.playClick();
    clearTimeout(moodTimer.current);
    setStep(index);
    setHintLevel(0);
    setMood('idle');
    setVisited((v) => new Set(v).add(index));
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const nextHint = () => {
    audio.playClick();
    setHintLevel((l) => Math.min(3, l + 1));
    react('thinking', 2500);
  };
  const closeHint = () => {
    audio.playClick();
    setHintLevel(0);
  };

  const card = CARDS[step];
  const Body = card.Body;
  const isLast = step === CARDS.length - 1;
  const fx = { ...audio, react };

  return (
    <VillageBackdrop>
      <header className="sticky top-0 z-30 border-b-2 border-slate-800 bg-[#fffaf0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => { audio.playClick(); onBack(); }}
            className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-slate-900`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Menu Utama</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#c4562f]">Langkah 1</p>
            <h1 className="truncate text-lg font-black text-slate-900">Kenalan Blok Python</h1>
          </div>
          <SoundToggle />
        </div>

        <nav aria-label="Kartu materi" className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {CARDS.map((c, i) => (
            <button
              key={c.short}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === step ? 'step' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 border-slate-800 px-3 py-1 text-xs font-bold shadow-[2px_2px_0px_#1e293b] transition-all active:translate-y-[1px] active:shadow-none ${
                i === step ? 'bg-[#ffd23f] text-slate-900' : 'bg-white text-slate-700 hover:bg-[#fff1c1]'
              }`}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full border-2 border-slate-800 text-[10px] ${visited.has(i) && i !== step ? 'bg-[#a5d68f]' : 'bg-white'}`}>
                {visited.has(i) && i !== step ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              {c.short}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <article key={step} className={`${CARD} prolog-slide-in p-4 sm:p-6`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border-2 border-slate-800 px-3 py-0.5 text-xs font-black shadow-[2px_2px_0px_#1e293b] ${card.badge}`}>
              Kartu {step + 1}/6
            </span>
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{card.title}</h2>
          </div>

          <Guide who={card.guide} mood={mood} title={hintLevel ? `Tips cepat ${hintLevel}/3` : card.guideTitle}>
            {hintLevel === 0 ? (
              <p>{card.intro}</p>
            ) : (
              <ol className="list-decimal space-y-1.5 pl-5">
                {card.hints.slice(0, hintLevel).map((h) => (
                  <li key={h} className="hint-in">
                    <RichText text={h} />
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {hintLevel < 3 && (
                <button type="button" onClick={nextHint} className={`${TACTILE} flex items-center gap-1.5 rounded-lg bg-[#ffd23f] px-3 py-1.5 text-xs font-black text-slate-900`}>
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  {hintLevel === 0 ? 'Lihat Hint / Tips Cepat' : `Tips berikutnya (${hintLevel + 1}/3)`}
                </button>
              )}
              {hintLevel > 0 && (
                <button type="button" onClick={closeHint} className={`${TACTILE} flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900`}>
                  <X className="h-4 w-4" aria-hidden /> Tutup tips
                </button>
              )}
            </div>
          </Guide>

          <div className="mt-6">
            <Body fx={fx} />
          </div>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-slate-300 pt-5">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
              className={`${TACTILE} flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 font-bold text-slate-900 disabled:pointer-events-none disabled:opacity-40`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden /> Sebelumnya
            </button>

            {isLast ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => { audio.playClick(); onBack(); }}
                  className={`${TACTILE} flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-bold text-slate-900`}
                >
                  <Home className="h-5 w-5" aria-hidden /> Kembali ke Main Menu
                </button>
                <button
                  type="button"
                  onClick={() => { audio.playSuccess(); onNext(); }}
                  className={`${TACTILE} prolog-cta-pulse flex items-center gap-2 rounded-xl bg-[#ffd23f] px-5 py-2.5 font-black text-slate-900`}
                >
                  <Zap className="h-5 w-5" aria-hidden /> Lanjut ke Quiz
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className={`${TACTILE} flex items-center gap-1 rounded-xl bg-[#4f8f3a] px-4 py-2.5 font-black text-white`}
              >
                Berikutnya: {CARDS[step + 1].short} <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            )}
          </footer>
        </article>
      </main>
    </VillageBackdrop>
  );
}

// ======================================================================
// Bagian bersama
// ======================================================================

/** Karakter pemandu + balon percakapan (intro kartu atau tips bertingkat). */
function Guide({ who, mood, title, children }) {
  const figure = {
    ratna: <BuRatnaCharacter mood={mood} size={110} />,
    cashier: <CashierCharacter mood={mood} size={100} />,
    warehouse: <WarehouseCharacter mood={mood} size={100} caption="Gudang" />,
  }[who];

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
      <div className="shrink-0">{figure}</div>
      <div className="relative order-first w-full rounded-2xl border-2 border-slate-800 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-[4px_4px_0px_#1e293b] sm:order-last sm:mb-10">
        <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-emerald-700">{title}</p>
        <div aria-live="polite">{children}</div>
        <span aria-hidden className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-slate-800 bg-white sm:hidden" />
        <span aria-hidden className="absolute -left-[9px] top-1/2 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-slate-800 bg-white sm:block" />
      </div>
    </div>
  );
}

/** Teks dengan potongan `kode` di antara backtick. */
function RichText({ text }) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith('`') ? (
      <code key={i} className="rounded border border-slate-300 bg-slate-100 px-1 font-mono text-[0.92em] font-bold text-[#8c3b2a]">
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const BLOCK_COLOR = {
  var: 'bg-sky-500 text-white',
  input: 'bg-sky-600 text-white',
  op: 'bg-[#f4b942] text-slate-900',
  print: 'bg-emerald-500 text-white',
  logic: 'bg-violet-500 text-white',
  loop: 'bg-[#e07a5f] text-white',
};

/** Blok puzzle bergaya Scratch. `state`: 'on' (menyala hijau), 'off' (redup), atau kosong. */
function Block({ kind, state, indent = 0, label, children }) {
  const stateCls =
    state === 'on' ? '!bg-emerald-500 !text-white ring-4 ring-emerald-300 scale-[1.02]' : state === 'off' ? 'opacity-45 saturate-50' : '';
  return (
    <div
      className={`relative rounded-lg border-2 border-slate-800 px-3 py-2 shadow-[3px_3px_0px_#1e293b] transition-all duration-300 ${BLOCK_COLOR[kind]} ${stateCls}`}
      style={{ marginLeft: indent * 28 }}
    >
      <span aria-hidden className="absolute -top-[2px] left-5 h-[7px] w-7 rounded-b-md border-2 border-t-0 border-slate-800 bg-[#fffaf0]" />
      <span aria-hidden className="absolute -bottom-[8px] left-5 z-10 h-[8px] w-7 rounded-b-md border-2 border-t-0 border-slate-800 bg-inherit" />
      {label && <span className="block text-[10px] font-black uppercase tracking-wider opacity-80">{label}</span>}
      <span className="flex flex-wrap items-center gap-1.5 font-mono text-sm font-black">{children}</span>
    </div>
  );
}

const slotCls =
  'rounded-full border-2 border-slate-800 bg-white px-2 py-0.5 text-center font-mono text-sm font-bold text-slate-900 shadow-[1px_1px_0px_#1e293b] focus:outline-none focus:ring-2 focus:ring-[#ffd23f] disabled:opacity-70';

function Slot({ value, onChange, label, numeric = false, maxLength = 16, width = 'w-28', disabled = false }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, '').slice(0, maxLength) : e.target.value.slice(0, maxLength))}
      inputMode={numeric ? 'numeric' : undefined}
      aria-label={label}
      disabled={disabled}
      className={`${slotCls} ${width}`}
    />
  );
}

function SlotSelect({ value, onChange, options, label }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`${slotCls} cursor-pointer pr-1`}>
      {options.map(([v, text]) => (
        <option key={v} value={v}>{text}</option>
      ))}
    </select>
  );
}

function BlockArea({ title = 'Susunan Blok', children }) {
  return (
    <section className="rounded-2xl border-2 border-dashed border-slate-400 bg-[#fffaf0] p-4">
      <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-600">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

const TYPE_INFO = {
  str: ['str', 'teks', 'bg-[#a5d68f]'],
  int: ['int', 'angka bulat', 'bg-[#ffd23f]'],
  float: ['float', 'angka desimal', 'bg-[#f4a582]'],
};

function TypeBadge({ type }) {
  const [name, desc, color] = TYPE_INFO[type] ?? TYPE_INFO.str;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 border-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-900 ${color}`}>
      <span className="font-mono">{name}</span> · {desc}
    </span>
  );
}

// Pewarnaan sintaks sederhana untuk pratinjau kode.
const TOKEN_RE = /("[^"]*"|#.*$|\b\d+(?:\.\d+)?\b|\b(?:if|elif|else|for|in|range|print|input|int)\b)/;
const CONTROL = new Set(['if', 'elif', 'else', 'for', 'in']);

function highlight(line) {
  return line.split(TOKEN_RE).map((part, i) => {
    if (!part) return null;
    if (i % 2 === 0) return <span key={i}>{part}</span>;
    let cls = 'text-sky-300';
    if (part.startsWith('"')) cls = 'text-[#a5d68f]';
    else if (part.startsWith('#')) cls = 'text-slate-500 italic';
    else if (/^\d/.test(part)) cls = 'text-[#f4b942]';
    else if (CONTROL.has(part)) cls = 'text-pink-400 font-bold';
    return <span key={i} className={cls}>{part}</span>;
  });
}

function CodeView({ lines, active = [], title = 'kedai.py' }) {
  return (
    <section className="overflow-hidden rounded-xl border-2 border-slate-800 bg-[#0f172a] shadow-[3px_3px_0px_#1e293b]">
      <div className="flex items-center gap-1.5 border-b-2 border-slate-700 bg-[#1e293b] px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 font-mono text-xs font-bold text-slate-400">{title}</span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-500">Kode Python</span>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-6">
        <code>
          {lines.map((line, i) => (
            <div key={i} className={`flex rounded px-1 transition-colors duration-300 ${active.includes(i) ? 'bg-emerald-500/25 ring-1 ring-emerald-400' : ''}`}>
              <span className="mr-3 w-4 shrink-0 select-none text-right text-slate-500">{i + 1}</span>
              <span className="whitespace-pre text-slate-100">{highlight(line)}</span>
            </div>
          ))}
        </code>
      </pre>
    </section>
  );
}

/** Layar keluaran. Baris: { text, kind?: 'in' | 'err' }. */
function Console({ lines, empty = 'Belum ada keluaran.' }) {
  return (
    <section className="rounded-xl border-2 border-slate-800 bg-slate-900 p-3 font-mono text-[13px] leading-6 shadow-[3px_3px_0px_#1e293b]">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Layar keluaran</p>
      {lines.length === 0 && <p className="italic text-slate-500">{empty}</p>}
      {lines.map((l, i) => (
        <p key={`${i}-${l.text}`} className={`break-words ${l.kind === 'err' ? 'text-rose-300' : l.kind === 'in' ? 'text-sky-300' : 'text-emerald-300'}`}>
          {l.text}
        </p>
      ))}
    </section>
  );
}

function Toggle({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-bold text-slate-800">
      <span className={`relative h-6 w-11 rounded-full border-2 border-slate-800 transition-colors ${checked ? 'bg-[#4f8f3a]' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-slate-800 bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {children}
    </label>
  );
}

const Twin = ({ left, right }) => (
  <div className="grid gap-5 lg:grid-cols-2">
    <div className="flex min-w-0 flex-col gap-5">{left}</div>
    <div className="flex min-w-0 flex-col gap-4">{right}</div>
  </div>
);

const Note = ({ tone = 'info', children }) => (
  <p
    className={`rounded-xl border-2 border-slate-800 px-3 py-2 text-sm font-semibold ${
      tone === 'warn' ? 'bg-[#fde2d4] text-[#8c3b2a]' : 'bg-[#eef7e8] text-slate-800'
    }`}
  >
    {children}
  </p>
);

// ======================================================================
// Kartu 1 — Variabel
// ======================================================================
function Jar({ name, value, type, fill }) {
  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div className="h-4 w-20 rounded-t-lg border-2 border-slate-800 bg-[#8b5a2b]" />
      <div className="relative -mt-2.5 flex h-32 w-28 flex-col items-center overflow-hidden rounded-b-[2rem] rounded-t-xl border-2 border-slate-800 bg-sky-50 shadow-[3px_3px_0px_#1e293b]">
        <div className="absolute inset-x-0 bottom-0 h-1/2 border-t-2 border-slate-800" style={{ background: fill }}>
          {[[18, 30], [46, 18], [70, 34], [30, 52], [62, 56], [84, 14]].map(([x, y]) => (
            <span key={`${x}-${y}`} className="absolute h-2.5 w-2.5 rounded-full border border-slate-800 bg-white/40" style={{ left: x, top: y }} />
          ))}
        </div>
        <div className="relative z-10 mt-4 w-24 rounded-md border-2 border-slate-800 bg-[#fff7e0] px-1 py-1 text-center shadow-[2px_2px_0px_#1e293b]">
          <div className="font-mono text-xs font-black text-[#8c3b2a]">{name}</div>
          <div className="truncate font-mono text-[11px] text-slate-700">{value || '…'}</div>
        </div>
      </div>
      <TypeBadge type={type} />
    </figure>
  );
}

function VariableCard({ fx }) {
  const [menu, setMenu] = useState('Kopi Bali');
  const [harga, setHarga] = useState('10000');
  const [quoted, setQuoted] = useState(false);

  const cleanMenu = menu.replace(/"/g, '');
  const hargaCode = harga ? (quoted ? `"${harga}"` : harga) : '';
  const lines = [`menu = "${cleanMenu}"`, `harga = ${hargaCode}`, 'print(menu)', 'print(harga)'];
  const output = harga
    ? [{ text: cleanMenu }, { text: harga }]
    : [{ kind: 'err', text: 'SyntaxError: nilai harga masih kosong. Isi dengan angka, misalnya 10000.' }];

  return (
    <Twin
      left={
        <>
          <div className="flex flex-wrap items-end justify-center gap-8 rounded-2xl border-2 border-slate-800 bg-[#fdf6e3] p-4">
            <Jar name="menu" value={`"${cleanMenu}"`} type="str" fill="#8d5a3b" />
            <Jar name="harga" value={hargaCode} type={quoted ? 'str' : 'int'} fill="#e9b949" />
          </div>
          <BlockArea title="Blok Variabel — ganti isinya">
            <Block kind="var" label="Variabel teks">
              menu = &quot;
              <Slot value={menu} label="Isi variabel menu" onChange={(v) => { setMenu(v); fx.react(v.trim() ? 'happy' : 'thinking', 1000); }} width="w-36" />
              &quot;
            </Block>
            <Block kind="var" label="Variabel angka">
              harga = {quoted && '"'}
              <Slot
                value={harga}
                numeric
                maxLength={7}
                label="Isi variabel harga"
                onChange={(v) => {
                  setHarga(v);
                  if (!v) fx.playError();
                  fx.react(v ? 'happy' : 'shocked', 1200);
                }}
              />
              {quoted && '"'}
            </Block>
            <Toggle
              checked={quoted}
              onChange={(v) => {
                setQuoted(v);
                fx.playClick();
                fx.react(v ? 'shocked' : 'happy');
              }}
            >
              Apit harga dengan tanda kutip
            </Toggle>
          </BlockArea>
        </>
      }
      right={
        <>
          <CodeView lines={lines} />
          <Console lines={output} />
          {quoted ? (
            <Note tone="warn">
              Hati-hati! Karena diapit kutip, <code>harga</code> sekarang berupa teks (str). Di layar terlihat sama, tetapi teks tidak bisa
              dihitung: <code>harga + 1000</code> akan menimbulkan galat.
            </Note>
          ) : (
            <Note>
              <code>menu</code> berisi teks (pakai kutip), <code>harga</code> berisi angka bulat (tanpa kutip). Coba ganti isinya dan lihat kode
              Python ikut berubah.
            </Note>
          )}
        </>
      }
    />
  );
}

// ======================================================================
// Kartu 2 — input() & int()
// ======================================================================
function evalOrder(typed, useInt) {
  const echo = { kind: 'in', text: `Berapa gelas? ${typed}` };
  if (!useInt) {
    return {
      ok: false,
      lines: [echo, { kind: 'err', text: `TypeError: teks "${typed}" tidak bisa dijumlahkan dengan angka 1. Ubah dulu dengan int().` }],
    };
  }
  if (!/^\d+$/.test(typed.trim())) {
    return {
      ok: false,
      badInt: true,
      lines: [echo, { kind: 'err', text: `ValueError: int() tidak bisa mengubah "${typed}" menjadi angka bulat. Ketik angka saja, misalnya 3.` }],
    };
  }
  const n = Number(typed.trim());
  return { ok: true, n, lines: [echo, { text: `Total gelas: ${n + 1}` }] };
}

function FlowBox({ title, value, type, dim, bad }) {
  return (
    <div className={`flex min-w-[88px] flex-col items-center gap-1 rounded-xl border-2 border-slate-800 bg-white px-2 py-2 shadow-[2px_2px_0px_#1e293b] transition-opacity ${dim ? 'opacity-40' : ''}`}>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{title}</span>
      <span className={`font-mono text-lg font-black ${bad ? 'text-rose-600' : 'text-slate-900'}`}>{value}</span>
      {type && <TypeBadge type={type} />}
    </div>
  );
}

const FlowArrow = ({ label }) => (
  <span className="flex flex-col items-center text-[11px] font-black text-[#8c3b2a]">
    <span className="font-mono">{label}</span>
    <ChevronRight className="h-5 w-5" aria-hidden />
  </span>
);

function InputCard({ fx }) {
  const [typed, setTyped] = useState('3');
  const [useInt, setUseInt] = useState(true);
  const result = evalOrder(typed, useInt);

  const lines = [
    useInt ? 'jumlah = int(input("Berapa gelas? "))' : 'jumlah = input("Berapa gelas? ")',
    'total = jumlah + 1  # bonus 1 gelas',
    'print("Total gelas:", total)',
  ];

  return (
    <Twin
      left={
        <>
          <div className="rounded-2xl border-2 border-slate-800 bg-[#fdf6e3] p-4">
            <p className="mb-3 text-sm font-bold text-slate-700">Perjalanan ketikan pembeli sampai bisa dihitung:</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <FlowBox title="Ketikan" value={typed || '…'} />
              <FlowArrow label="input()" />
              <FlowBox title="Hasil input" value={`"${typed}"`} type="str" />
              <FlowArrow label="int()" />
              <FlowBox
                title="Hasil int"
                value={result.badInt ? '✗' : typed.trim() || '…'}
                type={result.badInt ? undefined : 'int'}
                dim={!useInt}
                bad={result.badInt}
              />
              <FlowArrow label="+ 1" />
              <FlowBox title="Total" value={result.ok ? result.n + 1 : '✗'} bad={!result.ok} />
            </div>
          </div>

          <BlockArea title="Blok Input — ketik pesanan pembeli">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-slate-800 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-[2px_2px_0px_#1e293b]">
              Pembeli mengetik:
              <Slot
                value={typed}
                maxLength={6}
                width="w-24"
                label="Ketikan pembeli"
                onChange={(v) => {
                  setTyped(v);
                  fx.react(evalOrder(v, useInt).ok ? 'happy' : 'shocked', 1200);
                }}
              />
            </div>
            <Block kind="input" label="Variabel input">
              jumlah = {useInt && <span className="rounded bg-white/25 px-1">int(</span>}input(&quot;Berapa gelas? &quot;){useInt && <span className="rounded bg-white/25 px-1">)</span>}
            </Block>
            <Block kind="op" label="Operator hitung">total = jumlah + 1</Block>
            <Block kind="print" label="Cetak">print(&quot;Total gelas:&quot;, total)</Block>
            <Toggle
              checked={useInt}
              onChange={(v) => {
                setUseInt(v);
                const ok = evalOrder(typed, v).ok;
                if (ok) fx.playSuccess();
                else fx.playError();
                fx.react(ok ? 'happy' : 'shocked');
              }}
            >
              Bungkus dengan <code className="font-mono">int()</code>
            </Toggle>
          </BlockArea>
        </>
      }
      right={
        <>
          <CodeView lines={lines} />
          <Console lines={result.lines} />
          <Note tone={result.ok ? 'info' : 'warn'}>
            {result.ok
              ? 'input() selalu memberi teks. Berkat int(), teks "3" berubah menjadi angka 3 sehingga bisa dijumlahkan.'
              : useInt
                ? 'int() hanya bisa mengubah teks yang isinya angka bulat. Coba ketik angka, misalnya 2 atau 5.'
                : 'Tanpa int(), jumlah masih teks. Teks tidak bisa dijumlahkan dengan angka. Nyalakan lagi int()!'}
          </Note>
        </>
      }
    />
  );
}

// ======================================================================
// Kartu 3 — print()
// ======================================================================
const PRINT_VARS = { menu: 'Kopi Bali', jumlah: '2', total: '20000' };

function PrintCard({ fx }) {
  const [label, setLabel] = useState('Total:');
  const [varName, setVarName] = useState('total');
  const [receipt, setReceipt] = useState([]);

  const cleanLabel = label.replace(/"/g, '');
  const args = [cleanLabel && `"${cleanLabel}"`, varName].filter(Boolean);
  const printCode = `print(${args.join(', ')})`;
  const outText = [cleanLabel, varName && PRINT_VARS[varName]].filter(Boolean).join(' ');

  const printNow = () => {
    fx.playCashRegister();
    fx.react('happy');
    setReceipt((r) => [...r, { id: Date.now(), text: outText }].slice(-6));
  };

  return (
    <Twin
      left={
        <>
          <div className="flex flex-col items-center rounded-2xl border-2 border-slate-800 bg-[#fdf6e3] p-4">
            <div className="flex w-56 items-center justify-between rounded-t-2xl border-2 border-slate-800 bg-[#334155] px-3 py-2 shadow-[3px_3px_0px_#1e293b]">
              <span className="flex items-center gap-1.5 text-xs font-black text-white">
                <Printer className="h-4 w-4" aria-hidden /> Mesin Struk
              </span>
              <span className="lamp-blink h-2.5 w-2.5 rounded-full border border-slate-900 bg-emerald-400" />
            </div>
            <div className="h-2 w-48 border-2 border-t-0 border-slate-800 bg-slate-900" />
            <div className="min-h-[150px] w-44 border-2 border-t-0 border-slate-800 bg-white px-3 py-2 font-mono text-[12px] text-slate-800 shadow-[3px_3px_0px_#1e293b]">
              <p className="text-center font-black">KEDAI KOPI BU RATNA</p>
              <p className="mb-1 border-b border-dashed border-slate-400 text-center text-[10px]">Desa Sukamaju</p>
              {receipt.length === 0 && <p className="mt-6 text-center text-[11px] italic text-slate-400">Struk masih kosong</p>}
              {receipt.map((r) => (
                <p key={r.id} className="stamp-in break-words">{r.text || ' '}</p>
              ))}
            </div>
          </div>

          <BlockArea title="Blok Cetak — atur isi print()">
            <Block kind="print" label="Cetak">
              print( &quot;
              <Slot value={label} onChange={setLabel} label="Teks yang dicetak" width="w-28" />
              &quot;{varName && cleanLabel ? ',' : ''}
              <SlotSelect
                value={varName}
                onChange={(v) => { setVarName(v); fx.playClick(); }}
                label="Variabel yang dicetak"
                options={[['total', 'total'], ['jumlah', 'jumlah'], ['menu', 'menu'], ['', '(tanpa variabel)']]}
              />
              )
            </Block>
            <button
              type="button"
              onClick={printNow}
              className={`${TACTILE} flex items-center justify-center gap-2 rounded-xl bg-[#4f8f3a] px-4 py-2.5 font-black text-white`}
            >
              <Printer className="h-5 w-5" aria-hidden /> Cetak Struk
            </button>
          </BlockArea>
        </>
      }
      right={
        <>
          <CodeView lines={['menu = "Kopi Bali"', 'jumlah = 2', 'total = 20000', printCode]} active={[3]} />
          <Console lines={receipt.map((r) => ({ text: r.text }))} empty="Tekan tombol Cetak Struk untuk menjalankan print()." />
          <Note>
            Teks ditulis di dalam kutip, variabel ditulis tanpa kutip. Koma di antara keduanya membuat Python menambahkan spasi otomatis:{' '}
            <code>print(&quot;Total:&quot;, total)</code> → <code>Total: 20000</code>.
          </Note>
        </>
      }
    />
  );
}

// ======================================================================
// Kartu 4 — Operator matematika
// ======================================================================
const OP_INFO = {
  '+': 'Penjumlahan',
  '-': 'Pengurangan',
  '*': 'Perkalian',
  '/': 'Pembagian',
  '%': 'Sisa bagi (modulo)',
};

function calculate(a, b, op) {
  if (a === '' || b === '') return { ok: false, error: 'NameError: angka belum lengkap. Isi kedua nilai terlebih dahulu.' };
  const A = Number(a);
  const B = Number(b);
  if ((op === '/' || op === '%') && B === 0) {
    return { ok: false, error: 'ZeroDivisionError: tidak bisa membagi dengan 0. Ganti jumlah piring dengan angka lebih dari 0.' };
  }
  const value = { '+': A + B, '-': A - B, '*': A * B, '/': A / B, '%': A % B }[op];
  const text = op === '/' && Number.isInteger(value) ? `${value}.0` : String(value);
  return { ok: true, A, B, value, text };
}

function opStory(op, A, B, text) {
  switch (op) {
    case '+': return `Ada ${A} klepon, lalu datang kiriman ${B} klepon lagi. Stok menjadi ${text}.`;
    case '-': return `Ada ${A} klepon, lalu terjual ${B}. Stok tersisa ${text}.`;
    case '*': return `Setiap hari kedai menyiapkan ${A} klepon selama ${B} hari. Totalnya ${text} klepon.`;
    case '/': return `${A} klepon dibagi rata ke ${B} piring: tiap piring ${text} klepon. Hasil / selalu berupa desimal.`;
    default: return `${A} klepon dibagi ke ${B} piring: tiap piring dapat ${Math.floor(A / B)}, sisa ${text} klepon tidak kebagian piring.`;
  }
}

function Plates({ A, B, op }) {
  if (!(B >= 1 && B <= 8 && A <= 40)) {
    return <p className="text-center text-xs font-semibold text-slate-600">Gambar piring muncul jika piring 1–8 dan klepon paling banyak 40.</p>;
  }
  const each = Math.floor(A / B);
  const rest = A % B;
  return (
    <div className="flex flex-wrap items-end justify-center gap-3">
      {Array.from({ length: B }, (_, p) => (
        <div key={p} className="flex w-16 flex-wrap justify-center gap-0.5 rounded-full border-2 border-slate-800 bg-white px-1.5 py-2">
          {Array.from({ length: each }, (_, k) => (
            <span key={k} className="h-2.5 w-2.5 rounded-full border border-slate-800 bg-[#6abf4b]" />
          ))}
          {each === 0 && <span className="text-[10px] text-slate-400">kosong</span>}
        </div>
      ))}
      {rest > 0 && (
        <div className={`flex flex-col items-center rounded-xl border-2 border-dashed border-[#c4562f] px-2 py-1 ${op === '%' ? 'bg-[#fde2d4]' : 'bg-white'}`}>
          <span className="text-[10px] font-black text-[#8c3b2a]">sisa</span>
          <span className="flex gap-0.5">
            {Array.from({ length: rest }, (_, k) => (
              <span key={k} className="h-2.5 w-2.5 rounded-full border border-slate-800 bg-[#6abf4b]" />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function OperatorCard({ fx }) {
  const [a, setA] = useState('17');
  const [b, setB] = useState('5');
  const [op, setOp] = useState('%');
  const res = calculate(a, b, op);

  const onChange = (setter) => (v) => {
    setter(v);
    fx.react('thinking', 900);
  };

  return (
    <Twin
      left={
        <>
          <div className="rounded-2xl border-2 border-slate-800 bg-[#fdf6e3] p-4">
            <div className="mx-auto mb-4 w-full max-w-xs rounded-2xl border-2 border-slate-800 bg-[#8b5a2b] p-3 shadow-[3px_3px_0px_#1e293b]" style={WOOD_BG}>
              <p className="mb-1 text-center text-[10px] font-black uppercase tracking-widest text-[#ffe39a]">Kalkulator Dagang</p>
              <div className="rounded-lg border-2 border-slate-800 bg-[#c9e4b4] px-3 py-2 text-right font-mono text-xl font-black text-slate-900">
                {a || '?'} {op} {b || '?'} = {res.ok ? res.text : 'galat'}
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {Object.keys(OP_INFO).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      setOp(o);
                      fx.playClick();
                      fx.react(calculate(a, b, o).ok ? 'happy' : 'shocked');
                    }}
                    aria-label={OP_INFO[o]}
                    className={`rounded-md border-2 border-slate-800 py-1 font-mono text-lg font-black shadow-[2px_2px_0px_#1e293b] active:translate-y-[1px] active:shadow-none ${
                      op === o ? 'bg-[#ffd23f]' : 'bg-[#fff7e0]'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            {(op === '/' || op === '%') && res.ok && <Plates A={res.A} B={res.B} op={op} />}
          </div>

          <BlockArea title="Blok Operator — pilih operatornya">
            <Block kind="var">stok_klepon = <Slot value={a} numeric maxLength={3} width="w-20" label="Stok klepon" onChange={onChange(setA)} /></Block>
            <Block kind="var">jumlah = <Slot value={b} numeric maxLength={3} width="w-20" label="Jumlah" onChange={onChange(setB)} /></Block>
            <Block kind="op" label={`Operator: ${OP_INFO[op]}`}>
              hasil = stok_klepon
              <SlotSelect
                value={op}
                onChange={(o) => {
                  setOp(o);
                  fx.playClick();
                  fx.react(calculate(a, b, o).ok ? 'happy' : 'shocked');
                }}
                label="Pilih operator"
                options={Object.entries(OP_INFO).map(([o, name]) => [o, `${o}  ${name}`])}
              />
              jumlah
            </Block>
            <Block kind="print">print(&quot;Hasil:&quot;, hasil)</Block>
          </BlockArea>
        </>
      }
      right={
        <>
          <CodeView lines={[`stok_klepon = ${a}`, `jumlah = ${b}`, `hasil = stok_klepon ${op} jumlah`, 'print("Hasil:", hasil)']} active={[2]} />
          <Console lines={res.ok ? [{ text: `Hasil: ${res.text}` }] : [{ kind: 'err', text: res.error }]} />
          <Note tone={res.ok ? 'info' : 'warn'}>{res.ok ? opStory(op, res.A, res.B, res.text) : 'Periksa kembali angkanya, lalu coba lagi.'}</Note>
          <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-bold text-slate-700">
            {Object.entries(OP_INFO).map(([o, name]) => (
              <div key={o} className={`rounded-lg border-2 border-slate-800 px-1 py-1 ${op === o ? 'bg-[#ffd23f]' : 'bg-white'}`}>
                <span className="block font-mono text-base font-black">{o}</span>
                {name.split(' (')[0]}
              </div>
            ))}
          </div>
        </>
      }
    />
  );
}

// ======================================================================
// Kartu 5 — if-else
// ======================================================================
const BILL = 25000;

function IfCard({ fx }) {
  const [tab, setTab] = useState('genap');
  const [angka, setAngka] = useState(7);
  const [uang, setUang] = useState(30000);

  const isGenap = tab === 'genap';
  const cond = isGenap ? angka % 2 === 0 : uang >= BILL;

  const lines = isGenap
    ? [`angka = ${angka}`, 'if angka % 2 == 0:', '    print("Genap")', 'else:', '    print("Ganjil")']
    : [
        `total = ${BILL}`,
        `uang = ${uang}`,
        'if uang >= total:',
        '    print("Uang cukup, kembalian:", uang - total)',
        'else:',
        '    print("Uang kurang:", total - uang)',
      ];
  const offset = isGenap ? 1 : 2;
  const active = cond ? [offset, offset + 1] : [offset + 2, offset + 3];
  const output = isGenap
    ? cond ? 'Genap' : 'Ganjil'
    : cond ? `Uang cukup, kembalian: ${uang - BILL}` : `Uang kurang: ${BILL - uang}`;

  const switchTab = (next) => {
    fx.playClick();
    setTab(next);
  };

  return (
    <Twin
      left={
        <>
          <div className="flex gap-2">
            {[['genap', 'Genap atau Ganjil?'], ['uang', 'Uang Pembeli Cukup?']].map(([key, text]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                aria-pressed={tab === key}
                className={`${TACTILE} flex-1 rounded-xl px-3 py-2 text-sm font-black ${tab === key ? 'bg-[#ffd23f] text-slate-900' : 'bg-white text-slate-700'}`}
              >
                {text}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border-2 border-slate-800 p-4 text-[#fff7e0] shadow-[3px_3px_0px_#1e293b]" style={WOOD_BG}>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#ffe39a]">Papan Aturan Kedai</p>
            <p className="mt-1 text-sm font-bold" style={{ textShadow: '1px 1px 0 #1e293b' }}>
              {isGenap
                ? 'Nomor antrean genap duduk di bale kiri, nomor ganjil duduk di bale kanan.'
                : `Total belanja Rp${BILL}. Kalau uang pembeli cukup, beri kembalian. Kalau kurang, minta tambahan.`}
            </p>
            <label className="mt-3 block rounded-xl border-2 border-slate-800 bg-[#fffaf0] p-3 text-slate-900">
              <span className="flex justify-between text-sm font-black">
                <span>{isGenap ? 'Geser angka uji' : 'Geser uang pembeli'}</span>
                <span className="font-mono">{isGenap ? angka : `Rp${uang}`}</span>
              </span>
              <input
                type="range"
                min="0"
                max={isGenap ? 20 : 50000}
                step={isGenap ? 1 : 1000}
                value={isGenap ? angka : uang}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (isGenap) setAngka(v);
                  else setUang(v);
                  const ok = isGenap ? true : v >= BILL;
                  fx.react(ok ? 'happy' : 'shocked', 1200);
                }}
                className="mt-2 w-full accent-[#4f8f3a]"
              />
            </label>
          </div>

          <BlockArea title="Blok Keputusan — cabang yang menyala dijalankan">
            {isGenap ? (
              <Block kind="var">angka = {angka}</Block>
            ) : (
              <>
                <Block kind="var">total = {BILL}</Block>
                <Block kind="var">uang = {uang}</Block>
              </>
            )}
            <Block kind="logic" state={cond ? 'on' : 'off'} label={cond ? 'Kondisi benar ✓' : 'Kondisi salah'}>
              {isGenap ? 'if angka % 2 == 0 :' : 'if uang >= total :'}
            </Block>
            <Block kind="print" indent={1} state={cond ? 'on' : 'off'}>
              {isGenap ? 'print("Genap")' : 'print("Uang cukup, kembalian:", uang - total)'}
            </Block>
            <Block kind="logic" state={cond ? 'off' : 'on'} label={cond ? 'Dilewati' : 'Dijalankan ✓'}>else :</Block>
            <Block kind="print" indent={1} state={cond ? 'off' : 'on'}>
              {isGenap ? 'print("Ganjil")' : 'print("Uang kurang:", total - uang)'}
            </Block>
          </BlockArea>
        </>
      }
      right={
        <>
          <CodeView lines={lines} active={active} />
          <Console lines={[{ text: output }]} />
          <Note>
            {isGenap
              ? `${angka} % 2 = ${angka % 2}. Kalau sisa baginya 0, angka itu genap, jadi blok if yang dijalankan.`
              : `Kondisi uang >= total bernilai ${cond ? 'benar (True)' : 'salah (False)'}, jadi blok ${cond ? 'if' : 'else'} yang dijalankan.`}{' '}
            Perhatikan titik dua (:) dan baris yang menjorok ke dalam.
          </Note>
        </>
      }
    />
  );
}

// ======================================================================
// Kartu 6 — Perulangan for
// ======================================================================
const EXPENSE_LABELS = ['Gula aren', 'Biji kopi', 'Kemasan'];
const STEP_MS = 700;

function buildLoopSteps(values) {
  const steps = [{ line: 0, iter: -1, filled: 0, total: 0 }];
  let total = 0;
  values.forEach((v, i) => {
    steps.push({ line: 1, iter: i, filled: i, total });
    steps.push({ line: 2, iter: i, filled: i + 1, total });
    total += v;
    steps.push({ line: 3, iter: i, filled: i + 1, total });
  });
  steps.push({ line: 4, iter: 2, filled: 3, total, done: true });
  return steps;
}

function LoopCard({ fx }) {
  const [costs, setCosts] = useState(['12000', '15000', '5000']);
  const [run, setRun] = useState({ status: 'idle', line: -1, iter: -1, filled: 0, total: 0 });
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const ready = costs.every((c) => c !== '');
  const running = run.status === 'running';

  const start = () => {
    if (!ready) return;
    clearTimeout(timer.current);
    const steps = buildLoopSteps(costs.map(Number));
    const tick = (i) => {
      const s = steps[i];
      setRun({ status: s.done ? 'done' : 'running', ...s });
      if (s.line === 1) fx.playClick();
      if (s.done) {
        fx.playSuccess();
        fx.react('happy', 2500);
        return;
      }
      fx.react('thinking', STEP_MS + 200);
      timer.current = setTimeout(() => tick(i + 1), STEP_MS);
    };
    tick(0);
  };

  const reset = () => {
    clearTimeout(timer.current);
    fx.playClick();
    setRun({ status: 'idle', line: -1, iter: -1, filled: 0, total: 0 });
  };

  const lineState = (n) => (run.line === n ? 'on' : undefined);
  const consoleLines = [
    ...costs.slice(0, run.filled).map((c) => ({ kind: 'in', text: `Pengeluaran: ${c}` })),
    ...(run.status === 'done' ? [{ text: `Total pengeluaran: ${run.total}` }] : []),
  ];

  return (
    <Twin
      left={
        <>
          <div className="rounded-2xl border-2 border-slate-800 bg-[#fdf6e3] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-800">Buku Catatan Pengeluaran Kedai</p>
              <span className="flex items-center gap-1.5 rounded-full border-2 border-slate-800 bg-[#e07a5f] px-3 py-1 text-xs font-black text-white shadow-[2px_2px_0px_#1e293b]">
                <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} aria-hidden />
                {run.iter >= 0 ? `Putaran ${run.iter + 1}/3 (i = ${run.iter})` : 'Belum berputar'}
              </span>
            </div>
            <ul className="divide-y-2 divide-dashed divide-slate-300 rounded-xl border-2 border-slate-800 bg-white px-3 shadow-[2px_2px_0px_#1e293b]">
              {EXPENSE_LABELS.map((name, i) => {
                const filled = run.filled > i;
                return (
                  <li key={name} className={`flex items-center gap-2 py-2 text-sm ${run.iter === i && running ? 'bg-[#fff1c1]' : ''}`}>
                    <span className="w-24 shrink-0 font-bold text-slate-500">Putaran {i + 1}</span>
                    <span className="flex-1 font-semibold text-slate-800">{name}</span>
                    {run.status === 'idle' ? (
                      <Slot
                        value={costs[i]}
                        numeric
                        maxLength={6}
                        width="w-24"
                        label={`Pengeluaran ${name}`}
                        onChange={(v) => setCosts((c) => c.map((x, k) => (k === i ? v : x)))}
                      />
                    ) : (
                      <span className={`font-mono font-black ${filled ? 'ingredient-drop text-slate-900' : 'text-slate-300'}`}>
                        {filled ? costs[i] : '—'}
                      </span>
                    )}
                  </li>
                );
              })}
              <li className="flex items-center justify-between py-2 text-sm font-black">
                <span>total</span>
                <span key={run.total} className="font-mono text-[#4f8f3a]">{run.total}</span>
              </li>
            </ul>
          </div>

          <BlockArea title="Blok Perulangan — tekan tombol untuk memutar">
            <Block kind="var" state={lineState(0)}>total = 0</Block>
            <div className={`rounded-xl border-2 border-slate-800 bg-[#e07a5f] shadow-[3px_3px_0px_#1e293b] transition-all ${run.line === 1 ? 'ring-4 ring-emerald-300' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 font-mono text-sm font-black text-white">
                <span>for i in range(3) :</span>
                {run.iter >= 0 && <span className="rounded-full border-2 border-slate-800 bg-white px-2 text-xs text-slate-900">i = {run.iter}</span>}
              </div>
              <div className="ml-4 flex flex-col gap-3 rounded-l-lg border-y-2 border-l-2 border-slate-800 bg-[#fffaf0] py-3 pl-3 pr-2">
                <Block kind="input" state={lineState(2)}>pengeluaran = int(input(&quot;Pengeluaran: &quot;))</Block>
                <Block kind="op" state={lineState(3)}>total = total + pengeluaran</Block>
              </div>
              <div className="h-4" />
            </div>
            <Block kind="print" state={lineState(4)}>print(&quot;Total pengeluaran:&quot;, total)</Block>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={start}
                disabled={running || !ready}
                className={`${TACTILE} flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-4 py-2.5 font-black text-slate-900 disabled:opacity-50`}
              >
                <Play className="h-5 w-5" aria-hidden /> {run.status === 'done' ? 'Putar Lagi' : 'Putar Simulasi Loop'}
              </button>
              {run.status !== 'idle' && (
                <button type="button" onClick={reset} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-3 py-2.5 font-bold text-slate-900`}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> Ubah angka
                </button>
              )}
            </div>
            {!ready && <Note tone="warn">Isi ketiga pengeluaran dulu sebelum memutar simulasi.</Note>}
          </BlockArea>
        </>
      }
      right={
        <>
          <CodeView
            title="money_tracker.py"
            lines={[
              'total = 0',
              'for i in range(3):',
              '    pengeluaran = int(input("Pengeluaran: "))',
              '    total = total + pengeluaran',
              'print("Total pengeluaran:", total)',
            ]}
            active={run.line >= 0 ? [run.line] : []}
          />
          <Console lines={consoleLines} empty="Tekan Putar Simulasi Loop untuk melihat perulangan berjalan." />
          <Note>
            <code>range(3)</code> membuat <code>i</code> bernilai 0, 1, lalu 2. Dua baris yang menjorok diulang 3 kali, sedangkan{' '}
            <code>print</code> di luar loop hanya dijalankan sekali setelah perulangan selesai.
          </Note>
        </>
      }
    />
  );
}

// ======================================================================
// Data kartu
// ======================================================================
const CARDS = [
  {
    short: 'Variabel',
    title: 'Blok Variabel — Wadah Penyimpan Nilai',
    badge: 'bg-sky-300',
    guide: 'ratna',
    guideTitle: 'Bu Ratna',
    intro: 'Di dapur kedai, setiap toples diberi label supaya kita tahu isinya. Variabel juga begitu: punya nama (label) dan isi (nilai). Coba ganti isi toples lewat blok biru di bawah!',
    hints: [
      'Variabel ditulis `nama = nilai`: nama di kiri tanda `=`, isinya di kanan.',
      'Teks (str) wajib diapit tanda kutip, contohnya `"Kopi Bali"`. Angka (int) ditulis tanpa kutip, contohnya `10000`.',
      'Nama variabel tidak boleh memakai spasi dan tidak boleh diawali angka: `harga_kopi` benar, sedangkan `harga kopi` dan `1harga` salah.',
    ],
    Body: VariableCard,
  },
  {
    short: 'input & int',
    title: 'Blok input() & int() — Menerima Pesanan',
    badge: 'bg-sky-400',
    guide: 'cashier',
    guideTitle: 'Kasir',
    intro: 'Saat pembeli menyebutkan jumlah pesanan, aku mencatatnya dengan input(). Tapi hasil input() selalu berupa teks, jadi harus diubah dengan int() agar bisa dihitung. Coba ketik pesanan pembeli!',
    hints: [
      '`input()` selalu menghasilkan teks (str), walaupun yang diketik adalah angka.',
      'Bungkus dengan `int()` agar teks angka berubah menjadi bilangan bulat: `int(input())`. Perhatikan jumlah kurung buka dan tutupnya.',
      'Contoh lengkap: `jumlah = int(input("Berapa gelas? "))` lalu `total = jumlah * 10000`.',
    ],
    Body: InputCard,
  },
  {
    short: 'print',
    title: 'Blok print() — Mencetak Struk ke Layar',
    badge: 'bg-emerald-300',
    guide: 'cashier',
    guideTitle: 'Kasir',
    intro: 'Mesin struk ini seperti print(): apa pun yang kita masukkan akan dicetak ke layar. Atur teks dan variabelnya, lalu tekan Cetak Struk!',
    hints: [
      '`print()` menampilkan isi ke layar. Teks memakai kutip, variabel tidak.',
      'Pisahkan beberapa isi dengan koma. Python otomatis memberi spasi di antaranya.',
      'Contoh: `print("Total:", total)` menghasilkan `Total: 20000`. Jangan lupa menutup kurung!',
    ],
    Body: PrintCard,
  },
  {
    short: 'Operator',
    title: 'Blok Operator Matematika — Kalkulator Dagang',
    badge: 'bg-[#f4b942]',
    guide: 'warehouse',
    guideTitle: 'Penjaga Gudang',
    intro: 'Aku menghitung stok jajanan setiap hari. Ada lima operator: + tambah, - kurang, * kali, / bagi, dan % sisa bagi. Pilih operator di blok kuning dan lihat hasilnya!',
    hints: [
      '`+` tambah, `-` kurang, `*` kali, `/` bagi, `%` sisa bagi.',
      '`/` selalu menghasilkan bilangan desimal, misalnya `10 / 5` hasilnya `2.0`. Membagi dengan 0 akan menimbulkan galat.',
      '`%` dipakai untuk mencari sisa: `17 % 5` hasilnya `2`. Untuk mengecek bilangan genap, pakai `angka % 2 == 0`.',
    ],
    Body: OperatorCard,
  },
  {
    short: 'if-else',
    title: 'Blok Percabangan if-else — Keputusan Kondisi',
    badge: 'bg-violet-300',
    guide: 'ratna',
    guideTitle: 'Bu Ratna',
    intro: 'Kedai punya aturan: kalau syaratnya terpenuhi, lakukan ini; kalau tidak, lakukan itu. Geser nilai uji dan lihat cabang mana yang menyala hijau!',
    hints: [
      '`if` mengecek kondisi. Jika benar, blok di bawahnya dijalankan. Jika salah, blok `else` yang dijalankan.',
      'Akhiri baris `if` dan `else` dengan titik dua `:`, lalu tulis isi bloknya menjorok ke dalam (indentasi 4 spasi).',
      'Gunakan `==` untuk membandingkan (sama dengan), bukan `=` (mengisi variabel). Contoh: `if angka % 2 == 0:` atau `if uang >= total:`.',
    ],
    Body: IfCard,
  },
  {
    short: 'for',
    title: 'Blok Perulangan for — Mencatat Tanpa Capek',
    badge: 'bg-[#f4a582]',
    guide: 'warehouse',
    guideTitle: 'Penjaga Gudang',
    intro: 'Setiap sore aku mencatat 3 pengeluaran kedai. Daripada menulis kode yang sama tiga kali, cukup pakai for i in range(3). Tekan tombol Putar Simulasi Loop!',
    hints: [
      '`for i in range(3):` mengulang isi blok sebanyak 3 kali.',
      '`range(3)` menghasilkan `i` = 0, 1, 2 (dimulai dari 0, bukan 1). Jangan lupa titik dua dan indentasi.',
      'Hanya baris yang menjorok yang ikut diulang. Baris `print` yang tidak menjorok dijalankan sekali setelah perulangan selesai.',
    ],
    Body: LoopCard,
  },
];
