/**
 * Penerjemah galat Python (stderr Pyodide) menjadi penjelasan ramah siswa SMA,
 * lengkap dengan nomor baris, isi baris yang bermasalah, dan contoh perbaikan.
 * Dipakai di Chapter 3 (Money Tracker).
 */

const BLOCK_START = /^\s*(for|if|elif|else|while)\b/;
const KNOWN_BUILTINS = ['print', 'input', 'int', 'range'];

/**
 * @param {{type: string, message: string, line: number|null}|null} error  dari usePyodideRunner
 * @param {string} code  kode siswa (untuk mengambil isi baris & daftar variabel)
 * @returns {null | {type: string, title: string, line: number|null, lineText: string|null, explanation: string, example: string|null}}
 */
export function formatFriendlyPythonError(error, code = '') {
  if (!error) return null;
  const { type, message = '' } = error;
  const lines = code.split('\n');
  const line = error.line && error.line <= lines.length ? error.line : null;
  const lineText = line ? lines[line - 1] : null;
  const trimmed = lineText?.trim() ?? '';
  const base = { type, line, lineText };

  switch (type) {
    case 'SyntaxError': {
      // Lupa titik dua setelah for / if / elif / else.
      if (/expected ':'/.test(message) || (BLOCK_START.test(trimmed) && !/:\s*(#.*)?$/.test(trimmed))) {
        const keyword = trimmed.match(BLOCK_START)?.[1] ?? 'for/if/else';
        return {
          ...base,
          title: `Lupa tanda titik dua (:) setelah ${keyword}`,
          explanation: `Setiap baris ${keyword} wajib diakhiri tanda titik dua (:). Titik dua memberi tahu Python bahwa baris-baris di bawahnya adalah isi blok ${keyword}.`,
          example: trimmed ? `${trimmed.replace(/\s*$/, '')}:` : 'for i in range(3):',
        };
      }
      if (/unterminated string|EOL while scanning|unterminated triple/.test(message)) {
        return {
          ...base,
          title: 'Tanda kutip belum ditutup',
          explanation: 'Teks harus diapit tanda kutip di awal DAN di akhir. Sepertinya ada tanda kutip pembuka yang belum punya pasangan penutup.',
          example: 'print("Pengeluaran masih sesuai.")',
        };
      }
      if (/was never closed|unmatched|does not match opening parenthesis/.test(message)) {
        return {
          ...base,
          title: 'Tanda kurung belum berpasangan',
          explanation: 'Jumlah kurung buka "(" dan kurung tutup ")" harus sama. Perhatikan int(input(...)) memakai DUA pasang kurung.',
          example: 'uang_awal = int(input("Uang awal: "))',
        };
      }
      if (/Maybe you meant '=='|cannot assign to/.test(message) || (/^\s*(if|elif)\b/.test(trimmed) && /[^=!<>]=[^=]/.test(trimmed))) {
        return {
          ...base,
          title: 'Tanda = dipakai untuk membandingkan',
          explanation: 'Di dalam if, gunakan tanda pembanding seperti >, <, >=, atau ==. Tanda = tunggal hanya untuk mengisi nilai variabel.',
          example: 'if total_pengeluaran > uang_awal:',
        };
      }
      if (/Perhaps you forgot a comma/.test(message)) {
        return {
          ...base,
          title: 'Teks dan variabel belum dipisah koma',
          explanation: 'Di dalam print(), pisahkan teks dan variabel dengan tanda koma.',
          example: 'print("Total:", total_pengeluaran)',
        };
      }
      return {
        ...base,
        title: 'Penulisan kode belum tepat',
        explanation: 'Python tidak bisa membaca baris ini. Periksa tanda titik dua di akhir for/if/else, pasangan tanda kurung dan tanda kutip, serta ejaan perintah (harus huruf kecil).',
        example: null,
      };
    }

    case 'IndentationError':
    case 'TabError': {
      const after = message.match(/after '(\w+)' statement on line (\d+)/);
      if (after || /expected an indented block/.test(message)) {
        const keyword = after?.[1] ?? 'for/if/else';
        return {
          ...base,
          title: `Isi blok ${keyword} belum menjorok ke dalam`,
          explanation: `Baris di dalam ${keyword}${after ? ` (baris ${after[2]})` : ''} wajib menjorok ke dalam. Klik di awal baris lalu tekan tombol Tab sekali (4 spasi).`,
          example: keyword === 'for'
            ? 'for i in range(3):\n    nominal = int(input("Pengeluaran: "))'
            : keyword === 'else'
              ? 'else:\n    print("Pengeluaran masih sesuai.")'
              : 'if total_pengeluaran > uang_awal:\n    print("Pengeluaran melebihi uang awal!")',
        };
      }
      if (/unexpected indent/.test(message)) {
        return {
          ...base,
          title: 'Ada spasi berlebih di awal baris',
          explanation: 'Baris ini menjorok ke dalam padahal bukan isi for, if, atau else. Hapus spasi di awal baris agar sejajar dengan baris di atasnya.',
          example: trimmed || null,
        };
      }
      return {
        ...base,
        title: 'Spasi menjorok ke dalam belum rapi',
        explanation: 'Semua baris di dalam satu blok harus menjorok dengan jumlah spasi yang sama. Gunakan tombol Tab (4 spasi) secara konsisten, jangan campur dengan spasi manual.',
        example: null,
      };
    }

    case 'NameError': {
      const name = message.match(/name '(.+?)' is not defined/)?.[1];
      if (!name) break;
      const lower = name.toLowerCase();
      if (KNOWN_BUILTINS.includes(lower) && name !== lower) {
        return {
          ...base,
          title: `"${name}" harus ditulis huruf kecil`,
          explanation: `Python membedakan huruf besar dan kecil. Perintah yang benar adalah ${lower}(), bukan ${name}().`,
          example: trimmed ? trimmed.replace(name, lower) : `${lower}(...)`,
        };
      }
      const known = definedNames(code);
      const suggestion = closest(name, known);
      return {
        ...base,
        title: `Variabel "${name}" tidak dikenal`,
        explanation: suggestion
          ? `Python tidak menemukan variabel "${name}". Mungkin maksudmu "${suggestion}"? Nama variabel harus sama persis, termasuk huruf kecil dan garis bawah.`
          : `Python tidak menemukan variabel "${name}". Pastikan variabel sudah dibuat (diberi nilai dengan =) SEBELUM dipakai.${known.length ? ` Variabel yang sudah kamu buat: ${known.join(', ')}.` : ''} Jika "${name}" seharusnya teks, apit dengan tanda kutip.`,
        example: suggestion && trimmed ? trimmed.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`), suggestion) : null,
      };
    }

    case 'ValueError': {
      const bad = message.match(/invalid literal for int\(\) with base 10: '(.*)'/)?.[1];
      return {
        ...base,
        title: 'int() hanya bisa membaca angka bulat',
        explanation: bad !== undefined && /^\D/.test(bad)
          ? `int() mencoba mengubah "${bad}" menjadi angka, tetapi itu bukan angka. Pastikan int() membungkus input(...), bukan teks pertanyaannya, dan isi Masukan Uji hanya dengan angka (tanpa titik atau huruf).`
          : 'Pastikan angka dibaca dengan int(input(...)) dan kotak Masukan Uji hanya berisi angka bulat tanpa titik, koma, atau huruf.',
        example: 'nominal = int(input("Pengeluaran: "))',
      };
    }

    case 'TypeError':
      if (/can only concatenate|unsupported operand|can't multiply/.test(message)) {
        return {
          ...base,
          title: 'Teks tidak bisa dihitung seperti angka',
          explanation: 'Ada data yang masih berupa teks (str). Hasil input() selalu teks, jadi bungkus dengan int() sebelum dijumlahkan atau dikurangi.',
          example: 'nominal = int(input("Pengeluaran: "))\ntotal_pengeluaran = total_pengeluaran + nominal',
        };
      }
      return {
        ...base,
        title: 'Jenis data tidak cocok',
        explanation: 'Periksa apakah kamu menghitung angka dengan teks. Gunakan int() untuk mengubah masukan menjadi angka.',
        example: null,
      };

    case 'EOFError':
      return {
        ...base,
        title: 'Program meminta input terlalu banyak',
        explanation: 'Money Tracker hanya butuh 4 input: 1 uang awal (di luar perulangan) dan 3 pengeluaran (di dalam for i in range(3)). Periksa apakah ada input() berlebih atau angka range() bukan 3.',
        example: null,
      };

    case 'TimeoutError':
      return {
        ...base,
        title: 'Program berjalan terlalu lama',
        explanation: 'Program tidak selesai dalam 5 detik. Gunakan for i in range(3): untuk mengulang tepat 3 kali.',
        example: 'for i in range(3):',
      };

    case 'LoadError':
      return { ...base, title: 'Mesin Python belum siap', explanation: 'Muat ulang halaman. Jika masih gagal, hubungi kakak fasilitator.', example: null };

    default:
      break;
  }

  return {
    ...base,
    title: `Program berhenti karena ${type || 'galat'}`,
    explanation: 'Ada perintah yang tidak bisa dijalankan. Baca pesan merah di Konsol Output dan periksa baris yang ditunjuk.',
    example: null,
  };
}

/** Nama variabel yang dibuat siswa: target assignment dan variabel perulangan for. */
export function definedNames(code) {
  const names = new Set();
  for (const raw of code.split('\n')) {
    const line = raw.replace(/#.*$/, '');
    const assign = line.match(/^\s*([A-Za-z_]\w*)\s*(?:[+\-*/%]?=)(?!=)/);
    if (assign) names.add(assign[1]);
    const loop = line.match(/^\s*for\s+([A-Za-z_]\w*)\s+in\b/);
    if (loop) names.add(loop[1]);
  }
  return [...names];
}

function closest(name, candidates) {
  let best = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const d = distance(name.toLowerCase(), c.toLowerCase());
    if (d < bestScore) {
      best = c;
      bestScore = d;
    }
  }
  return best && bestScore <= Math.max(2, Math.floor(name.length / 3)) ? best : null;
}

function distance(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
