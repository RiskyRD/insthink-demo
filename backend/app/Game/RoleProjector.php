<?php

namespace App\Game;

use App\Models\MissionLog;
use App\Models\Room;
use App\Models\RoomPlayer;

/**
 * SATU-SATUNYA pintu keluar state game ke klien.
 *
 * Payload dibangun dengan whitelist per peran (bukan dengan menghapus
 * field rahasia), sehingga field baru tidak bocor secara tidak sengaja.
 *
 *  cashier   → menu, harga jual, resep. TIDAK: harga kulakan gudang.
 *  warehouse → daftar bahan, harga kulakan, batas gudang. TIDAK: resep & harga jual.
 *  keduanya  → uang kas bersama, stok gudang, jumlah pelanggan, fase.
 */
class RoleProjector
{
    public function state(Room $room, RoomPlayer $player): array
    {
        $room->loadMissing('players');

        return [
            'me' => [
                'name' => $player->player_name,
                'role' => $player->role,
                'is_prolog_ready' => $player->is_prolog_ready,
                'is_chapter1_done' => $player->is_chapter1_done,
            ],
            'room' => $room->publicSummary(),
            'shop' => $room->shopState(),
            'catalog' => $player->isCashier() ? ShopCatalog::forCashier() : ShopCatalog::forWarehouse(),
            'chapter1_draft' => $this->chapter1Draft($player),
            'ending' => $room->phase === Room::PHASE_FINISHED ? $this->ending($room) : null,
        ];
    }

    /** Kode Chapter 1 terakhir milik pemain ini, agar editor terisi lagi setelah refresh. */
    private function chapter1Draft(RoomPlayer $player): ?string
    {
        return MissionLog::where('room_player_id', $player->id)
            ->where('mission_number', 1)
            ->latest('id')
            ->value('submitted_code');
    }

    private function ending(Room $room): array
    {
        return [
            'message' => 'Selamat! Kedai Kopi & Camilan Desa mencapai target pendapatan. '
                .'Kerja sama Kasir dan Stok Gudang membuat usaha desa semakin maju.',
            'final_money' => $room->shared_money,
            'customers_served' => $room->customers_served,
            'total_duration_seconds' => $room->started_at && $room->completed_at
                ? (int) $room->started_at->diffInSeconds($room->completed_at)
                : null,
        ];
    }
}
