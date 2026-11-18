<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Perubahan status ruangan (mis. pasangan bergabung). Payload netral
 * (Room::publicSummary), jadi aman dikirim ke kedua channel peran.
 */
class RoomUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(
        public readonly string $roomCode,
        private readonly array $summary,
        private readonly string $reason,
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
        return 'room.updated';
    }

    public function broadcastWith(): array
    {
        return ['reason' => $this->reason, 'room' => $this->summary];
    }
}
