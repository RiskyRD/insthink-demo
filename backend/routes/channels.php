<?php

use App\Models\RoomPlayer;
use Illuminate\Support\Facades\Broadcast;

/*
| Otorisasi channel Reverb. Klien berlangganan dengan nama tanpa awalan,
| misalnya Echo.private('room.AB12CD.cashier'); Echo menambahkan
| awalan "private-" secara otomatis.
|
| Semua channel memakai guard "room" (token sesi pemain), bukan sesi web.
*/

$guard = ['guards' => ['room']];

// Hanya Kasir di ruangan ini.
Broadcast::channel('room.{roomCode}.cashier', function (RoomPlayer $player, string $roomCode) {
    return $player->role === RoomPlayer::ROLE_CASHIER
        && $player->room->room_code === $roomCode;
}, $guard);

// Hanya Stok Gudang di ruangan ini.
Broadcast::channel('room.{roomCode}.warehouse', function (RoomPlayer $player, string $roomCode) {
    return $player->role === RoomPlayer::ROLE_WAREHOUSE
        && $player->room->room_code === $roomCode;
}, $guard);

// Presence channel bersama: status online pasangan dan client whisper
// (mis. ping "stok kopi menipis!"). Tidak pernah dipakai untuk mengubah state kedai.
Broadcast::channel('room.{roomCode}.presence', function (RoomPlayer $player, string $roomCode) {
    if ($player->room->room_code !== $roomCode) {
        return false;
    }

    return ['id' => $player->id, 'name' => $player->player_name, 'role' => $player->role];
}, $guard);
