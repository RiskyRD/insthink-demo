/* eslint-disable no-undef */
/**
 * Web Worker Pyodide INSTHINK.
 * Berjalan terpisah dari thread UI, jadi browser tidak membeku saat kode dieksekusi.
 *
 * Pesan masuk : { type: 'run', id, code, inputs: string[] }
 * Pesan keluar: { type: 'ready' } | { type: 'load-error', message }
 *               { type: 'result', id, stdout, transcript, error, unusedInputs }
 */
// Server lab sering mengirim .wasm tanpa header "application/wasm", sehingga
// WebAssembly.instantiateStreaming ditolak browser. Pyodide 0.26 tidak punya
// fallback, jadi kita ganti dengan versi ArrayBuffer yang tidak peduli MIME type.
(() => {
  const toBytes = async (source) => {
    const response = await source;
    if (!response.ok) {
      throw new Error(`Berkas mesin Python tidak ditemukan (HTTP ${response.status}): ${response.url}`);
    }
    const bytes = await response.arrayBuffer();
    const head = new Uint8Array(bytes, 0, 4);
    if (head[0] !== 0x00 || head[1] !== 0x61 || head[2] !== 0x73 || head[3] !== 0x6d) {
      throw new Error(`Server tidak mengirim berkas WebAssembly yang valid: ${response.url}`);
    }
    return bytes;
  };
  WebAssembly.instantiateStreaming = async (source, imports) =>
    WebAssembly.instantiate(await toBytes(source), imports);
  WebAssembly.compileStreaming = async (source) => WebAssembly.compile(await toBytes(source));
})();

importScripts('/pyodide/pyodide.js');

let pyodide = null;
let inputQueue = [];
let stdoutLines = [];
let transcript = [];

const ready = (async () => {
  pyodide = await loadPyodide({ indexURL: '/pyodide/' });

  pyodide.setStdout({
    batched: (line) => {
      stdoutLines.push(line);
      transcript.push({ kind: 'out', text: line });
    },
  });
  pyodide.setStderr({ batched: (line) => transcript.push({ kind: 'err', text: line }) });

  // input() Python mengambil nilai dari antrean ini, bukan dari prompt browser.
  // Teks prompt dicatat di transcript (untuk ditampilkan) tetapi TIDAK masuk stdout,
  // sehingga stdout yang dikirim ke server hanya berisi hasil print().
  pyodide.registerJsModule('insthink_io', {
    next_input(prompt) {
      const value = inputQueue.shift();
      transcript.push({ kind: 'input', prompt: String(prompt ?? ''), value: value ?? null });
      return value === undefined ? undefined : String(value);
    },
  });

  pyodide.runPython(`
import builtins
import insthink_io

def _insthink_input(prompt=""):
    value = insthink_io.next_input(str(prompt))
    if value is None:
        raise EOFError("data masukan untuk uji ini sudah habis")
    return value

builtins.input = _insthink_input
`);

  self.postMessage({ type: 'ready', version: pyodide.version });
})().catch((err) => {
  self.postMessage({ type: 'load-error', message: String(err?.message ?? err) });
});

function parsePythonError(raw) {
  const text = String(raw).trim();
  const lines = text.split('\n');

  let type = 'Error';
  let message = lines.at(-1) ?? '';
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^([A-Za-z_][\w.]*?(?:Error|Exception|Warning)):?\s?(.*)$/);
    if (m) {
      type = m[1].split('.').pop();
      message = m[2];
      break;
    }
  }

  // Ambil nomor baris dari frame "<exec>" PERTAMA = kode siswa. Frame "<exec>"
  // berikutnya (jika ada) berasal dari fungsi input() pengganti milik worker.
  const firstHit = text.match(/File "<exec>", line (\d+)/);
  const line = firstHit ? Number(firstHit[1]) : null;

  const start = lines.findIndex((l) => l.includes('File "<exec>"'));
  const traceback = (start >= 0 ? lines.slice(start) : lines.slice(-3)).join('\n');

  return { type, message, line, traceback };
}

self.onmessage = async (event) => {
  const { type, id, code, inputs } = event.data ?? {};
  if (type !== 'run') return;

  await ready;
  if (!pyodide) {
    self.postMessage({
      type: 'result', id, stdout: '', transcript: [], unusedInputs: 0,
      error: { type: 'LoadError', message: 'Mesin Python gagal dimuat.', line: null, traceback: '' },
    });
    return;
  }

  inputQueue = (inputs ?? []).map(String);
  stdoutLines = [];
  transcript = [];
  let error = null;

  // Namespace baru setiap uji agar variabel dari uji sebelumnya tidak terbawa.
  const namespace = pyodide.globals.get('dict')();
  try {
    await pyodide.runPythonAsync(code, { globals: namespace });
  } catch (err) {
    error = parsePythonError(err?.message ?? err);
  } finally {
    try {
      pyodide.runPython('import sys\nsys.stdout.flush()\nsys.stderr.flush()');
    } catch {
      /* abaikan */
    }
    namespace.destroy();
  }

  self.postMessage({
    type: 'result',
    id,
    stdout: stdoutLines.join('\n'),
    transcript,
    error,
    unusedInputs: inputQueue.length,
  });
};
