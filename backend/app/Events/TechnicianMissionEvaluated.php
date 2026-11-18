<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Dikirim HANYA ke private-room.{code}.technician.
 * Payload sudah diproyeksikan oleh RoleProjector::technicianEvaluation()
 * (tanpa rumus, batas keputusan, maupun nilai target).
 */
class TechnicianMissionEvaluated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(
        public readonly string $roomCode,
        private readonly array $payload,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("room.{$this->roomCode}.technician")];
    }

    public function broadcastAs(): string
    {
        return 'mission.evaluated';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
