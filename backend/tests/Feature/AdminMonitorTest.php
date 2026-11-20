<?php

namespace Tests\Feature;

use App\Events\AdminMonitorPulse;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AdminMonitorTest extends TestCase
{
    use RefreshDatabase;

    private const PIN = ['X-Admin-Passcode' => 'rahasia-lab'];

    protected function setUp(): void
    {
        parent::setUp();
        config(['insthink.admin_passcode' => 'rahasia-lab']);
        Event::fake([AdminMonitorPulse::class]);
    }

    public function json($method, $uri, array $data = [], array $headers = [], $options = 0)
    {
        $this->app['auth']->forgetGuards();

        return parent::json($method, $uri, $data, $headers, $options);
    }

    private function makeTeam(): array
    {
        $a = $this->postJson('/api/rooms', ['player_name' => 'Ayu', 'role' => 'cashier'])->assertCreated();
        $code = $a->json('room.room_code');
        $b = $this->postJson('/api/rooms', ['player_name' => 'Bima', 'room_code' => $code])->assertOk();

        return [$code, ['Authorization' => 'Bearer '.$a->json('session_token')], ['Authorization' => 'Bearer '.$b->json('session_token')]];
    }

    public function test_rejects_missing_or_wrong_pin(): void
    {
        $this->getJson('/api/admin/rooms')->assertStatus(401);
        $this->getJson('/api/admin/rooms', ['X-Admin-Passcode' => 'salah'])->assertStatus(401)->assertJsonPath('message', 'PIN Fasilitator salah.');
    }

    public function test_disabled_when_passcode_not_configured(): void
    {
        config(['insthink.admin_passcode' => null]);
        $this->getJson('/api/admin/rooms', self::PIN)->assertStatus(503);
    }

    public function test_lists_rooms_with_players_and_failed_attempts(): void
    {
        [$code, $cashier, $warehouse] = $this->makeTeam();
        $this->postJson("/api/rooms/{$code}/prolog-ready", [], $cashier);
        $this->postJson("/api/rooms/{$code}/prolog-ready", [], $warehouse);

        for ($i = 0; $i < 4; $i++) {
            $this->postJson("/api/rooms/{$code}/chapter1-attempt", ['code' => 'print(1)', 'output' => '0/3'], $cashier)->assertCreated();
        }

        $res = $this->getJson('/api/admin/rooms', self::PIN)->assertOk();
        $res->assertJsonPath('rooms.0.room_code', $code)
            ->assertJsonPath('rooms.0.phase', 'chapter1')
            ->assertJsonPath('rooms.0.failed_attempts', 4)
            ->assertJsonPath('rooms.0.players.0.name', 'Ayu')
            ->assertJsonPath('rooms.0.players.0.is_prolog_ready', true)
            ->assertJsonPath('thresholds.failed_attempts', 4);
        $this->assertNotNull($res->json('rooms.0.last_activity_at'));
        $this->assertArrayNotHasKey('session_token', $res->json('rooms.0.players.0'));
        Event::assertDispatched(AdminMonitorPulse::class);
    }

    public function test_chapter3_errors_and_avatar_skin_are_reported(): void
    {
        $a = $this->postJson('/api/rooms', ['player_name' => 'Ayu', 'role' => 'cashier', 'avatar_skin' => 'female'])->assertCreated();
        $code = $a->json('room.room_code');
        $cashier = ['Authorization' => 'Bearer '.$a->json('session_token')];
        $this->postJson('/api/rooms', ['player_name' => 'Bima', 'room_code' => $code])->assertOk();
        Room::where('room_code', $code)->update(['phase' => 'chapter3']);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson("/api/rooms/{$code}/chapter3-attempt", ['code' => 'print(x)', 'output' => 'NameError'], $cashier)->assertCreated();
        }

        $this->getJson('/api/admin/rooms', self::PIN)
            ->assertJsonPath('rooms.0.chapter3_failed_attempts', 3)
            ->assertJsonPath('rooms.0.failed_attempts', 3)
            ->assertJsonPath('thresholds.chapter3_failed_attempts', 3)
            ->assertJsonPath('rooms.0.players.0.avatar_skin', 'female')
            ->assertJsonPath('rooms.0.players.1.avatar_skin', 'male');
    }

    public function test_finished_rooms_include_score_for_leaderboard(): void
    {
        [$code] = $this->makeTeam();
        $this->makeTeam(); // tim kedua masih di prolog

        Room::where('room_code', $code)->update([
            'phase' => 'finished',
            'status' => 'completed',
            'shared_money' => 110000,
            'started_at' => now()->subMinutes(30),
            'completed_at' => now(),
        ]);

        $rooms = collect($this->getJson('/api/admin/rooms', self::PIN)->assertOk()->json('rooms'));
        $finished = $rooms->firstWhere('room_code', $code);

        // 1000 lulus + 600 (laba Rp60.000) + 300 tanpa kesalahan
        $this->assertSame(1900, $finished['score']['total']);
        $this->assertSame(1800, $finished['score']['duration_seconds']);
        $this->assertNull($rooms->firstWhere('room_code', '!=', $code)['score']);
    }

    public function test_attempt_is_ignored_outside_chapter1(): void
    {
        [$code, $cashier] = $this->makeTeam();
        $this->postJson("/api/rooms/{$code}/chapter1-attempt", ['code' => 'print(1)'], $cashier)
            ->assertOk()->assertJsonPath('logged', false);
        $this->assertDatabaseCount('mission_logs', 0);
    }

    public function test_delete_room_cascades(): void
    {
        [$code] = $this->makeTeam();
        $this->deleteJson("/api/admin/rooms/{$code}", [], self::PIN)->assertOk();
        $this->assertDatabaseCount('rooms', 0);
        $this->assertDatabaseCount('room_players', 0);
        $this->deleteJson("/api/admin/rooms/{$code}", [], self::PIN)->assertNotFound();
    }
}
