<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Uang kas, stok gudang, atau jumlah pelanggan berubah (Chapter 2).
 * Tidak memuat resep maupun harga kulakan, jadi aman dikirim ke kedua peran.
 */
class ShopStateUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    /**
     * @param  array  $lastAction  {type: 'serve'|'restock', role, label, money_delta, inventory_delta}
     */
    public function __construct(
        public readonly string $roomCode,
        private readonly array $shop,
        private readonly array $summary,
        private readonly array $lastAction,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("room.{$this->roomCode}.cashier"),
            new PrivateChannel("room.{$this->roomCode}.warehouse"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'shop.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'shop' => $this->shop,
            'room' => $this->summary,
            'last_action' => $this->lastAction,
        ];
    }
}
