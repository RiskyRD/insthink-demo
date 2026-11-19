# Aturan Utama Proyek INSTHINK

- **Stack Teknologi:** Laravel 11, Laravel Sanctum, Laravel Reverb, MySQL, React 18 dengan Vite, Tailwind CSS, dan Pyodide lokal.
- **Lingkungan Offline:** Dilarang memuat pustaka, font, ikon, atau skrip dari CDN eksternal. Semua aset dan berkas Pyodide wajib dimuat dari direktori lokal proyek.
- **Batasan Kurikulum (sesuai materi presentasi Baksos TI):** Materi Python di seluruh tahap (Materi, Quiz, Chapter 1, Chapter 3) hanya mencakup:
  - variabel (tipe data `int` dan `str`), `input()`, `int()`, `print()`;
  - operator matematika `+`, `-`, `*`, `/`, `%`;
  - percabangan `if`-`else` (boleh `elif`);
  - perulangan `for i in range(...)`.

  Dilarang menggunakan `while`, fungsi `def`, list, dictionary, atau materi di luar daftar di atas.
- **Bahasa Antarmuka:** Seluruh teks layar pengguna, narasi cerita usaha desa, dan pesan galat wajib menggunakan bahasa Indonesia yang baku dan ramah bagi siswa SMA.

## Alur Navigasi Aplikasi

Aplikasi terdiri dari tiga langkah belajar berurutan ditambah satu minigame bonus. Tahap `menu`, `materi`, `quiz`, dan `tracker` murni dikelola di sisi klien (state/route React), sehingga tidak menambah endpoint, kolom database, atau event Reverb. Hanya tahap `game` yang memakai ruangan co-op dan backend.

| Tahap | Isi | Backend |
| --- | --- | --- |
| `menu` | Main Menu: 1. Kenalan Blok Python, 2. Pemanasan (Quiz), 3. Praktik Money Tracker, dan kartu terpisah **Bonus: Minigame Kedai** (co-op). | Tidak ada |
| `materi` | Modul pendahuluan interaktif yang mengilustrasikan blok dasar Python sesuai Batasan Kurikulum. Contoh kode boleh dijalankan dengan `usePyodideRunner`. | Tidak ada |
| `quiz` | Quiz kilat: tebak blok dan logika cepat sebelum permainan utama (`QuizMiniGame.jsx`). | Tidak ada |
| `tracker` | Langkah 3: praktik mandiri Money Tracker ala online compiler (`MoneyTrackerPractice.jsx`) dengan instruksi, hint bertingkat, masukan uji, dan cek jawaban lokal (uji tersembunyi). Progres di `localStorage`. | Tidak ada |
| `game` | **Bonus** — sesi co-op dua pemain: buat/gabung ruangan (pilih peran & skin avatar) → Prolog → Chapter 1 (Rakit Blok Kode) → Bab Bonus (Simulasi Kedai Live) → Chapter 3 (Coding Money Tracker). | API + Reverb (lihat di bawah) |

- **Navigasi cepat di header:** Header menyediakan tombol untuk berpindah tahap (Menu, Materi, Quiz, Game), agar fasilitator atau siswa bisa melompat jika diperlukan.
- **Fase ruangan tidak berubah:** Navigasi cepat ke luar tahap `game` tidak boleh mengubah `rooms.phase` atau memanggil endpoint ruangan. Saat kembali ke `game`, klien memuat ulang state ruangan dari server.
- **Tetap terhubung:** Keluar dari ruangan tetap hanya lewat tombol "Keluar" yang sudah ada.

## Mode Fasilitator (`/admin`)

Dashboard panitia (`AdminMonitorDashboard.jsx`) untuk memantau semua tim. Dibuka lewat rute `/admin` atau tombol kecil "Mode Fasilitator" di Main Menu.

- **PIN:** endpoint `/api/admin/*` wajib header `X-Admin-Passcode` yang cocok dengan `ADMIN_PASSCODE` di `.env` (kosong → 503). Tebakan salah dibatasi 10×/menit per IP. PIN valid disimpan di `sessionStorage`.
- **Endpoint:** `GET /api/admin/rooms` (ringkasan semua ruangan, `failed_attempts`, `last_activity_at`, `server_time`), `DELETE /api/admin/rooms/{code}` (hapus ruangan beserta pemain & log).
- **Log uji gagal:** `POST /api/rooms/{code}/chapter1-attempt` (field `code`, `output`) mencatat `mission_logs.is_passed = false`. Hanya untuk dashboard; tidak mengubah fase atau state kedai.
- **Realtime:** channel publik `admin.monitor`, event `admin.room_changed`. Payload sengaja tanpa data siswa; dashboard mengambil data lengkap lewat API ber-PIN. Polling cadangan 5 detik saat Reverb putus.
- **Butuh Pendampingan:** gagal uji kode ≥ 4 kali atau tidak ada aktivitas > 4 menit pada fase selain `finished` (ambang di `config/insthink.php`).

