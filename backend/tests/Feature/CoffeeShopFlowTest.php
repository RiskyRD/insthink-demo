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

        $a = $this->postJson('/api/rooms', ['player_name' => 'Ayu', 'role' => 'cashier'])->assertCreated();
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

    private function reachChapter2(): void
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
            ->assertJsonPath('room.phase', 'chapter2');

        $this->assertDatabaseCount('mission_logs', 2);
        Event::assertDispatched(GamePhaseChanged::class, fn ($e) => $e->phase === 'chapter2');
    }

    public function test_shop_rules_before_chapter2_and_by_role(): void
    {
        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->cashier)->assertStatus(409);
        $this->reachChapter2();
        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->warehouse)->assertForbidden();
        $this->postJson($this->url('restock'), ['item_key' => 'kopi', 'qty' => 3], $this->cashier)->assertForbidden();
        $this->postJson($this->url('restock'), ['item_key' => 'kopi', 'qty' => 2], $this->warehouse)->assertUnprocessable();
    }

    public function test_serve_order_and_stock_shortage(): void
    {
        $this->reachChapter2();

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
        $this->reachChapter2();

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

    public function test_reaching_target_finishes_game(): void
    {
        $this->reachChapter2();
        Room::where('room_code', $this->code)->update(['shared_money' => 115000]);

        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->cashier)
            ->assertJsonPath('room.phase', 'finished')
            ->assertJsonPath('room.status', 'completed')
            ->assertJsonPath('ending.final_money', 122000);
        Event::assertDispatched(GamePhaseChanged::class, fn ($e) => $e->phase === 'finished');

        $this->postJson($this->url('serve-order'), ['menu_key' => 'pisang_goreng'], $this->cashier)->assertStatus(409);
    }
}
