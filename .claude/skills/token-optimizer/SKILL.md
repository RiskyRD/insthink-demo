---
name: token-optimizer
description: Mengoptimalkan penggunaan token saat membaca berkas, menulis perubahan kode, dan menjawab pertanyaan teknis.
---

# Standar Efisiensi Eksekusi Kode

1. Saat memodifikasi berkas yang sudah ada, tampilkan dan terapkan perubahan hanya pada bagian fungsi atau blok kode yang relevan tanpa menulis ulang seluruh isi berkas dari awal hingga akhir.
2. Baca berkas menggunakan rentang baris spesifik apabila struktur berkas sudah diketahui, hindari membaca keseluruhan berkas berukuran besar secara berulang.
3. Jangan mengulang kembali isi instruksi pengguna, jangan menulis pengantar panjang sebelum blok kode, dan jangan menulis ringkasan penutup setelah perubahan selesai diterapkan.
4. Gunakan pustaka dan komponen yang sudah terpasang di `package.json` atau `composer.json` tanpa menyarankan instalasi dependensi baru kecuali diminta secara eksplisit.
