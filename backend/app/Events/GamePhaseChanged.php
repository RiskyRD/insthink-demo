<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fase permainan berganti (prolog → chapter1 → chapter2 → finished).
 * Payload netral (Room::publicSummary + shopState), dikirim ke kedua peran.
 */
class GamePhaseChanged implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(
        public readonly string $roomCode,
        public readonly string $previousPhase,
        public readonly string $phase,
        private readonly array $summary,
        private readonly array $shop,
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
        return 'game.phase_changed';
    }

    public function broadcastWith(): array
    {
        return [
            'previous_phase' => $this->previousPhase,
            'phase' => $this->phase,
            'room' => $this->summary,
            'shop' => $this->shop,
        ];
    }
}
