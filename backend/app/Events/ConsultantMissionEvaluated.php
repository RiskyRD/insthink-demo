<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Dikirim HANYA ke private-room.{code}.consultant.
 * Payload sudah diproyeksikan oleh RoleProjector::consultantEvaluation()
 * (tanpa kode sumber dan tanpa isi terminal).
 */
class ConsultantMissionEvaluated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(
        public readonly string $roomCode,
        private readonly array $payload,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("room.{$this->roomCode}.consultant")];
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
