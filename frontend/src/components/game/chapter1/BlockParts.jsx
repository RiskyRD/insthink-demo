import { useState } from 'react';
import { ArrowDown, ArrowUp, IndentDecrease, IndentIncrease, Lock, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import {
  ARITH_OPS, BLOCK_STYLE, COMPARE_OPS, NUMBER_OPTION, allVariables, textValue,
} from './blockProgram';

const DRAG_MIME = 'text/plain';

/** Petunjuk "klik di sini" yang memantul di atas elemen yang disorot tutorial. */
export function PointerHint({ label = 'Klik di sini' }) {
  return (
    <span className="tutorial-pointer pointer-events-none absolute -top-9 right-2 z-20 flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-slate-800 bg-[#ffd23f] px-2 py-0.5 text-[11px] font-black text-slate-900 shadow-[2px_2px_0px_#1e293b]">
      <MousePointerClick className="h-3.5 w-3.5" aria-hidden /> {label}
    </span>
  );
}

// ----------------------------------------------------------------------
// Isian kecil di dalam blok
// ----------------------------------------------------------------------
function Pill({ value, onChange, options, label, glow = false, disabled = false }) {
  return (
    <span className={`relative inline-flex rounded-full ${glow ? 'tutorial-glow' : ''}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        aria-label={label}
        className="cursor-pointer appearance-none rounded-full border-2 border-slate-800 bg-white py-0.5 pl-2 pr-5 font-mono text-xs font-bold text-slate-900 shadow-[1px_1px_0px_#1e293b] focus:outline-none focus:ring-2 focus:ring-[#ffd23f] disabled:cursor-default disabled:opacity-90"
        style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, #1e293b 50%), linear-gradient(135deg, #1e293b 50%, transparent 50%)', backgroundPosition: 'calc(100% - 9px) 55%, calc(100% - 5px) 55%', backgroundSize: '4px 4px', backgroundRepeat: 'no-repeat' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

function NumberBox({ value, onChange, label, disabled = false }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 7))}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled}
      placeholder="angka"
      aria-label={label}
      className="w-20 rounded-full border-2 border-slate-800 bg-white px-2 py-0.5 text-center font-mono text-xs font-bold text-slate-900 shadow-[1px_1px_0px_#1e293b] placeholder:font-sans placeholder:font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ffd23f] disabled:opacity-90"
    />
  );
}

const varOptions = (names) => names.map((n) => ({ value: n, label: n }));

/** Operand: pilih variabel atau "angka…" lalu ketik angkanya. */
function Operand({ fields, name, vars, onField, glow, disabled, label }) {
  return (
    <>
      <Pill
        value={fields[name]}
        onChange={(v) => onField(name, v)}
        options={[...varOptions(vars), { value: NUMBER_OPTION, label: 'angka…' }]}
        glow={glow}
        disabled={disabled}
        label={label}
      />
      {fields[name] === NUMBER_OPTION && (
        <NumberBox value={fields[`${name}Num`]} onChange={(v) => onField(`${name}Num`, v)} disabled={disabled} label={`${label}: angka`} />
      )}
    </>
  );
}

const Kw = ({ children }) => <span className="font-mono text-sm font-black">{children}</span>;

/** Isi baris blok sesuai jenisnya. */
function BlockContent({ block, mission, onField, highlight, disabled }) {
  const f = block.fields;
  const vars = allVariables(mission);
  const glow = (field) => highlight === `field:${block.type}:${field}`;

  switch (block.type) {
    case 'input':
      return (
        <>
          <Pill value={f.var} onChange={(v) => onField('var', v)} options={varOptions(mission.inputs.map((i) => i.name))} glow={glow('var')} disabled={disabled} label="Nama variabel input" />
          <Kw>= int(input())</Kw>
        </>
      );
    case 'const':
      return (
        <>
          <Pill value={f.var} onChange={(v) => onField('var', v)} options={varOptions(mission.constants)} glow={glow('var')} disabled={disabled} label="Nama variabel angka" />
          <Kw>=</Kw>
          <NumberBox value={f.value} onChange={(v) => onField('value', v)} disabled={disabled} label={`Nilai ${f.var}`} />
        </>
      );
    case 'calc':
      return (
        <>
          <Pill value={f.target} onChange={(v) => onField('target', v)} options={varOptions(mission.computed)} glow={glow('target')} disabled={disabled} label="Variabel hasil" />
          <Kw>=</Kw>
          <Operand fields={f} name="left" vars={vars} onField={onField} glow={glow('left')} disabled={disabled} label="Nilai kiri" />
          <Pill value={f.op} onChange={(v) => onField('op', v)} options={ARITH_OPS.map((o) => ({ value: o, label: o }))} glow={glow('op')} disabled={disabled} label="Operator aritmatika" />
          <Operand fields={f} name="right" vars={vars} onField={onField} glow={glow('right')} disabled={disabled} label="Nilai kanan" />
        </>
      );
    case 'if':
      return (
        <>
          <Kw>if</Kw>
          <Operand fields={f} name="left" vars={vars} onField={onField} glow={glow('left')} disabled={disabled} label="Nilai kiri perbandingan" />
          <Pill value={f.cmp} onChange={(v) => onField('cmp', v)} options={COMPARE_OPS.map((o) => ({ value: o, label: o }))} glow={glow('cmp')} disabled={disabled} label="Operator perbandingan" />
          <Operand fields={f} name="right" vars={vars} onField={onField} glow={glow('right')} disabled={disabled} label="Nilai kanan perbandingan" />
          <Kw>:</Kw>
        </>
      );
    case 'else':
      return <Kw>else:</Kw>;
    case 'print':
      return (
        <>
          <Kw>print(</Kw>
          <Pill
            value={f.value}
            onChange={(v) => onField('value', v)}
            options={[...varOptions(vars), ...mission.texts.map((t) => ({ value: textValue(t), label: `"${t}"` }))]}
            glow={glow('value')}
            disabled={disabled}
            label="Isi yang dicetak"
          />
          <Kw>)</Kw>
        </>
      );
    default:
      return null;
  }
}

/** Kulit blok puzzle: lekukan atas, tonjolan bawah, border tebal kartun. */
function BlockShell({ type, children, className = '', notchBg = 'bg-[#fdf6e3]' }) {
  const s = BLOCK_STYLE[type];
  return (
    <div className={`relative rounded-lg border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] ${s.bg} ${s.text} ${className}`}>
      <span aria-hidden className={`absolute -top-[2px] left-5 h-[7px] w-7 rounded-b-md border-2 border-t-0 border-slate-800 ${notchBg}`} />
      <span aria-hidden className={`absolute -bottom-[8px] left-5 z-10 h-[8px] w-7 rounded-b-md border-2 border-t-0 border-slate-800 ${s.bump}`} />
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------
// Bank Blok Kode
// ----------------------------------------------------------------------
const BANK_SAMPLE = {
  input: 'variabel = int(input())',
  const: 'variabel = angka',
  calc: 'hasil = a + b  (+, -, *)',
  if: 'if a >= b :',
  else: 'else :',
  print: 'print(…)',
};

export function BlockBank({ types, onAdd, highlight }) {
  return (
    <ul className="grid gap-4 pt-1">
      {types.map((type) => {
        const glow = highlight === `bank:${type}`;
        return (
          <li key={type} className="relative">
            {glow && <PointerHint />}
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, `new:${type}`);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAdd(type)}
              className={`group block w-full text-left transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] ${glow ? 'tutorial-glow rounded-lg' : ''}`}
              aria-label={`Tambahkan blok ${BLOCK_STYLE[type].label}`}
            >
              <BlockShell type={type} notchBg="bg-white">
                <span className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-wider opacity-80">{BLOCK_STYLE[type].label}</span>
                    <span className="block truncate font-mono text-sm font-black">{BANK_SAMPLE[type]}</span>
                  </span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-900 group-hover:rotate-90 group-hover:transition-transform">
                    <Plus className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </span>
                </span>
              </BlockShell>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ----------------------------------------------------------------------
// Area Susun Program
// ----------------------------------------------------------------------
function ToolButton({ onClick, label, disabled, children }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-slate-800 bg-white/90 text-slate-800 transition-transform duration-100 hover:bg-white active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/**
 * @param {Array}  program       daftar blok
 * @param {string} selectedId    blok terpilih (blok baru disisipkan di bawahnya)
 * @param {Set}    issueIds      blok yang bermasalah (bergaris merah)
 * @param {string} errorBlockId  blok tempat galat Python terjadi (bergetar)
 */
export function ProgramArea({
  program, mission, selectedId, onSelect, onUpdate, onMove, onToggleNest, onRemove, onDropNew, onDropMove,
  issueIds, errorBlockId, highlight, disabled = false,
}) {
  const [dropIndex, setDropIndex] = useState(null);

  const handleDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDropIndex(null);
    const data = e.dataTransfer.getData(DRAG_MIME);
    if (data.startsWith('new:')) onDropNew(data.slice(4), index);
    else if (data.startsWith('move:')) onDropMove(data.slice(5), index);
  };

  const dropLine = (index) =>
    dropIndex === index && <div className="my-1 h-1.5 rounded-full bg-[#ffd23f] ring-2 ring-slate-800" aria-hidden />;

  return (
    <div
      className="min-h-[320px] rounded-2xl border-2 border-dashed border-slate-500 bg-[#fdf6e3] bg-[radial-gradient(circle,#e7dcc0_1px,transparent_1px)] p-4 [background-size:18px_18px]"
      onDragOver={(e) => { e.preventDefault(); if (dropIndex === null) setDropIndex(program.length); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropIndex(null); }}
      onDrop={(e) => handleDrop(e, dropIndex ?? program.length)}
    >
      {program.length === 0 && (
        <p className="py-16 text-center text-sm font-bold text-slate-400">Klik atau seret blok dari Bank Blok Kode ke sini.</p>
      )}

      <ol className="grid gap-3">
        {program.map((block, i) => {
          const locked = disabled || block.locked;
          const canNest = block.type !== 'if' && block.type !== 'else' && i > 0;
          const hasIssue = issueIds?.has(block.id);
          return (
            <li
              key={block.id}
              draggable={!locked}
              onDragStart={(e) => { e.dataTransfer.setData(DRAG_MIME, `move:${block.id}`); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setDropIndex(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
              }}
              onDrop={(e) => handleDrop(e, dropIndex ?? i)}
            >
              {dropLine(i)}
              <div className={`relative ${block.nested ? 'pl-7' : ''}`}>
                {block.nested && (
                  <span aria-hidden className="absolute -bottom-3 -top-3 left-1 w-4 border-x-2 border-slate-800 bg-violet-500" />
                )}
                <BlockShell
                  type={block.type}
                  className={`${selectedId === block.id ? 'ring-4 ring-[#ffd23f]' : ''} ${hasIssue ? 'outline outline-[3px] outline-offset-2 outline-rose-500' : ''} ${errorBlockId === block.id ? 'block-shake' : ''} block-snap cursor-pointer`}
                >
                  <div
                    className="flex flex-wrap items-center gap-1.5 px-3 py-2"
                    onClick={() => onSelect(selectedId === block.id ? null : block.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSelect(block.id); }}
                    aria-label={`Blok baris ${i + 1}`}
                  >
                    <span className="mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/25 px-1 font-mono text-[10px] font-black">{i + 1}</span>
                    <BlockContent
                      block={block}
                      mission={mission}
                      onField={(key, value) => onUpdate(block.id, key, value)}
                      highlight={highlight}
                      disabled={locked}
                    />
                    <span className="ml-auto flex items-center gap-1 pl-2">
                      {block.locked ? (
                        <Lock className="h-4 w-4 opacity-80" aria-label="Blok terkunci" />
                      ) : (
                        <>
                          <ToolButton label="Naikkan blok" onClick={() => onMove(block.id, -1)} disabled={locked || i === 0 || program[i - 1]?.locked}><ArrowUp className="h-3.5 w-3.5" /></ToolButton>
                          <ToolButton label="Turunkan blok" onClick={() => onMove(block.id, 1)} disabled={locked || i === program.length - 1}><ArrowDown className="h-3.5 w-3.5" /></ToolButton>
                          {canNest && (
                            <ToolButton label={block.nested ? 'Keluarkan dari if/else' : 'Masukkan ke dalam if/else'} onClick={() => onToggleNest(block.id)} disabled={locked}>
                              {block.nested ? <IndentDecrease className="h-3.5 w-3.5" /> : <IndentIncrease className="h-3.5 w-3.5" />}
                            </ToolButton>
                          )}
                          <ToolButton label="Lepas blok" onClick={() => onRemove(block.id)} disabled={locked}><Trash2 className="h-3.5 w-3.5" /></ToolButton>
                        </>
                      )}
                    </span>
                  </div>
                </BlockShell>
              </div>
            </li>
          );
        })}
      </ol>
      {dropLine(program.length)}
    </div>
  );
}

// ----------------------------------------------------------------------
// Pratinjau Kode Python Asli
// ----------------------------------------------------------------------
const TOKEN = /("[^"]*")|\b(if|else)\b|\b(print|int|input)\b|\b(\d+)\b|(>=|<=|==|[+\-*><=:])/g;

function highlightLine(text) {
  const parts = [];
  let last = 0;
  text.replace(TOKEN, (match, str, kw, fn, num, op, offset) => {
    if (offset > last) parts.push(text.slice(last, offset));
    let cls = 'text-sky-300';
    if (str) cls = 'text-lime-300';
    else if (kw) cls = 'text-fuchsia-300 font-black';
    else if (fn) cls = 'text-amber-300';
    else if (num) cls = 'text-orange-300';
    else if (op) cls = 'text-slate-300';
    parts.push(<span key={offset} className={cls}>{match}</span>);
    last = offset + match.length;
    return match;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function PythonPreview({ lines, errorLine, selectedId }) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-900 shadow-[4px_4px_0px_#1e293b]">
      <div className="flex items-center gap-1.5 border-b-2 border-slate-700 bg-slate-800 px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 font-mono text-[11px] font-bold text-slate-400">sistem.py</span>
      </div>
      <pre className="max-h-[360px] overflow-auto p-3 font-mono text-[13px] leading-6 text-slate-100">
        {lines.length === 0 ? (
          <span className="text-slate-500"># Kode Python akan muncul di sini saat kamu memasang blok.</span>
        ) : (
          lines.map((line, i) => (
            <div
              key={line.blockId}
              className={`-mx-3 flex px-3 ${errorLine === i + 1 ? 'bg-rose-500/30' : selectedId === line.blockId ? 'bg-[#ffd23f]/15' : ''}`}
            >
              <span className="mr-3 w-5 shrink-0 select-none text-right text-slate-500">{i + 1}</span>
              <code className="whitespace-pre">{highlightLine(line.text)}</code>
            </div>
          ))
        )}
      </pre>
    </div>
  );
}
