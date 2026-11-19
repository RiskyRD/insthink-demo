<?php

namespace App\Game;

/**
 * Data tetap "Kedai Kopi & Camilan Desa" (Bab Bonus: Simulasi Kedai Live).
 *
 * Harga dan resep adalah sumber kebenaran server: klien hanya mengirim
 * kunci menu / kunci bahan, tidak pernah mengirim harga.
 */
final class ShopCatalog
{
    /** Kapasitas maksimal gudang per bahan. */
    public const MAX_STOCK = 8;

    /** Satu paket kulakan selalu berisi 3 unit. */
    public const PACK_SIZE = 3;

    public const STARTING_MONEY = 50000;

    public const TARGET_MONEY = 120000;

    public const STARTING_INVENTORY = [
        'kopi' => 3,
        'susu' => 3,
        'gula_aren' => 2,
        'pisang' => 3,
        'cokelat' => 2,
        'kemasan' => 3,
    ];

    /** Bahan gudang: nama tampilan dan harga kulakan per paket (3 unit). */
    public const SUPPLIES = [
        'kopi' => ['name' => 'Bubuk Kopi', 'pack_price' => 9000],
        'susu' => ['name' => 'Susu Segar', 'pack_price' => 7500],
        'gula_aren' => ['name' => 'Gula Aren', 'pack_price' => 6000],
        'pisang' => ['name' => 'Pisang Kepok', 'pack_price' => 4500],
        'cokelat' => ['name' => 'Cokelat Batang', 'pack_price' => 9000],
        'kemasan' => ['name' => 'Kemasan Daun & Gelas', 'pack_price' => 3000],
    ];

    /**
     * Urutan resep = urutan bahan diracik di Meja Racik Kasir.
     * Disalin juga di frontend (chapter2/shopData.js) untuk antrean pelanggan; jaga agar tetap sama.
     */
    public const MENU = [
        'es_kopi_aren' => [
            'name' => 'Es Kopi Gula Aren',
            'price' => 18000,
            'recipe' => ['kopi' => 1, 'susu' => 1, 'gula_aren' => 1],
        ],
        'pisang_krispi' => [
            'name' => 'Pisang Krispi Cokelat',
            'price' => 15000,
            'recipe' => ['pisang' => 1, 'cokelat' => 1, 'kemasan' => 1],
        ],
        'kopi_susu_spesial' => [
            'name' => 'Kopi Susu Spesial',
            'price' => 16000,
            'recipe' => ['kopi' => 1, 'susu' => 1, 'kemasan' => 1],
        ],
        'kopi_tubruk' => [
            'name' => 'Kopi Tubruk Gula Aren',
            'price' => 9000,
            'recipe' => ['kopi' => 1, 'gula_aren' => 1, 'kemasan' => 1],
        ],
        'pisang_goreng' => [
            'name' => 'Pisang Goreng',
            'price' => 7000,
            'recipe' => ['pisang' => 1, 'kemasan' => 1],
        ],
    ];

    public static function menuKeys(): array
    {
        return array_keys(self::MENU);
    }

    public static function supplyKeys(): array
    {
        return array_keys(self::SUPPLIES);
    }

    public static function supplyName(string $key): string
    {
        return self::SUPPLIES[$key]['name'] ?? $key;
    }

    /** Katalog yang dilihat Kasir: menu, harga jual, dan resep. */
    public static function forCashier(): array
    {
        return [
            'menu' => collect(self::MENU)->map(fn (array $m, string $key) => [
                'key' => $key,
                'name' => $m['name'],
                'price' => $m['price'],
                'recipe' => collect($m['recipe'])->map(fn (int $qty, string $item) => [
                    'item_key' => $item,
                    'name' => self::supplyName($item),
                    'qty' => $qty,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }

    /** Katalog yang dilihat Stok Gudang: daftar bahan dan harga kulakan. */
    public static function forWarehouse(): array
    {
        return [
            'pack_size' => self::PACK_SIZE,
            'max_stock' => self::MAX_STOCK,
            'supplies' => collect(self::SUPPLIES)->map(fn (array $s, string $key) => [
                'key' => $key,
                'name' => $s['name'],
                'pack_price' => $s['pack_price'],
            ])->values()->all(),
        ];
    }
}
