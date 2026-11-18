<?php

namespace Tests\Unit;

use App\Game\ErrorTranslator;
use App\Game\MissionEvaluator;
use App\Game\ShopCatalog;
use Tests\TestCase;

class MissionEvaluatorTest extends TestCase
{
    private MissionEvaluator $evaluator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->evaluator = new MissionEvaluator;
    }

    private const M1_CODE = <<<'PY'
biaya_per_bungkus = int(input("Biaya per bungkus: "))
harga_jual = int(input("Harga jual: "))
jumlah_bungkus = int(input("Jumlah bungkus: "))
modal = biaya_per_bungkus * jumlah_bungkus
omzet = harga_jual * jumlah_bungkus
print(modal)
print(omzet)
PY;

    private const M3_CODE = <<<'PY'
biaya_per_bungkus = int(input())
harga_jual = int(input())
jumlah_bungkus = int(input())
biaya_operasional = int(input())
modal = biaya_per_bungkus * jumlah_bungkus
omzet = harga_jual * jumlah_bungkus
laba_bersih = omzet - modal - biaya_operasional
if laba_bersih >= 2000000:
    print("LAYAK EKSPANSI")
elif laba_bersih > 0:
    print("PERTAHANKAN USAHA")
else:
    print("EVALUASI USAHA")
PY;

    public function test_mission1_passes_even_with_input_prompts_glued_to_output(): void
    {
        $r = $this->evaluator->evaluate(1, self::M1_CODE, [[
            'inputs' => ['6000', '10000', '50'],
            'stdout' => "Biaya per bungkus: Harga jual: Jumlah bungkus: 300000\n500000\n",
        ]]);

        $this->assertTrue($r['is_passed']);
        $this->assertNull($r['error_category']);
    }

    public function test_mission1_wrong_formula_is_wrong_output(): void
    {
        $r = $this->evaluator->evaluate(1, self::M1_CODE, [[
            'inputs' => ['6000', '10000', '50'],
            'stdout' => "300000\n10050\n",
        ]]);

        $this->assertSame(ErrorTranslator::WRONG_OUTPUT, $r['error_category']);
    }

    public function test_loop_is_rejected_but_keyword_inside_string_is_allowed(): void
    {
        $withLoop = self::M1_CODE."\nfor i in range(3):\n    print(i)";
        $r = $this->evaluator->evaluate(1, $withLoop, [['inputs' => ['1', '2', '3'], 'stdout' => "3\n6"]]);
        $this->assertSame(ErrorTranslator::FORBIDDEN_CONSTRUCT, $r['error_category']);

        $inString = str_replace('"Harga jual: "', '"Harga for while: "', self::M1_CODE)."\n# for komentar";
        $r = $this->evaluator->evaluate(1, $inString, [['inputs' => ['1', '2', '3'], 'stdout' => "3\n6"]]);
        $this->assertTrue($r['is_passed']);
    }

    public function test_missing_variable_is_reported(): void
    {
        $code = str_replace('omzet', 'pendapatan', self::M1_CODE);
        $r = $this->evaluator->evaluate(1, $code, [['inputs' => ['1', '2', '3'], 'stdout' => "3\n6"]]);

        $this->assertSame(ErrorTranslator::MISSING_VARIABLE, $r['error_category']);
        $this->assertSame(['omzet'], $r['missing_variables']);
    }

    public function test_python_value_error_is_categorized(): void
    {
        $r = $this->evaluator->evaluate(1, self::M1_CODE, [[
            'inputs' => ['6.000', '10000', '50'],
            'stdout' => '',
            'error' => ['type' => 'ValueError', 'message' => "invalid literal for int() with base 10: '6.000'", 'line' => 1],
        ]]);

        $this->assertSame(ErrorTranslator::VALUE_ERROR, $r['error_category']);
    }

    public function test_mission2_negative_profit(): void
    {
        $code = <<<'PY'
biaya_per_bungkus = int(input())
harga_jual = int(input())
jumlah_bungkus = int(input())
biaya_operasional = int(input())
modal = biaya_per_bungkus * jumlah_bungkus
omzet = harga_jual * jumlah_bungkus
laba_bersih = omzet - modal - biaya_operasional
print("Laba bersih:", laba_bersih)
PY;
        $r = $this->evaluator->evaluate(2, $code, [['inputs' => ['6000', '10000', '50', '300000'], 'stdout' => 'Laba bersih: -100000']]);
        $this->assertTrue($r['is_passed']);

        // 100000 tidak boleh dianggap cocok dengan -100000
        $r = $this->evaluator->evaluate(2, $code, [['inputs' => ['6000', '10000', '50', '300000'], 'stdout' => '100000']]);
        $this->assertSame(ErrorTranslator::WRONG_OUTPUT, $r['error_category']);
    }

    public function test_mission3_requires_all_branches(): void
    {
        $two = [
            ['inputs' => ['6000', '10000', '800', '500000'], 'stdout' => 'LAYAK EKSPANSI'],
            ['inputs' => ['6000', '10000', '200', '250000'], 'stdout' => 'Pertahankan Usaha'],
        ];
        $r = $this->evaluator->evaluate(3, self::M3_CODE, $two);
        $this->assertSame(ErrorTranslator::INCOMPLETE_TEST, $r['error_category']);
        $this->assertSame(['EVALUASI USAHA'], $r['missing_branches']);

        $all = [...$two, ['inputs' => ['6000', '10000', '50', '300000'], 'stdout' => 'EVALUASI USAHA']];
        $this->assertTrue($this->evaluator->evaluate(3, self::M3_CODE, $all)['is_passed']);
    }

    public function test_wrong_input_count_is_invalid_input(): void
    {
        $r = $this->evaluator->evaluate(3, self::M3_CODE, [['inputs' => ['6000', '10000'], 'stdout' => 'LAYAK EKSPANSI']]);
        $this->assertSame(ErrorTranslator::INVALID_INPUT, $r['error_category']);
    }

    public function test_role_catalogs_never_leak_the_other_roles_secrets(): void
    {
        $cashier = json_encode(ShopCatalog::forCashier());
        $warehouse = json_encode(ShopCatalog::forWarehouse());

        // Kasir tidak boleh tahu harga kulakan; Stok Gudang tidak boleh tahu resep & harga jual.
        $this->assertStringNotContainsString('pack_price', $cashier);
        foreach (['recipe', 'menu', 'Es Kopi Gula Aren', '"price"'] as $secret) {
            $this->assertStringNotContainsString($secret, $warehouse, "'{$secret}' bocor ke Stok Gudang");
        }
    }
}
