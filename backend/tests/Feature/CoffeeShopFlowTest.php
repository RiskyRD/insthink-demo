<?php

namespace Tests\Feature;

use App\Events\GamePhaseChanged;
use App\Events\ShopStateUpdated;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class CoffeeShopFlowTest extends TestCase
{
    use RefreshDatabase;

    private string $code;

    private array $cashier;

    private array $warehouse;

    protected function setUp(): void
    {
        parent::setUp();
        Event::fake([GamePhaseChanged::class, ShopStateUpdated::class]);

        $a = $this->postJson('/api/rooms', ['player_name' => 'Ayu', 'role' => 'cashier', 'avatar_skin' => 'female'])->assertCreated();
        $this->code = $a->json('room.room_code');
        $this->cashier = ['Authorization' => 'Bearer '.$a->json('session_token')];

        $b = $this->postJson('/api/rooms', ['player_name' => 'Bima', 'room_code' => $this->code])->assertOk();
        $this->assertSame('warehouse', $b->json('me.role'));
        $this->warehouse = ['Authorization' => 'Bearer '.$b->json('session_token')];
    }

    /** Guard "room" menyimpan user antar-request dalam satu test; reset agar token tiap pemain dibaca ulang. */
    public function json($method, $uri, array $data = [], array $headers = [], $options = 0)
    {
        $this->app['auth']->forgetGuards();

        return parent::json($method, $uri, $data, $headers, $options);
    }

    private function url(string $path): string
    {
        return "/api/rooms/{$this->code}/{$path}";
    }

    private function reachBonus(): void
    {
        $this->postJson($this->url('prolog-ready'), [], $this->cashier);
        $this->postJson($this->url('prolog-ready'), [], $this->warehouse);
        $this->postJson($this->url('chapter1-complete'), ['code' => 'print(1)'], $this->cashier);
        $this->postJson($this->url('chapter1-complete'), ['code' => 'print(2)'], $this->warehouse);
    }

    public function test_initial_state_and_role_catalogs(): void
    {
        $this->getJson($this->url('state'), $this->cashier)
            ->assertJsonPath('room.phase', 'prolog')
            ->assertJsonPath('shop.shared_money', 50000)
            ->assertJsonPath('shop.inventory.gula_aren', 2)
            ->assertJsonStructure(['catalog' => ['menu']])
            ->assertJsonMissingPath('catalog.supplies');

        $this->getJson($this->url('state'), $this->warehouse)
            ->assertJsonStructure(['catalog' => ['supplies', 'max_stock']])
            ->assertJsonMissingPath('catalog.menu');
    }

    public function test_phase_progression(): void
    {
        $this->postJson($this->url('chapter1-complete'), ['code' => 'x'], $this->cashier)->assertStatus(409);

        $this->postJson($this->url('prolog-ready'), [], $this->cashier)->assertJsonPath('room.phase', 'prolog');
        $this->postJson($this->url('prolog-ready'), [], $this->cashier)->assertOk(); // idempoten
        $this->postJson($this->url('prolog-ready'), [], $this->warehouse)->assertJsonPath('room.phase', 'chapter1');
        Event::assertDispatched(GamePhaseChanged::class, fn ($e) => $e->phase === 'chapter1');

        $this->postJson($this->url('chapter1-complete'), ['code' => 'print("a")'], $this->cashier)
            ->assertJsonPath('me.is_chapter1_done', true)
            ->assertJsonPath('chapter1_draft', 'print("a")');
        $this->postJson($this->url('chapter1-complete'), ['code' => 'dup'], $this->cashier); // tidak membuat log ganda
        $this->postJson($this->url('chapter1-complete'), ['code' => 'print("b")'], $this->warehouse)
            ->assertJsonPath('room.phase', 'bonus');

        $this->assertDatabaseCount('mission_logs', 2);
        Event::assertDispatched(GamePhaseChanged::class, fn ($e) => $e->phase === 'bonus');
    }

    public function test_shop_rules_before_bonus_and_by_role(): void
    {
        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->cashier)->assertStatus(409);
        $this->reachBonus();
        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->warehouse)->assertForbidden();
        $this->postJson($this->url('restock'), ['item_key' => 'kopi', 'qty' => 3], $this->cashier)->assertForbidden();
        $this->postJson($this->url('restock'), ['item_key' => 'kopi', 'qty' => 2], $this->warehouse)->assertUnprocessable();
    }

    public function test_serve_order_and_stock_shortage(): void
    {
        $this->reachBonus();

        $this->postJson($this->url('serve-order'), ['menu_key' => 'es_kopi_aren'], $this->cashier)
            ->assertOk()
            ->assertJsonPath('shop.shared_money', 68000)
            ->assertJsonPath('shop.customers_served', 1)
            ->assertJsonPath('shop.inventory.kopi', 2)
            ->assertJsonPath('shop.inventory.gula_aren', 1);
        Event::assertDispatched(ShopStateUpdated::class);

        $this->postJson($this->url('serve-order'), ['menu_key' => 'kopi_tubruk'], $this->cashier)->assertOk();
        // gula_aren kini 0
        $this->postJson($this->url('serve-order'), ['menu_key' => 'kopi_tubruk'], $this->cashier)
            ->assertStatus(409)
            ->assertJsonPath('missing_items.0.item_key', 'gula_aren');
    }

    public function test_restock_limits(): void
    {
        $this->reachBonus();

        $this->postJson($this->url('restock'), ['item_key' => 'gula_aren', 'qty' => 3], $this->warehouse)
            ->assertOk()
            ->assertJsonPath('shop.inventory.gula_aren', 5)
            ->assertJsonPath('shop.shared_money', 44000);

        // 5 + 3 = 8 masih boleh; 8 + 3 melebihi batas.
        $this->postJson($this->url('restock'), ['item_key' => 'gula_aren', 'qty' => 3], $this->warehouse)->assertOk();
        $this->postJson($this->url('restock'), ['item_key' => 'gula_aren', 'qty' => 3], $this->warehouse)->assertStatus(409);

        Room::where('room_code', $this->code)->update(['shared_money' => 1000]);
        $this->postJson($this->url('restock'), ['item_key' => 'kopi', 'qty' => 3], $this->warehouse)
            ->assertStatus(409)
            ->assertJsonPath('shop.shared_money', null);
    }

    public function test_avatar_skin_is_saved_and_shared(): void
    {
        $this->getJson($this->url('state'), $this->cashier)
            ->assertJsonPath('me.avatar_skin', 'female')
            ->assertJsonPath('me.is_chapter3_done', false)
            ->assertJsonPath('room.players.0.avatar_skin', 'female')
            ->assertJsonPath('room.players.1.avatar_skin', 'male'); // default

        $this->postJson('/api/rooms', ['player_name' => 'Cici', 'avatar_skin' => 'alien'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Pilihan avatar harus laki-laki atau perempuan.');
    }

    public function test_reaching_target_closes_shop_until_bonus_complete(): void
    {
        $this->reachBonus();
        Room::where('room_code', $this->code)->update(['shared_money' => 115000]);

        // Fase tetap "bonus" agar layar ringkasan Bab Bonus tampil.
        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->cashier)
            ->assertOk()
            ->assertJsonPath('room.phase', 'bonus')
            ->assertJsonPath('shop.shared_money', 122000);
        Event::assertNotDispatched(GamePhaseChanged::class, fn ($e) => $e->phase === 'chapter3');

        // Kedai tutup setelah target tercapai.
        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->cashier)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Target kas sudah tercapai. Kedai tutup, ayo lanjut ke Bab 3: Coding Money Tracker!');
        $this->postJson($this->url('restock'), ['item_key' => 'kopi', 'qty' => 3], $this->warehouse)->assertStatus(409);

        $this->postJson($this->url('bonus-complete'), [], $this->warehouse)
            ->assertJsonPath('room.phase', 'chapter3')
            ->assertJsonPath('room.status', 'active');
        Event::assertDispatched(GamePhaseChanged::class, fn ($e) => $e->previousPhase === 'bonus' && $e->phase === 'chapter3');
    }

    public function test_bonus_complete_endpoint(): void
    {
        $this->postJson($this->url('bonus-complete'), [], $this->cashier)->assertStatus(409);
        $this->reachBonus();

        $this->postJson($this->url('bonus-complete'), [], $this->warehouse)
            ->assertOk()
            ->assertJsonPath('room.phase', 'chapter3');
        Event::assertDispatched(GamePhaseChanged::class, fn ($e) => $e->phase === 'chapter3');

        // Pasangan menekan belakangan: tetap sukses, tanpa event fase ganda.
        $this->postJson($this->url('bonus-complete'), [], $this->cashier)->assertOk()->assertJsonPath('room.phase', 'chapter3');
        Event::assertDispatchedTimes(GamePhaseChanged::class, 3); // chapter1, bonus, chapter3
    }

    public function test_chapter3_complete_finishes_game_when_both_done(): void
    {
        $payload = ['code' => 'total = 0', 'output' => 'Total: 32000', 'attempt_count' => 3, 'duration_seconds' => 420];

        $this->reachBonus();
        $this->postJson($this->url('chapter3-complete'), $payload, $this->cashier)->assertStatus(409);
        $this->postJson($this->url('bonus-complete'), [], $this->cashier);

        $this->postJson($this->url('chapter3-complete'), ['code' => 'x'], $this->cashier)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Jumlah percobaan wajib dikirim.');

        $this->postJson($this->url('chapter3-complete'), $payload, $this->cashier)
            ->assertOk()
            ->assertJsonPath('me.is_chapter3_done', true)
            ->assertJsonPath('room.phase', 'chapter3');
        $this->postJson($this->url('chapter3-complete'), $payload, $this->cashier)->assertOk(); // idempoten

        $this->assertDatabaseHas('mission_logs', [
            'mission_number' => 3, 'is_passed' => true, 'attempt_count' => 3, 'duration_seconds' => 420,
        ]);
        $this->assertSame(1, \App\Models\MissionLog::where('mission_number', 3)->count());

        $this->postJson($this->url('chapter3-complete'), ['code' => 'total = 1', 'attempt_count' => 1], $this->warehouse)
            ->assertJsonPath('room.phase', 'finished')
            ->assertJsonPath('room.status', 'completed')
            ->assertJsonPath('ending.final_money', 50000)
            // 1000 lulus + 0 bonus (tanpa laba) + 300 − 20 × 2 percobaan tambahan Bab 3
            ->assertJsonPath('ending.score.total', 1260)
            ->assertJsonPath('ending.score.chapter3_attempts', 4);
        Event::assertDispatched(GamePhaseChanged::class, fn ($e) => $e->phase === 'finished');

        $this->getJson('/api/leaderboard', $this->cashier)
            ->assertOk()
            ->assertJsonPath('my_rank', 1)
            ->assertJsonPath('entries.0.is_mine', true)
            ->assertJsonPath('entries.0.score', 1260)
            ->assertJsonPath('entries.0.players.0.avatar_skin', 'female')
            ->assertJsonMissingPath('entries.0.room_code');
    }

    public function test_chapter3_attempt_is_logged_for_dashboard(): void
    {
        $this->reachBonus();
        $this->postJson($this->url('chapter3-attempt'), ['code' => 'x'], $this->cashier)->assertJsonPath('logged', false);
        $this->postJson($this->url('bonus-complete'), [], $this->cashier);

        $this->postJson($this->url('chapter3-attempt'), ['code' => 'print(1)', 'output' => 'NameError'], $this->cashier)
            ->assertCreated();
        $this->assertDatabaseHas('mission_logs', ['mission_number' => 3, 'is_passed' => false]);
    }
}
