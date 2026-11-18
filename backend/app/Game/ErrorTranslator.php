<?php

namespace App\Game;

/**
 * Menerjemahkan kategori galat menjadi pesan bahasa Indonesia
 * yang berbeda untuk tiap peran.
 *
 * - Teknisi  : petunjuk sintaks/cara menulis kode, TANPA rumus atau angka target.
 * - Konsultan: diagnosis apa yang perlu dijelaskan ulang, TANPA kode sumber.
 */
class ErrorTranslator
{
    public const FORBIDDEN_CONSTRUCT = 'forbidden_construct';
    public const SYNTAX_ERROR = 'syntax_error';
    public const MISSING_VARIABLE = 'missing_variable';
    public const NAME_ERROR = 'name_error';
    public const VALUE_ERROR = 'value_error';
    public const RUNTIME_ERROR = 'runtime_error';
    public const INVALID_INPUT = 'invalid_input';
    public const NO_OUTPUT = 'no_output';
    public const WRONG_OUTPUT = 'wrong_output';
    public const INCOMPLETE_TEST = 'incomplete_test';

    /** Nama galat bawaan Python → kategori. */
    public static function categoryFromPython(string $errorType): string
    {
        return match ($errorType) {
            'SyntaxError', 'IndentationError', 'TabError' => self::SYNTAX_ERROR,
            'NameError', 'UnboundLocalError' => self::NAME_ERROR,
            'ValueError' => self::VALUE_ERROR,
            default => self::RUNTIME_ERROR,
        };
    }

    public static function titleFor(?string $category): string
    {
        return match ($category) {
            null => 'Misi berhasil!',
            self::FORBIDDEN_CONSTRUCT => 'Perintah di luar materi',
            self::SYNTAX_ERROR => 'Penulisan kode belum tepat',
            self::MISSING_VARIABLE => 'Nama variabel belum lengkap',
            self::NAME_ERROR => 'Nama variabel tidak dikenali',
            self::VALUE_ERROR => 'Masukan bukan angka bulat',
            self::RUNTIME_ERROR => 'Program berhenti di tengah jalan',
            self::INVALID_INPUT => 'Data uji belum sesuai',
            self::NO_OUTPUT => 'Program belum menampilkan hasil',
            self::WRONG_OUTPUT => 'Hasil belum sesuai aturan usaha',
            self::INCOMPLETE_TEST => 'Pengujian belum lengkap',
            default => 'Ada yang perlu diperbaiki',
        };
    }

    /**
     * @param  array  $ctx  ['line' => ?int, 'input_count' => int]
     */
    public static function technicianHint(?string $category, array $ctx = []): string
    {
        $line = isset($ctx['line']) ? " (lihat baris {$ctx['line']})" : '';

        return match ($category) {
            null => 'Kerja bagus! Program kalian sudah sesuai aturan usaha.',
            self::FORBIDDEN_CONSTRUCT => 'Kode memakai perintah yang belum dipelajari di Chapter 1, misalnya for, while, def, import, atau tanda [ ] dan { }. '
                .'Cukup gunakan variabel, int(input()), operasi hitung, if-elif-else, dan print().',
            self::SYNTAX_ERROR => "Periksa tanda titik dua di akhir baris if/elif/else, pasangan tanda kurung, atau spasi menjorok ke dalam{$line}.",
            self::MISSING_VARIABLE => 'Ada nama variabel wajib yang belum kamu pakai atau ejaannya berbeda. Tanyakan lagi daftar nama variabel kepada Konsultan.',
            self::NAME_ERROR => "Pastikan nama variabel sama persis dengan yang disebutkan oleh Konsultan Bisnis, termasuk huruf kecil dan garis bawah{$line}.",
            self::VALUE_ERROR => 'Pastikan masukan dari pengguna sudah diubah menjadi angka bulat menggunakan int(). Saat menguji, ketik angka tanpa titik atau huruf, contoh 15000 bukan 15.000.',
            self::RUNTIME_ERROR => "Program berhenti sebelum selesai. Baca pesan merah di terminal untuk melihat baris yang bermasalah{$line}.",
            self::INVALID_INPUT => 'Jumlah data masukan pada salah satu uji belum sesuai. Program ini membutuhkan '
                .($ctx['input_count'] ?? '?').' data masukan untuk setiap uji, berupa angka bulat yang tidak terlalu besar.',
            self::NO_OUTPUT => 'Program tidak menampilkan hasil apa pun. Pastikan ada perintah print() untuk menampilkan hasil.',
            self::WRONG_OUTPUT => 'Program sudah berjalan, tetapi hasilnya belum sesuai aturan usaha. Tanyakan kembali rumus, urutan tampilan, atau batas keputusan kepada Konsultan.',
            self::INCOMPLETE_TEST => 'Semua uji sudah benar, tetapi belum semua kemungkinan keputusan pernah dicoba. Minta Konsultan memberi contoh data untuk keputusan yang belum muncul.',
            default => 'Ada yang perlu diperbaiki. Baca pesan di terminal dan diskusikan dengan Konsultan.',
        };
    }

    /**
     * @param  array  $ctx  ['missing_variables' => string[], 'missing_branches' => string[], 'input_count' => int]
     */
    public static function consultantDiagnosis(?string $category, array $ctx = []): string
    {
        return match ($category) {
            null => 'Program Teknisi sudah sesuai dengan aturan usaha yang kamu jelaskan. Hebat!',
            self::FORBIDDEN_CONSTRUCT => 'Teknisi memakai perintah di luar materi Chapter 1. Ingatkan untuk memakai langkah dasar saja: baca masukan, hitung, lalu tampilkan.',
            self::SYNTAX_ERROR => 'Program Teknisi belum bisa dijalankan karena ada salah ketik. Ini bagian Teknisi, tetapi kamu bisa membantu dengan menjelaskan langkah hitungan satu per satu.',
            self::MISSING_VARIABLE => 'Variabel berikut belum ditemukan di program Teknisi: '
                .implode(', ', $ctx['missing_variables'] ?? []).'. Sampaikan nama variabel itu dengan ejaan yang tepat.',
            self::NAME_ERROR => 'Program memakai nama yang tidak dikenali. Kemungkinan ejaan nama variabel berbeda. Cocokkan lagi daftar nama variabel bersama Teknisi.',
            self::VALUE_ERROR => 'Program gagal membaca angka masukan. Pastikan contoh data yang kamu berikan berupa angka bulat tanpa titik, contoh 15000.',
            self::RUNTIME_ERROR => 'Program Teknisi berhenti sebelum selesai menghitung. Minta Teknisi membaca pesan di terminalnya.',
            self::INVALID_INPUT => 'Jumlah atau urutan data masukan belum cocok. Sampaikan bahwa ada '
                .($ctx['input_count'] ?? '?').' data yang harus dimasukkan berurutan.',
            self::NO_OUTPUT => 'Program tidak menampilkan hasil. Ingatkan Teknisi bahwa hasil hitungan harus ditampilkan.',
            self::WRONG_OUTPUT => 'Hasil program belum sesuai aturan usaha. Bandingkan hasil yang diharapkan dengan hasil program pada tabel uji, lalu jelaskan lagi rumus atau urutannya.',
            self::INCOMPLETE_TEST => 'Hitungannya sudah benar, tetapi keputusan berikut belum pernah diuji: '
                .implode(', ', $ctx['missing_branches'] ?? []).'. Berikan contoh data yang menghasilkan keputusan tersebut.',
            default => 'Ada yang perlu diperbaiki. Diskusikan bersama Teknisi.',
        };
    }
}
