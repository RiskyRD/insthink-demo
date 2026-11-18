/**
 * Menerjemahkan galat Python menjadi petunjuk ramah siswa SMA.
 * Dipakai langsung setelah kode dijalankan (sebelum server memberi penilaian).
 *
 * @param {{type: string, message: string, line: number|null}} error
 * @returns {{title: string, hint: string}}
 */
export function translatePythonError(error) {
  if (!error) return null;
  const { type, message = '' } = error;
  const at = error.line ? ` di baris ${error.line}` : '';

  switch (type) {
    case 'SyntaxError':
    case 'IndentationError':
    case 'TabError':
      return { title: `Penulisan kode belum tepat${at}`, hint: syntaxHint(type, message) };

    case 'NameError': {
      const name = message.match(/name '(.+?)' is not defined/)?.[1];
      return {
        title: `Nama tidak dikenali${at}`,
        hint: name
          ? `Python tidak mengenal "${name}". Pastikan nama variabel sama persis dengan yang disebutkan Konsultan Bisnis (huruf kecil dan garis bawah), dan variabel sudah diberi nilai sebelum dipakai. Jika "${name}" seharusnya teks, apit dengan tanda kutip.`
          : 'Pastikan nama variabel sama persis dengan yang disebutkan oleh Konsultan Bisnis.',
      };
    }

    case 'ValueError': {
      const bad = message.match(/invalid literal for int\(\) with base 10: '(.*)'/)?.[1];
      return {
        title: `Masukan bukan angka bulat${at}`,
        hint:
          bad !== undefined
            ? `Data "${bad}" tidak bisa diubah menjadi angka bulat. Isi data uji dengan angka saja, tanpa titik, koma, atau huruf (contoh: 15000).`
            : 'Pastikan masukan dari pengguna sudah diubah menjadi angka bulat menggunakan int().',
      };
    }

    case 'TypeError':
      if (/can't multiply sequence|unsupported operand|can only concatenate/.test(message)) {
        return {
          title: `Data masih berupa teks${at}`,
          hint: 'Ada data yang masih berupa teks sehingga tidak bisa dihitung. Bungkus input() dengan int(), contoh: harga = int(input("Harga: ")). Untuk menampilkan teks dan angka bersama, pisahkan dengan koma di dalam print().',
        };
      }
      return { title: `Jenis data tidak cocok${at}`, hint: 'Periksa apakah kamu menghitung angka dengan teks. Gunakan int() untuk mengubah masukan menjadi angka.' };

    case 'EOFError':
      return {
        title: 'Data masukan uji kurang',
        hint: 'Program meminta data lebih banyak daripada yang kamu isi pada uji. Tanyakan kepada Konsultan ada berapa data masukan, lalu lengkapi kolom uji.',
      };

    case 'ZeroDivisionError':
      return { title: `Pembagian dengan nol${at}`, hint: 'Ada angka yang dibagi nol. Periksa lagi rumus dan data ujinya.' };

    case 'TimeoutError':
      return {
        title: 'Program berjalan terlalu lama',
        hint: 'Program tidak selesai dalam batas waktu. Chapter 1 tidak memakai perulangan, jadi hapus for/while dari kodemu.',
      };

    case 'LoadError':
      return { title: 'Mesin Python belum siap', hint: 'Muat ulang halaman. Jika masih gagal, hubungi guru atau pengelola lab.' };

    default:
      return {
        title: `Program berhenti${at}`,
        hint: 'Program berhenti karena ada perintah yang tidak bisa dijalankan. Baca pesan merah di terminal dan diskusikan dengan Konsultan.',
      };
  }
}

function syntaxHint(type, message) {
  if (/expected ':'/.test(message)) return 'Tambahkan tanda titik dua (:) di akhir baris if, elif, atau else.';
  if (/expected an indented block/.test(message)) return 'Baris setelah if/elif/else harus menjorok ke dalam 4 spasi.';
  if (/unexpected indent|unindent does not match/.test(message) || type !== 'SyntaxError') {
    return 'Spasi menjorok ke dalam belum rapi. Baris biasa dimulai tanpa spasi, dan isi if/elif/else menjorok tepat 4 spasi.';
  }
  if (/was never closed|unmatched|closing parenthesis/.test(message)) return 'Ada tanda kurung yang belum berpasangan. Hitung lagi jumlah "(" dan ")" pada baris itu.';
  if (/unterminated string|EOL while scanning/.test(message)) return 'Ada tanda kutip yang belum ditutup. Teks harus diapit tanda kutip di awal dan akhir.';
  if (/'=' |cannot assign|Maybe you meant '=='/.test(message)) return 'Untuk membandingkan gunakan == atau >=, sedangkan = hanya untuk mengisi variabel.';
  return 'Periksa tanda titik dua di akhir baris if/elif/else, pasangan tanda kurung, atau spasi menjorok ke dalam.';
}
