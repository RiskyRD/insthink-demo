<?php

namespace App\Game;

use InvalidArgumentException;

/**
 * Katalog Misi Chapter 1 "Merintis Usaha Agribisnis Desa".
 *
 * Seluruh isi kelas ini RAHASIA dari sisi server. Jangan pernah mengembalikan
 * array misi secara utuh ke klien — selalu lewat RoleProjector.
 *
 * Batas kurikulum: variabel, int(input()), operator * dan -, if-elif-else, print().
 */
class MissionCatalog
{
    /** Batas nilai masukan agar hitungan PHP tetap presisi (tidak meluap). */
    public const MAX_ABS_INPUT = 1_000_000_000;

    private const INPUTS_BASE = [
        ['name' => 'biaya_per_bungkus', 'description' => 'Biaya membuat 1 bungkus keripik (rupiah)'],
        ['name' => 'harga_jual', 'description' => 'Harga jual 1 bungkus keripik (rupiah)'],
        ['name' => 'jumlah_bungkus', 'description' => 'Jumlah bungkus yang diproduksi dan terjual'],
    ];

    public static function exists(int $number): bool
    {
        return $number >= 1 && $number <= 3;
    }

    public static function get(int $number): array
    {
        return match ($number) {
            1 => self::mission1(),
            2 => self::mission2(),
            3 => self::mission3(),
            default => throw new InvalidArgumentException("Misi {$number} tidak tersedia."),
        };
    }

    // ------------------------------------------------------------------
    // MISI 1 — Pendataan Modal dan Omzet
    // ------------------------------------------------------------------
    private static function mission1(): array
    {
        return [
            'number' => 1,
            'title' => 'Pendataan Modal dan Omzet',
            'inputs' => self::INPUTS_BASE,
            'computed_variables' => [
                ['name' => 'modal', 'description' => 'Total biaya produksi'],
                ['name' => 'omzet', 'description' => 'Total uang hasil penjualan'],
            ],
            'min_runs' => 1,
            'branches' => null,

            'consultant' => [
                'narrative' => 'Kelompok Tani Sumber Rejeki di Desa Sukamaju mulai mengolah pisang hasil panen menjadi keripik pisang kemasan. '
                    .'Ketua kelompok, Bu Ratna, ingin tahu berapa modal yang dikeluarkan dan berapa omzet yang didapat setiap kali produksi. '
                    .'Kamu memegang catatan aturan usahanya. Jelaskan aturan ini kepada Teknisi dengan jelas agar programnya benar.',
                'rules' => [
                    'Modal dihitung dari biaya membuat 1 bungkus dikali jumlah bungkus.',
                    'Omzet dihitung dari harga jual 1 bungkus dikali jumlah bungkus. Semua bungkus dianggap habis terjual.',
                    'Program menampilkan modal lebih dulu, lalu omzet, masing-masing di baris sendiri.',
                ],
                'formula_steps' => [
                    'modal = biaya_per_bungkus × jumlah_bungkus',
                    'omzet = harga_jual × jumlah_bungkus',
                ],
                'output_order' => ['modal', 'omzet'],
                'decision_table' => null,
                'sample_cases' => [
                    ['inputs' => [6000, 10000, 50], 'expected' => ['300000', '500000']],
                ],
            ],

            'technician' => [
                'narrative' => 'Bu Ratna membutuhkan program pencatat modal dan omzet produksi keripik pisang. '
                    .'Konsultan Bisnis memegang aturan hitungannya. Tanyakan nama variabel, urutan data masukan, dan cara menghitungnya.',
                'skeleton' => <<<'PY'
# Misi 1: Pendataan Modal dan Omzet
# Tanyakan kepada Konsultan: nama variabel, urutan masukan, dan rumusnya.

# Langkah 1: baca data masukan sebagai angka bulat
nama_variabel_1 = int(input("Masukkan ...: "))

# Langkah 2: hitung hasilnya
hasil_pertama = ...

# Langkah 3: tampilkan hasil sesuai urutan dari Konsultan
print(hasil_pertama)
PY,
                'syntax_tips' => [
                    'Gunakan int(input("...")) agar data yang diketik berubah menjadi angka bulat.',
                    'Tanda perkalian di Python ditulis dengan bintang: *',
                    'Setiap print() menampilkan satu baris. Tulis print(nama_variabel) tanpa tanda kutip agar yang tampil adalah nilainya.',
                ],
            ],

            'expected' => function (array $n): array {
                [$biaya, $harga, $jumlah] = $n;

                return [(string) ($biaya * $jumlah), (string) ($harga * $jumlah)];
            },
        ];
    }

