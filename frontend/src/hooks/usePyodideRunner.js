import { useCallback, useEffect, useRef, useState } from 'react';

// Query versi memaksa browser/Cloudflare mengambil worker terbaru, bukan salinan cache.
const WORKER_URL = '/pyodide-worker.js?v=3';
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Menjalankan kode Python siswa di Web Worker Pyodide (lokal, tanpa CDN).
 *
 * status: 'loading' | 'ready' | 'running' | 'error'
 *
 * run(code, inputs)          → satu uji, nilai `inputs` disuntikkan ke input() berurutan
 * runTests(code, testCases)  → beberapa uji berurutan, testCases = [["6000","10000","50"], ...]
 *
 * Setiap hasil: { inputs, stdout, transcript, error: {type,message,line,traceback}|null, unusedInputs }
 * Jika program berjalan lebih dari `timeoutMs`, worker dihentikan dan dibuat ulang.
 */
export function usePyodideRunner({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const workerRef = useRef(null);
  const pendingRef = useRef(new Map());
  const nextIdRef = useRef(1);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);

  const spawn = useCallback(() => {
    workerRef.current?.terminate();
    setStatus('loading');
    setLoadError(null);

    const worker = new Worker(WORKER_URL);
    worker.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'ready') {
        setStatus('ready');
      } else if (msg.type === 'load-error') {
        setStatus('error');
        setLoadError('Mesin Python gagal dimuat. Pastikan folder /pyodide tersedia di server lab.');
      } else if (msg.type === 'result') {
        const pending = pendingRef.current.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          pendingRef.current.delete(msg.id);
          pending.resolve(msg);
        }
      }
    };
    worker.onerror = () => {
      setStatus('error');
      setLoadError('Mesin Python gagal dimuat. Pastikan berkas /pyodide-worker.js dan folder /pyodide tersedia.');
    };
    workerRef.current = worker;
  }, []);

  useEffect(() => {
    spawn();
    const pending = pendingRef.current;
    return () => {
      workerRef.current?.terminate();
      pending.forEach((p) => clearTimeout(p.timer));
      pending.clear();
    };
  }, [spawn]);

  const run = useCallback(
    (code, inputs = []) =>
      new Promise((resolve) => {
        const worker = workerRef.current;
        const id = nextIdRef.current++;
        const cleanInputs = inputs.map((v) => String(v ?? '').trim());

        const timer = setTimeout(() => {
          pendingRef.current.delete(id);
          // Program macet (mis. perulangan tanpa akhir): matikan worker lalu siapkan yang baru.
          spawn();
          resolve({
            inputs: cleanInputs,
            stdout: '',
            transcript: [],
            unusedInputs: 0,
            error: {
              type: 'TimeoutError',
              message: `program berjalan lebih dari ${timeoutMs / 1000} detik`,
              line: null,
              traceback: '',
            },
          });
        }, timeoutMs);

        pendingRef.current.set(id, {
          timer,
          resolve: (msg) => resolve({ ...msg, inputs: cleanInputs }),
        });
        worker.postMessage({ type: 'run', id, code, inputs: cleanInputs });
      }),
    [spawn, timeoutMs],
  );

  const runTests = useCallback(
    async (code, testCases) => {
      setStatus('running');
      const results = [];
      try {
        for (const inputs of testCases) {
          const result = await run(code, inputs);
          results.push(result);
          // Worker sedang dibuat ulang setelah macet; hentikan sisa uji.
          if (result.error?.type === 'TimeoutError') break;
        }
      } finally {
        setStatus((s) => (s === 'running' ? 'ready' : s));
      }
      return results;
    },
    [run],
  );

  return { status, loadError, isReady: status === 'ready', run, runTests, restart: spawn };
}