## Universal Hint System

Setiap tahap (Materi, Quiz, Praktik Money Tracker, Chapter 1, Bab Bonus, Chapter 3) wajib menyediakan tombol **"Butuh Bantuan?"** dengan hint bertingkat, agar siswa tidak buntu terlalu lama:

1. **Hint 1 — Arah:** petunjuk konsep umum (mis. "Ingat, `input()` selalu menghasilkan teks").
2. **Hint 2 — Langkah:** langkah konkret atau blok yang perlu dipakai.
3. **Hint 3 — Contoh:** contoh potongan kode atau jawaban yang hampir lengkap.

Ketentuan:
- Hint dibuka satu per satu secara berurutan.
- Hint disampaikan lewat balon percakapan karakter.
- Hint hanya berupa konten di sisi klien: tidak dikirim ke server dan tidak mengubah payload `chapter1-complete` maupun `chapter3-complete`.
- Di Bab Bonus, hint mengikuti isolasi informasi. Hint Kasir tidak boleh membocorkan harga kulakan, dan hint Stok Gudang tidak boleh membocorkan resep atau harga jual.

## Konsep Permainan: "Kedai Kopi & Camilan Desa"

Dua siswa bekerja sama menjalankan kedai desa milik Bu Ratna. Setiap ruangan berisi tepat 2 pemain dengan peran berbeda:

| Role (`room_players.role`) | Nama Tampilan | Tanggung Jawab |
| --- | --- | --- |
| `cashier` | Kasir | Melayani pesanan pelanggan. Melihat menu, harga jual, dan resep. |
| `warehouse` | Stok Gudang | Menjaga stok bahan dan kulakan ke pemasok. Melihat harga kulakan dan batas gudang. |

**Skin avatar:** saat membuat/bergabung ke ruangan, setiap pemain memilih `avatar_skin` (`male` / `female`, default `male`) yang disimpan di `room_players.avatar_skin`. Skin hanya mengubah tampilan karakter (busana Bali laki-laki: udeng, kamen, saput; perempuan: kebaya, senteng, kamen) dan tidak memengaruhi peran. Skin kedua pemain ikut dikirim di `room.players[]` dan `me`.

Isolasi informasi: Kasir **tidak** melihat harga kulakan, Stok Gudang **tidak** melihat resep dan harga jual. Keduanya melihat uang kas bersama, stok gudang, jumlah pelanggan, dan fase. Data per peran hanya keluar lewat `App\Game\RoleProjector`; harga dan resep bersumber dari `App\Game\ShopCatalog` (klien tidak pernah mengirim harga).

### Fase Permainan (`rooms.phase`)

Urutan: `prolog` → `chapter1` → `bonus` → `chapter3` → `finished`.

1. **`prolog`**: cerita pembuka. Setiap pemain menekan "Siap" (`POST /api/rooms/{code}/prolog-ready`). Jika kedua pemain siap → `chapter1`.
2. **`chapter1`** (Rakit Blok Kode): latihan Python dasar dengan Block Coding dan Pyodide (sesuai Batasan Kurikulum). Setiap pemain mengirim log kodenya (`POST /api/rooms/{code}/chapter1-complete`). Jika keduanya selesai → `bonus`.
3. **`bonus`** (Bab Bonus: Simulasi Kedai Live): Kasir melayani pesanan (`POST /api/rooms/{code}/serve-order`, field `menu_key`); Stok Gudang kulakan bahan (`POST /api/rooms/{code}/restock`, field `item_key` dan `qty` kelipatan 3 unit, maks 8 unit per bahan). Bab Bonus adalah tahap bonus untuk menguji sistem Kasir dan Stok Gudang yang dirakit di Chapter 1.
   - Saat `shared_money >= target_money` atau semua gelombang pelanggan habis, fase **tetap** `bonus`: kedai tutup (serve-order/restock ditolak 409 setelah target tercapai) dan kedua pemain melihat layar ringkasan Bab Bonus.
   - Pindah ke `chapter3` hanya lewat `POST /api/rooms/{code}/bonus-complete` (idempoten), dari tombol "Lanjut ke Bab 3: Coding Money Tracker" di layar ringkasan atau tombol "Lanjut ke Bab 3 Sekarang" (dengan konfirmasi) saat waktu kelas hampir habis.