    // ------------------------------------------------------------------
    // MISI 2 — Menghitung Laba Bersih
    // ------------------------------------------------------------------
    private static function mission2(): array
    {
        return [
            'number' => 2,
            'title' => 'Menghitung Laba Bersih',
            'inputs' => [
                ...self::INPUTS_BASE,
                ['name' => 'biaya_operasional', 'description' => 'Biaya gas, listrik, dan sewa alat selama produksi (rupiah)'],
            ],
            'computed_variables' => [
                ['name' => 'modal', 'description' => 'Total biaya bahan produksi'],
                ['name' => 'omzet', 'description' => 'Total uang hasil penjualan'],
                ['name' => 'laba_bersih', 'description' => 'Keuntungan setelah semua biaya dikurangi'],
            ],
            'min_runs' => 1,
            'branches' => null,

            'consultant' => [
                'narrative' => 'Setelah sebulan berjualan, Bu Ratna sadar ada biaya lain selain bahan baku: gas untuk menggoreng, listrik, dan sewa mesin pemotong. '
                    .'Ia ingin tahu laba bersih yang benar-benar didapat kelompok tani. Bantu Teknisi menyusun hitungan laba bersih.',
                'rules' => [
                    'Modal dan omzet dihitung sama seperti Misi 1.',
                    'Laba bersih adalah omzet dikurangi modal, lalu dikurangi biaya operasional.',
                    'Laba bersih boleh bernilai negatif. Artinya usaha sedang rugi.',
                    'Program hanya menampilkan laba bersih.',
                ],
                'formula_steps' => [
                    'modal = biaya_per_bungkus × jumlah_bungkus',
                    'omzet = harga_jual × jumlah_bungkus',
                    'laba_bersih = omzet − modal − biaya_operasional',
                ],
                'output_order' => ['laba_bersih'],
                'decision_table' => null,
                'sample_cases' => [
                    ['inputs' => [6000, 10000, 200, 250000], 'expected' => ['550000']],
                    ['inputs' => [6000, 10000, 50, 300000], 'expected' => ['-100000']],
                ],
            ],

            'technician' => [
                'narrative' => 'Bu Ratna kini ingin mengetahui laba bersih usaha keripik pisang. Ada satu data masukan tambahan. '
                    .'Tanyakan kepada Konsultan data apa saja yang dibutuhkan dan bagaimana cara menghitung labanya.',
                'skeleton' => <<<'PY'
# Misi 2: Menghitung Laba Bersih
# Tanyakan kepada Konsultan: ada berapa data masukan dan bagaimana rumusnya.

# Langkah 1: baca semua data masukan sebagai angka bulat
nama_variabel_1 = int(input("Masukkan ...: "))

# Langkah 2: hitung nilai antara terlebih dahulu
nilai_antara = ...

# Langkah 3: hitung hasil akhir memakai tanda - (kurang)
hasil_akhir = ...

print(hasil_akhir)
PY,
                'syntax_tips' => [
                    'Tanda pengurangan ditulis -, dan perkalian ditulis *.',
                    'Kamu boleh memakai variabel hasil hitungan sebelumnya di baris berikutnya.',
                    'Python menghitung dari kiri ke kanan untuk tanda kurang: a - b - c sama dengan (a - b) - c.',
                ],
            ],

            'expected' => function (array $n): array {
                [$biaya, $harga, $jumlah, $operasional] = $n;

                return [(string) (($harga * $jumlah) - ($biaya * $jumlah) - $operasional)];
            },
        ];
    }

