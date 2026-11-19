import { useRef, useState } from 'react';

const INDENT = '    ';
const LINE_HEIGHT = 24; // px, sama dengan leading-6
const PAD = 12; // px, sama dengan p-3

/** Sisipkan teks di posisi kursor dengan tetap mendukung Ctrl+Z (execCommand), cadangan manual jika tidak tersedia. */
function insertText(el, text, onChange) {
  el.focus();
  let ok = false;
  try {
    ok = document.execCommand('insertText', false, text);
  } catch {
    ok = false;
  }
  if (!ok) {
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = value.slice(0, s) + text + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => el.setSelectionRange(s + text.length, s + text.length));
  }
}

/**
 * Editor kode Python sederhana ala online compiler:
 * nomor baris, Tab = 4 spasi (Shift+Tab mundur), Enter mempertahankan indentasi
 * (+4 spasi setelah baris berakhiran ":"), sorot baris galat, Ctrl+Enter menjalankan kode.
 */
export default function CodeEditor({ value, onChange, errorLine = null, onRun, readOnly = false, label = 'Editor kode Python' }) {
  const ref = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lineCount = Math.max(value.split('\n').length, 12);

  const handleKeyDown = (event) => {
    const el = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value: text } = el;

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onRun?.();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      if (event.shiftKey || start !== end) {
        // Indent / dedent semua baris yang terseleksi.
        const blockEnd = text.indexOf('\n', end - (end > start && text[end - 1] === '\n' ? 1 : 0));
        const stop = blockEnd === -1 ? text.length : blockEnd;
        const block = text.slice(lineStart, stop);
        const changed = block
          .split('\n')
          .map((l) => (event.shiftKey ? l.replace(/^ {1,4}/, '') : INDENT + l))
          .join('\n');
        const next = text.slice(0, lineStart) + changed + text.slice(stop);
        onChange(next);
        requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart + changed.length));
        return;
      }
      insertText(el, INDENT, onChange);
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const current = text.slice(lineStart, start);
      const indent = current.match(/^\s*/)[0];
      const extra = /:\s*(#.*)?$/.test(current) ? INDENT : '';
      insertText(el, `\n${indent}${extra}`, onChange);
      return;
    }

    if (event.key === 'Backspace' && start === end) {
      // Hapus satu tingkat indentasi sekaligus jika kursor berada setelah spasi awal.
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const before = text.slice(lineStart, start);
      if (before.length >= 4 && /^ +$/.test(before) && before.length % 4 === 0) {
        event.preventDefault();
        el.setSelectionRange(start - 4, start);
        insertText(el, '', onChange);
      }
    }
  };

  return (
    <div className="relative flex overflow-hidden bg-[#0f172a] font-mono text-[13px] sm:text-sm">
      {/* Nomor baris */}
      <div className="relative w-11 shrink-0 select-none overflow-hidden border-r-2 border-slate-700 bg-[#1e293b] text-right text-slate-500" aria-hidden>
        <div style={{ transform: `translateY(${-scrollTop}px)`, paddingTop: PAD, paddingBottom: PAD }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`pr-2 ${errorLine === i + 1 ? 'bg-rose-500 font-black text-white' : ''}`}
              style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        {/* Sorot baris galat */}
        {errorLine && (
          <div
            className="pointer-events-none absolute inset-x-0 bg-rose-500/25 ring-1 ring-rose-400"
            style={{ top: PAD + (errorLine - 1) * LINE_HEIGHT - scrollTop, height: LINE_HEIGHT }}
            aria-hidden
          />
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={readOnly ? undefined : handleKeyDown}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          aria-label={label}
          className="relative block h-[420px] w-full resize-none whitespace-pre bg-transparent p-3 text-slate-100 caret-[#ffd23f] outline-none selection:bg-sky-500/40"
          style={{ lineHeight: `${LINE_HEIGHT}px`, tabSize: 4 }}
        />
      </div>
    </div>
  );
}
