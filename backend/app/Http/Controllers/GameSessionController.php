<?php

namespace App\Http\Controllers;

use App\Events\AdminMonitorPulse;
use App\Events\GamePhaseChanged;
use App\Events\RoomUpdated;
use App\Events\ShopStateUpdated;
use App\Game\RoleProjector;
use App\Game\ShopCatalog;
use App\Models\Room;
use App\Models\RoomPlayer;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class GameSessionController extends Controller
{
    public function __construct(
        private readonly RoleProjector $projector,
    ) {}

    /**
     * POST /api/rooms
     * Tanpa room_code → buat ruangan baru. Dengan room_code → gabung ke peran yang masih kosong.
     */
    public function createOrJoin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'player_name' => ['required', 'string', 'min:2', 'max:50'],
            'room_code' => ['nullable', 'string', 'size:6', 'alpha_num'],
            'role' => ['nullable', Rule::in(RoomPlayer::ROLES)],
        ], [
            'player_name.required' => 'Nama pemain wajib diisi.',
            'player_name.min' => 'Nama pemain minimal 2 huruf.',
            'player_name.max' => 'Nama pemain maksimal 50 huruf.',
            'room_code.size' => 'Kode ruangan harus terdiri dari 6 karakter.',
            'room_code.alpha_num' => 'Kode ruangan hanya berisi huruf dan angka.',
            'role.in' => 'Peran harus Kasir atau Stok Gudang.',
        ]);

        [$plainToken, $hashedToken] = RoomPlayer::issueToken();
        $name = trim(strip_tags($data['player_name']));

        try {
            [$room, $player, $isNewRoom] = DB::transaction(function () use ($data, $name, $hashedToken) {
                if (empty($data['room_code'])) {
                    $room = Room::create([
                        'room_code' => Room::generateUniqueCode(),
                        'status' => Room::STATUS_WAITING,
                        'current_mission' => 1,
                        'phase' => Room::PHASE_PROLOG,
                        'phase_started_at' => now(),
                    ]);
                    $player = $room->players()->create([
                        'player_name' => $name,
                        'role' => $data['role'] ?? RoomPlayer::ROLE_CASHIER,
                        'session_token' => $hashedToken,
                    ]);

                    return [$room, $player, true];
                }

                $room = Room::where('room_code', strtoupper($data['room_code']))->lockForUpdate()->first();
                abort_if(! $room, 404, 'Ruangan dengan kode tersebut tidak ditemukan. Periksa lagi kodenya.');
                abort_if($room->status === Room::STATUS_COMPLETED, 409, 'Permainan di ruangan ini sudah selesai.');

                $available = array_values(array_diff(RoomPlayer::ROLES, $room->players()->pluck('role')->all()));
                abort_if(empty($available), 409, 'Ruangan sudah penuh. Setiap ruangan hanya untuk 2 pemain.');

                $role = $data['role'] ?? $available[0];
                abort_unless(
                    in_array($role, $available, true),
                    409,
                    'Peran '.RoomPlayer::roleLabel($role).' sudah diambil pemain lain.',
                );

                $player = $room->players()->create([
                    'player_name' => $name,
                    'role' => $role,
                    'session_token' => $hashedToken,
                ]);

                if ($room->players()->count() === count(RoomPlayer::ROLES)) {
                    $room->update(['status' => Room::STATUS_ACTIVE, 'started_at' => now()]);
                }

                return [$room, $player, false];
            });
        } catch (QueryException $e) {
            // Pelanggaran unique(room_id, role) jika dua siswa menekan "Gabung" bersamaan.
            if ((string) $e->getCode() !== '23000') {
                throw $e;
            }
            abort(409, 'Peran tersebut baru saja diambil pemain lain. Silakan coba lagi.');
        }

        $room->load('players');

        if (! $isNewRoom) {
            $this->safeBroadcast(new RoomUpdated($room->room_code, $room->publicSummary(), 'player_joined'));
        }
        $this->notifyMonitor();

        return response()->json([
            'session_token' => $plainToken,
            ...$this->projector->state($room, $player),
        ], $isNewRoom ? 201 : 200);
    }

    /**
     * GET /api/rooms/{roomCode}/state
     * Pemulihan state setelah browser di-refresh, difilter sesuai peran.
     */
    public function getState(string $roomCode, Request $request): JsonResponse
    {
        $player = $this->authorizePlayer($request, $roomCode);

        return response()->json($this->projector->state($player->room, $player));
    }

    /**
     * POST /api/rooms/{roomCode}/prolog-ready
     * Menandai pemain siap. Jika kedua pemain siap → fase "chapter1".
     */
    public function prologReady(string $roomCode, Request $request): JsonResponse
    {
        $player = $this->authorizePlayer($request, $roomCode);

        [$room, $me, $events] = $this->withRoomLock($player->room_id, fn () => DB::transaction(function () use ($player) {
            [$room, $me] = $this->lockRoomAndPlayer($player);

            // Idempoten: klik ganda atau fase sudah lewat → kembalikan state apa adanya.
            if ($room->phase !== Room::PHASE_PROLOG || $me->is_prolog_ready) {
                return [$room, $me, []];
            }

            $me->update(['is_prolog_ready' => true]);
            $room->load('players');

            if ($room->isFull() && $room->players->every(fn (RoomPlayer $p) => $p->is_prolog_ready)) {
                return [$room, $me, [$this->changePhase($room, Room::PHASE_CHAPTER1)]];
            }

            return [$room, $me, [new RoomUpdated($room->room_code, $room->publicSummary(), 'prolog_ready')]];
        }));

        $this->broadcastAll($events);

        return response()->json($this->projector->state($room, $me));
    }

    /**
     * POST /api/rooms/{roomCode}/chapter1-complete
     * Menyimpan log kode dari Pyodide dan menandai pemain selesai Chapter 1.
     * Jika kedua pemain selesai → fase "chapter2".
     */
    public function chapter1Complete(string $roomCode, Request $request): JsonResponse
    {
        $player = $this->authorizePlayer($request, $roomCode);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:5000'],
            'output' => ['nullable', 'string', 'max:5000'],
        ], [
            'code.required' => 'Kode program masih kosong.',
            'code.max' => 'Kode program terlalu panjang (maksimal 5000 karakter).',
            'output.max' => 'Keluaran program terlalu panjang (maksimal 5000 karakter).',
        ]);

        [$room, $me, $events] = $this->withRoomLock($player->room_id, fn () => DB::transaction(function () use ($player, $data) {
            [$room, $me] = $this->lockRoomAndPlayer($player);

            abort_if($room->phase === Room::PHASE_PROLOG, 409, 'Chapter 1 belum dimulai. Selesaikan prolog bersama pasanganmu dulu.');

            if ($room->phase !== Room::PHASE_CHAPTER1 || $me->is_chapter1_done) {
                return [$room, $me, []];
            }

            $startedAt = $room->phase_started_at ?? $room->started_at;
            $room->missionLogs()->create([
                'room_player_id' => $me->id,
                'mission_number' => 1,
                'submitted_code' => $data['code'],
                'terminal_output' => $data['output'] ?? '',
                'is_passed' => true,
                'error_category' => null,
                'duration_seconds' => $startedAt ? max(0, (int) $startedAt->diffInSeconds(now())) : 0,
            ]);

            $me->update(['is_chapter1_done' => true]);
            $room->load('players');

            if ($room->isFull() && $room->players->every(fn (RoomPlayer $p) => $p->is_chapter1_done)) {
                return [$room, $me, [$this->changePhase($room, Room::PHASE_CHAPTER2)]];
            }

            return [$room, $me, [new RoomUpdated($room->room_code, $room->publicSummary(), 'chapter1_done')]];
        }));

        $this->broadcastAll($events);

        return response()->json($this->projector->state($room, $me));
    }

    /**
     * POST /api/rooms/{roomCode}/chapter1-attempt
     * Mencatat uji kode Chapter 1 yang GAGAL (is_passed = false) di mission_logs.
     * Tidak mengubah fase maupun state kedai; hanya dipakai dashboard fasilitator.
     */
    public function chapter1Attempt(string $roomCode, Request $request): JsonResponse
    {
        $player = $this->authorizePlayer($request, $roomCode);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:5000'],
            'output' => ['nullable', 'string', 'max:5000'],
            'error_category' => ['nullable', 'string', 'max:40'],
        ]);

        $room = $player->room;
        if ($room->phase !== Room::PHASE_CHAPTER1 || $player->is_chapter1_done) {
            return response()->json(['logged' => false]);
        }

        $startedAt = $room->phase_started_at ?? $room->started_at;
        $room->missionLogs()->create([
            'room_player_id' => $player->id,
            'mission_number' => 1,
            'submitted_code' => $data['code'],
            'terminal_output' => $data['output'] ?? '',
            'is_passed' => false,
            'error_category' => $data['error_category'] ?? null,
            'duration_seconds' => $startedAt ? max(0, (int) $startedAt->diffInSeconds(now())) : 0,
        ]);

        $this->notifyMonitor();

        return response()->json(['logged' => true], 201);
    }

    /**
     * POST /api/rooms/{roomCode}/serve-order
     * Khusus Kasir. Memakai bahan sesuai resep, menambah uang kas, dan mengecek target.
     */
    public function serveOrder(string $roomCode, Request $request): JsonResponse
    {
        $player = $this->authorizePlayer($request, $roomCode);
        abort_unless($player->isCashier(), 403, 'Hanya Kasir yang dapat melayani pesanan pelanggan.');

        $data = $request->validate([
            'menu_key' => ['required', 'string', Rule::in(ShopCatalog::menuKeys())],
        ], [
            'menu_key.required' => 'Pilih menu yang dipesan pelanggan.',
            'menu_key.in' => 'Menu tersebut tidak tersedia di kedai.',
        ]);

        [$room, $me, $events] = $this->withRoomLock($player->room_id, fn () => DB::transaction(function () use ($player, $data) {
            [$room, $me] = $this->lockRoomAndPlayer($player);
            $this->ensureShopOpen($room);

            $menu = ShopCatalog::MENU[$data['menu_key']];
            $inventory = $room->normalizedInventory();

            $missing = [];
            foreach ($menu['recipe'] as $item => $qty) {
                if ($inventory[$item] < $qty) {
                    $missing[] = [
                        'item_key' => $item,
                        'name' => ShopCatalog::supplyName($item),
                        'needed' => $qty,
                        'available' => $inventory[$item],
                    ];
                }
            }

            if ($missing) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Stok tidak cukup untuk membuat '.$menu['name'].': '
                        .implode(', ', array_column($missing, 'name'))
                        .' kurang. Minta Stok Gudang untuk kulakan dulu, ya.',
                    'missing_items' => $missing,
                ], 409));
            }

            $delta = [];
            foreach ($menu['recipe'] as $item => $qty) {
                $inventory[$item] -= $qty;
                $delta[$item] = -$qty;
            }

            $room->inventory = $inventory;
            $room->shared_money += $menu['price'];
            $room->customers_served += 1;
            $room->save();

            $room->load('players');
            $events = [];

            if ($room->shared_money >= $room->target_money) {
                $events[] = $this->changePhase($room, Room::PHASE_FINISHED);
            }

            array_unshift($events, new ShopStateUpdated($room->room_code, $room->shopState(), $room->publicSummary(), [
                'type' => 'serve',
                'role' => $me->role,
                'by' => $me->player_name,
                'key' => $data['menu_key'],
                'label' => $menu['name'],
                'money_delta' => $menu['price'],
                'inventory_delta' => $delta,
            ]));

            return [$room, $me, $events];
        }));

        $this->broadcastAll($events);

        return response()->json($this->projector->state($room, $me));
    }

    /**
     * POST /api/rooms/{roomCode}/restock
     * Khusus Stok Gudang. Membeli paket bahan (kelipatan 3 unit) dari uang kas bersama.
     */
    public function restock(string $roomCode, Request $request): JsonResponse
    {
        $player = $this->authorizePlayer($request, $roomCode);
        abort_unless($player->isWarehouse(), 403, 'Hanya petugas Stok Gudang yang dapat kulakan bahan.');

        $data = $request->validate([
            'item_key' => ['required', 'string', Rule::in(ShopCatalog::supplyKeys())],
            'qty' => ['required', 'integer', 'min:'.ShopCatalog::PACK_SIZE, 'max:'.ShopCatalog::MAX_STOCK, 'multiple_of:'.ShopCatalog::PACK_SIZE],
        ], [
            'item_key.required' => 'Pilih bahan yang ingin dikulak.',
            'item_key.in' => 'Bahan tersebut tidak dijual oleh pemasok desa.',
            'qty.required' => 'Jumlah kulakan wajib diisi.',
            'qty.integer' => 'Jumlah kulakan harus berupa bilangan bulat.',
            'qty.min' => 'Kulakan minimal 1 paket (3 unit).',
            'qty.max' => 'Jumlah kulakan melebihi kapasitas gudang.',
            'qty.multiple_of' => 'Bahan hanya dijual per paket isi 3 unit.',
        ]);

        [$room, $me, $events] = $this->withRoomLock($player->room_id, fn () => DB::transaction(function () use ($player, $data) {
            [$room, $me] = $this->lockRoomAndPlayer($player);
            $this->ensureShopOpen($room);

            $item = $data['item_key'];
            $qty = (int) $data['qty'];
            $name = ShopCatalog::supplyName($item);
            $cost = intdiv($qty, ShopCatalog::PACK_SIZE) * ShopCatalog::SUPPLIES[$item]['pack_price'];
            $inventory = $room->normalizedInventory();

            abort_if(
                $inventory[$item] + $qty > ShopCatalog::MAX_STOCK,
                409,
                "Gudang tidak muat: stok {$name} saat ini {$inventory[$item]} unit, "
                    .'maksimal '.ShopCatalog::MAX_STOCK.' unit per bahan. Jual dulu sebelum kulakan lagi.',
            );
            abort_if(
                $room->shared_money < $cost,
                409,
                'Uang kas tidak cukup untuk kulakan '.$name.'. Dibutuhkan Rp'.number_format($cost, 0, ',', '.')
                    .', kas saat ini Rp'.number_format($room->shared_money, 0, ',', '.').'.',
            );

            $inventory[$item] += $qty;
            $room->inventory = $inventory;
            $room->shared_money -= $cost;
            $room->save();
            $room->load('players');

            return [$room, $me, [new ShopStateUpdated($room->room_code, $room->shopState(), $room->publicSummary(), [
                'type' => 'restock',
                'role' => $me->role,
                'by' => $me->player_name,
                'key' => $item,
                'label' => $name,
                'money_delta' => -$cost,
                'inventory_delta' => [$item => $qty],
            ])]];
        }));

        $this->broadcastAll($events);

        return response()->json($this->projector->state($room, $me));
    }

    // ------------------------------------------------------------------

    private function authorizePlayer(Request $request, string $roomCode): RoomPlayer
    {
        /** @var RoomPlayer $player */
        $player = $request->user('room');
        abort_unless(
            $player && strtoupper($roomCode) === $player->room->room_code,
            403,
            'Kamu tidak terdaftar di ruangan ini.',
        );

        return $player;
    }

    /**
     * Satu kunci per ruangan untuk semua perubahan state (fase, kas, stok),
     * sehingga permintaan Kasir dan Stok Gudang diproses bergiliran.
     * block() menunggu sebentar alih-alih langsung menolak, karena kedua
     * pemain wajar menekan tombol hampir bersamaan.
     */
    private function withRoomLock(int $roomId, callable $callback): mixed
    {
        try {
            return Cache::lock("room:{$roomId}:state", 10)->block(5, $callback);
        } catch (LockTimeoutException) {
            abort(429, 'Kedai sedang memproses permintaan lain. Coba lagi sebentar, ya.');
        }
    }

    /** @return array{0: Room, 1: RoomPlayer} */
    private function lockRoomAndPlayer(RoomPlayer $player): array
    {
        $room = Room::whereKey($player->room_id)->lockForUpdate()->firstOrFail();
        $me = RoomPlayer::whereKey($player->id)->lockForUpdate()->firstOrFail();
        $room->load('players');

        return [$room, $me];
    }

    private function ensureShopOpen(Room $room): void
    {
        abort_if($room->phase === Room::PHASE_FINISHED, 409, 'Target pendapatan sudah tercapai. Kedai sudah tutup untuk hari ini.');
        abort_unless(
            $room->phase === Room::PHASE_CHAPTER2,
            409,
            'Kedai belum buka. Selesaikan Chapter 1 bersama pasanganmu dulu.',
        );
    }

    private function changePhase(Room $room, string $phase): GamePhaseChanged
    {
        $previous = $room->phase;
        $room->moveToPhase($phase);
        $room->load('players');

        return new GamePhaseChanged($room->room_code, $previous, $phase, $room->publicSummary(), $room->shopState());
    }

    /** Broadcast dilakukan SETELAH transaksi tersimpan dan kunci dilepas. */
    private function broadcastAll(array $events): void
    {
        foreach ($events as $event) {
            $this->safeBroadcast($event);
        }

        if ($events) {
            $this->notifyMonitor();
        }
    }

    /** Sinyal tanpa data ke dashboard fasilitator (channel publik admin.monitor). */
    private function notifyMonitor(): void
    {
        $this->safeBroadcast(new AdminMonitorPulse);
    }

    /** Kegagalan Reverb tidak boleh membatalkan state yang sudah tersimpan. */
    private function safeBroadcast(object $event): void
    {
        try {
            broadcast($event);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
