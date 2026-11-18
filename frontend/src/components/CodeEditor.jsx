import { useRef } from 'react';

const INDENT = '    ';

/**
 * Editor Python ringan: textarea + nomor baris.
 * - Tab menyisipkan 4 spasi, Shift+Tab mengurangi indentasi.
 * - Enter mempertahankan indentasi dan menambah 4 spasi setelah baris berakhiran ":".
 * - Baris galat ditandai merah di kolom nomor.
 */
export default function CodeEditor({ value, onChange, errorLine = null, disabled = false, label = 'Editor kode Python' }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = value.split('\n').length;

  // execCommand menjaga riwayat Undo (Ctrl+Z) dan memicu onChange.
  const insertText = (text) => {
    const ta = textareaRef.current;
    if (!document.execCommand?.('insertText', false, text)) {
      const { selectionStart: s, selectionEnd: e } = ta;
      onChange(value.slice(0, s) + text + value.slice(e));
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + text.length;
      });
    }
  };

  const handleKeyDown = (event) => {
    const ta = event.currentTarget;
    const { selectionStart: start } = ta;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        const leading = value.slice(lineStart).match(/^ {1,4}/)?.[0] ?? '';
        if (!leading) return;
        ta.setSelectionRange(lineStart, lineStart + leading.length);
        if (!document.execCommand?.('delete')) {
          onChange(value.slice(0, lineStart) + value.slice(lineStart + leading.length));
        }
      } else {
        insertText(INDENT);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const currentLine = value.slice(lineStart, start);
      let indent = currentLine.match(/^ */)[0];
      if (currentLine.trimEnd().endsWith(':')) indent += INDENT;
      insertText(`\n${indent}`);
    }
  };

  return (
    <div className="flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none overflow-hidden border-r border-slate-800 bg-slate-900 py-3 text-right font-mono text-sm leading-6 text-slate-500"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className={`px-3 ${errorLine === i + 1 ? 'bg-rose-500/20 font-bold text-rose-300' : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        disabled={disabled}
        wrap="off"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="h-80 w-full flex-1 resize-y bg-transparent px-4 py-3 font-mono text-sm leading-6 text-slate-100 caret-emerald-400 outline-none disabled:opacity-60"
      />
    </div>
  );
}
