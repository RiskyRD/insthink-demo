<?php

namespace App\Http\Controllers;

use App\Game\ScoreCalculator;
use App\Models\Room;
use App\Models\RoomPlayer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/leaderboard — Papan Peringkat tim yang lulus dalam 24 jam terakhir.
 * Hanya untuk pemain yang sedang berada di ruangan (guard "room").
 * Kode ruangan tim lain tidak dikirim.
 */
class LeaderboardController extends Controller
{
    private const LIMIT = 20;

    public function index(Request $request): JsonResponse
    {
        /** @var RoomPlayer $player */
        $player = $request->user('room');

        $entries = Room::query()
            ->where('phase', Room::PHASE_FINISHED)
            ->where('completed_at', '>=', now()->subDay())
            ->with(['players', 'missionLogs:id,room_id,mission_number,is_passed,attempt_count'])
            ->get()
            ->map(fn (Room $room) => [
                'room_id' => $room->id,
                'score' => ScoreCalculator::forRoom($room),
                'players' => $room->players
                    ->sortBy(fn (RoomPlayer $p) => array_search($p->role, RoomPlayer::ROLES, true))
                    ->map(fn (RoomPlayer $p) => ['name' => $p->player_name, 'role' => $p->role, 'avatar_skin' => $p->avatar_skin])
                    ->values()
                    ->all(),
            ])
            ->sort(fn ($a, $b) => [$b['score']['total'], $a['score']['duration_seconds'] ?? PHP_INT_MAX]
                <=> [$a['score']['total'], $b['score']['duration_seconds'] ?? PHP_INT_MAX])
            ->values();

        $rows = $entries->map(fn ($e, $i) => [
            'rank' => $i + 1,
            'is_mine' => $e['room_id'] === $player->room_id,
            'players' => $e['players'],
            'score' => $e['score']['total'],
            'duration_seconds' => $e['score']['duration_seconds'],
            'profit' => $e['score']['profit'],
        ]);

        $mine = $rows->firstWhere('is_mine', true);

        return response()->json([
            'entries' => $rows->take(self::LIMIT)->values(),
            'my_rank' => $mine['rank'] ?? null,
            'total_teams' => $rows->count(),
        ]);
    }
}