4. **`chapter3`** (Coding Money Tracker, `Chapter3MoneyTracker.jsx`): editor Python ala online compiler (Pyodide), panel Masukan Uji 4 angka, dan 2 uji tersembunyi (pengeluaran sesuai modal / melebihi modal). Uji yang gagal dicatat lewat `POST /api/rooms/{code}/chapter3-attempt` (untuk dashboard fasilitator). Kode yang lulus dikirim lewat `POST /api/rooms/{code}/chapter3-complete` (field `code`, `output`, `attempt_count`, `duration_seconds`); server menyimpan log ke `mission_logs` (`mission_number = 3`) dan menandai `room_players.is_chapter3_done`. Jika keduanya selesai → `finished`.
5. **`finished`**: semua bab selesai; `status` ruangan menjadi `completed`. Layar kelulusan (`FinalVictoryScreen.jsx`) menampilkan `ending.score` dan Papan Peringkat.

**Skor tim** (`App\Game\ScoreCalculator`, maksimal 2000): kelulusan 1000 + Bab Bonus (laba kas ÷ 100, maks 700) + ketelitian coding (300 − 20 × (uji gagal Bab 1 + percobaan tambahan Bab 3), min 0). Peringkat: skor tertinggi, lalu durasi tersingkat. `GET /api/leaderboard` (token pemain) mengembalikan tim yang lulus dalam 24 jam terakhir tanpa kode ruangan.

State awal kedai: kas Rp50.000, target Rp120.000, stok `{ kopi: 3, susu: 3, gula_aren: 2, pisang: 3, cokelat: 2, kemasan: 3 }`.

### Event Reverb

- Channel privat: `room.{code}.cashier` dan `room.{code}.warehouse`; channel presence `room.{code}.presence` untuk whisper (ping antarpemain).
- `room.updated`: pemain bergabung / menandai siap / selesai Chapter 1 / selesai Chapter 3.
- `game.phase_changed`: fase berganti (`previous_phase`, `phase`, `room`, `shop`).
- `shop.updated`: kas/stok berubah di Bab Bonus (`shop`, `room`, `last_action`).

Semua endpoint yang mengubah state memakai `Cache::lock("room:{id}:state")` ditambah `lockForUpdate()`, dan broadcast dikirim setelah transaksi tersimpan.

## Standar Visual & Interaktivitas Game (2D Cartoon Style)

1. **Gaya Visual:** Terapkan estetika 2D Casual Cartoon Game dengan palet hangat Bali: emas kunyit, merah terakota, hijau daun, dan krem kertas (cokelat kayu sebagai aksen). Pertahankan `VillageBackdrop.jsx` dan `useGameAudio.js` yang sudah ada.
   - Kartu memakai border tebal `border-2 border-slate-800` dan bayangan tegas `shadow-[4px_4px_0px_#1e293b]`.
   - Tombol bersifat taktil: membal (bounce/squish) dan bayangan mengecil saat ditekan.
2. **Karakter & Ekspresi:** Setiap tahap wajib menampilkan karakter kartun SVG lokal: Bu Ratna (pemilik kedai), avatar Kasir, dan avatar Stok Gudang.
   - **Identitas visual Bali:** Semua karakter wajib memakai busana dan elemen khas Bali, misalnya:
     - kebaya dengan selendang/senteng dan kamen untuk perempuan;
     - udeng, baju safari/kemeja adat, kamen, dan saput untuk laki-laki;
     - aksesori seperti bunga kamboja atau canang sari.
   - Karakter digambar dengan garis `border-2 border-slate-800` (stroke tebal `#1e293b` pada SVG) dan palet di atas.
   - Ornamen pendukung (motif patra, gapura candi bentar, penjor) boleh dipakai sebagai dekorasi SVG lokal.
   - Karakter berbicara lewat balon percakapan (speech bubble).
   - Ekspresi berubah otomatis sesuai hasil eksekusi kode atau aksi kedai: `idle`, `thinking`, `happy`, `shocked`.
3. **Interaktivitas Dua Arah:** Hindari teks statis pasif.
   - Kedua peran wajib punya elemen interaktif untuk memicu sinyal/ping visual ke layar pasangannya lewat Reverb whisper (mis. Kasir: "Stok kopi habis!", Stok Gudang: "Bahan sudah datang!").
   - Kasir menguji alur kedai lewat simulasi pesanan pelanggan desa, bukan sekadar form input mentah.
4. **Audio Offline:** Efek suara (klik, mesin kasir, berhasil, gagal) dibuat dengan Web Audio API (oscillator sintesis). Dilarang mengimpor berkas audio eksternal.
5. **Kontrak yang Tidak Boleh Diubah:** Tahap baru (Menu, Materi, Quiz), hint, dan tampilan baru tidak boleh mengubah:
   - kontrak API Back-End (endpoint, payload, event Reverb di atas);
   - logika eksekusi Pyodide (`usePyodideRunner`, `pyodide-worker.js`, termasuk shim pemuatan WASM dan query versi `?v=N` pada URL worker).

   Semua perubahan dilakukan di lapisan komponen React saja. Jika `pyodide-worker.js` terpaksa diubah, naikkan angka `?v=N` di `usePyodideRunner.js`. Cloudflare menyimpan cache worker dalam waktu sangat lama.