    // ------------------------------------------------------------------
    // MISI 3 — Kelayakan Ekspansi Usaha
    // ------------------------------------------------------------------
    private static function mission3(): array
    {
        $labaBersih = fn (array $n): int => ($n[1] * $n[2]) - ($n[0] * $n[2]) - $n[3];

        $decide = function (int $laba): string {
            if ($laba >= 2_000_000) {
                return 'LAYAK EKSPANSI';
            } elseif ($laba > 0) {
                return 'PERTAHANKAN USAHA';
            }

            return 'EVALUASI USAHA';
        };

        return [
            'number' => 3,
            'title' => 'Kelayakan Ekspansi Usaha',
            'inputs' => [
                ...self::INPUTS_BASE,
                ['name' => 'biaya_operasional', 'description' => 'Biaya gas, listrik, dan sewa alat selama produksi (rupiah)'],
            ],
            'computed_variables' => [
                ['name' => 'modal', 'description' => 'Total biaya bahan produksi'],
                ['name' => 'omzet', 'description' => 'Total uang hasil penjualan'],
                ['name' => 'laba_bersih', 'description' => 'Keuntungan setelah semua biaya dikurangi'],
            ],
            'min_runs' => 3,
            'branches' => ['LAYAK EKSPANSI', 'PERTAHANKAN USAHA', 'EVALUASI USAHA'],

            'consultant' => [
                'narrative' => 'Usaha keripik pisang makin dikenal. Ada tawaran membuka lapak di Pasar Kecamatan dan membeli wajan penggorengan kedua. '
                    .'Bu Ratna meminta program yang bisa memberi rekomendasi otomatis berdasarkan laba bersih. '
                    .'Hanya kamu yang tahu batas keputusannya. Pastikan Teknisi menguji ketiga kemungkinan keputusan.',
                'rules' => [
                    'Laba bersih dihitung sama seperti Misi 2.',
                    'Jika laba bersih paling sedikit Rp2.000.000, usaha layak diperluas.',
                    'Jika laba bersih di atas Rp0 tetapi kurang dari Rp2.000.000, usaha dipertahankan dulu.',
                    'Jika laba bersih Rp0 atau rugi, usaha perlu dievaluasi.',
                    'Program hanya menampilkan satu teks keputusan, ditulis persis seperti tabel.',
                    'Teknisi wajib menguji ketiga keputusan sebelum misi dinyatakan selesai.',
                ],
                'formula_steps' => [
                    'modal = biaya_per_bungkus × jumlah_bungkus',
                    'omzet = harga_jual × jumlah_bungkus',
                    'laba_bersih = omzet − modal − biaya_operasional',
                ],
                'output_order' => ['teks keputusan'],
                'decision_table' => [
                    ['condition' => 'laba_bersih ≥ 2000000', 'output' => 'LAYAK EKSPANSI', 'meaning' => 'Buka lapak baru dan beli wajan kedua.'],
                    ['condition' => '0 < laba_bersih < 2000000', 'output' => 'PERTAHANKAN USAHA', 'meaning' => 'Tabung dulu keuntungannya.'],
                    ['condition' => 'laba_bersih ≤ 0', 'output' => 'EVALUASI USAHA', 'meaning' => 'Periksa lagi harga jual dan biaya.'],
                ],
                'sample_cases' => [
                    ['inputs' => [6000, 10000, 800, 500000], 'expected' => ['LAYAK EKSPANSI']],
                    ['inputs' => [6000, 10000, 200, 250000], 'expected' => ['PERTAHANKAN USAHA']],
                    ['inputs' => [6000, 10000, 50, 300000], 'expected' => ['EVALUASI USAHA']],
                ],
            ],

            'technician' => [
                'narrative' => 'Program kali ini harus bisa mengambil keputusan. Konsultan memegang batas angka dan teks keputusan yang harus ditampilkan. '
                    .'Uji programmu dengan beberapa data berbeda sampai semua kemungkinan keputusan pernah muncul.',
                'skeleton' => <<<'PY'
# Misi 3: Kelayakan Ekspansi Usaha
# Tanyakan kepada Konsultan: batas angka dan teks keputusan yang harus tampil.

# Langkah 1-2: baca masukan dan hitung nilai yang dibandingkan (seperti Misi 2)
nilai = ...

# Langkah 3: ambil keputusan
if nilai >= ...:
    print("...")
elif nilai > ...:
    print("...")
else:
    print("...")
PY,
                'syntax_tips' => [
                    'Baris if, elif, dan else wajib diakhiri tanda titik dua (:).',
                    'Perintah di dalam if/elif/else menjorok ke dalam 4 spasi.',
                    'Tanda >= berarti "lebih dari atau sama dengan", dan > berarti "lebih dari".',
                    'Teks di dalam print() ditulis di antara tanda kutip, contoh: print("SELESAI").',
                ],
            ],

            'expected' => fn (array $n): array => [$decide($labaBersih($n))],
            'branch_of' => fn (array $n): string => $decide($labaBersih($n)),
        ];
    }

    /**
     * Semua nama variabel wajib (masukan + hasil hitung) untuk sebuah misi.
     */
    public static function requiredVariableNames(array $mission): array
    {
        return array_merge(
            array_column($mission['inputs'], 'name'),
            array_column($mission['computed_variables'], 'name'),
        );
    }
}
