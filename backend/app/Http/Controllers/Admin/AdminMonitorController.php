<?php

namespace App\Http\Controllers\Admin;

use App\Events\AdminMonitorPulse;
use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomPlayer;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Dashboard Mode Fasilitator: memantau semua ruangan dan membersihkan data uji.
 * Dilindungi middleware EnsureAdminPasscode.
 */
class AdminMonitorController extends Controller
{
    private const MAX_ROOMS = 300;

    /** GET /api/admin/rooms */
    public function index(): JsonResponse
    {
        $rooms = Room::query()
            ->with('players')
            ->withCount([
                'missionLogs as failed_attempts' => fn ($q) => $q->where('is_passed', false),
                'missionLogs as chapter3_failed_attempts' => fn ($q) => $q->where('is_passed', false)->where('mission_number', 3),
            ])
            ->withMax('missionLogs as last_log_at', 'created_at')
            ->withMax('players as last_player_at', 'updated_at')
            ->latest('id')
            ->limit(self::MAX_ROOMS)
            ->get();

        return response()->json([
            'server_time' => now()->toIso8601String(),
            'thresholds' => [
                'failed_attempts' => config('insthink.help_failed_attempts'),
                'idle_seconds' => config('insthink.help_idle_seconds'),
                'chapter3_failed_attempts' => config('insthink.help_chapter3_failed_attempts'),
            ],
            'rooms' => $rooms->map(fn (Room $room) => $this->present($room))->values(),
        ]);
    }

    /** DELETE /api/admin/rooms/{roomCode} — pemain & log ikut terhapus (cascade). */
    public function destroy(string $roomCode): JsonResponse
    {
        $room = Room::where('room_code', strtoupper($roomCode))->first();
        abort_unless($room, 404, 'Ruangan tidak ditemukan. Mungkin sudah dihapus.');

        $room->delete();

        try {
            broadcast(new AdminMonitorPulse);
        } catch (Throwable $e) {
            report($e);
        }

        return response()->json(['message' => "Ruangan {$room->room_code} sudah dihapus."]);
    }

    private function present(Room $room): array
    {
        $lastActivity = collect([$room->updated_at, $room->last_log_at, $room->last_player_at])
            ->filter()
            ->map(fn ($t) => $t instanceof Carbon ? $t : Carbon::parse($t))
            ->max();

        return [
            'room_code' => $room->room_code,
            'status' => $room->status,
            'phase' => $room->phase,
            'shared_money' => $room->shared_money,
            'target_money' => $room->target_money,
            'customers_served' => $room->customers_served,
            'failed_attempts' => (int) $room->failed_attempts,
            'chapter3_failed_attempts' => (int) $room->chapter3_failed_attempts,
            'created_at' => $room->created_at?->toIso8601String(),
            'started_at' => $room->started_at?->toIso8601String(),
            'phase_started_at' => $room->phase_started_at?->toIso8601String(),
            'completed_at' => $room->completed_at?->toIso8601String(),
            'last_activity_at' => $lastActivity?->toIso8601String(),
            'players' => $room->players->map(fn (RoomPlayer $p) => [
                'name' => $p->player_name,
                'role' => $p->role,
                'avatar_skin' => $p->avatar_skin,
                'is_prolog_ready' => $p->is_prolog_ready,
                'is_chapter1_done' => $p->is_chapter1_done,
            ])->values(),
        ];
    }
}
