<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Sinyal "ada ruangan yang berubah" untuk dashboard fasilitator.
 *
 * Channel publik admin.monitor tidak memakai otorisasi, jadi payload sengaja
 * TIDAK berisi kode ruangan, nama siswa, atau data kedai. Dashboard yang
 * menerima sinyal ini mengambil data lengkap lewat GET /api/admin/rooms
 * (dilindungi PIN).
 */
class AdminMonitorPulse implements ShouldBroadcastNow
{
    use Dispatchable;

    public function broadcastOn(): array
    {
        return [new Channel('admin.monitor')];
    }

    public function broadcastAs(): string
    {
        return 'admin.room_changed';
    }

    public function broadcastWith(): array
    {
        return ['at' => now()->toIso8601String()];
    }
}
