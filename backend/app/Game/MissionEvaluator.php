<?php

namespace App\Game;

/**
 * Memvalidasi hasil eksekusi Pyodide terhadap aturan misi.
 *
 * Kunci jawaban dihitung ulang di server dari masukan yang diuji,
 * jadi target rahasia tidak pernah dikirim ke browser.
 *
 * Catatan: stdout berasal dari browser Teknisi. Untuk prototipe ini klien
 * dipercaya; pemeriksaan statis kode tetap dilakukan di server.
 */
class MissionEvaluator
{
    /** Kata kunci di luar cakupan Chapter 1. */
    private const FORBIDDEN_KEYWORDS = [
        'for', 'while', 'def', 'lambda', 'import', 'from', 'class',
        'try', 'except', 'with', 'return', 'yield', 'global',
    ];

    /**
     * @param  array  $runs  [['inputs' => string[], 'stdout' => ?string, 'error' => ?array{type,message,line}]]
     */
    public function evaluate(int $missionNumber, string $code, array $runs): array
    {
        $mission = MissionCatalog::get($missionNumber);
        $inputCount = count($mission['inputs']);
        $stripped = $this->stripStringsAndComments($code);

        $forbidden = $this->findForbiddenConstructs($stripped);
        $missingVariables = $this->findMissingVariables($stripped, MissionCatalog::requiredVariableNames($mission));
        $cases = array_map(fn (array $run, int $i) => $this->evaluateRun($mission, $run, $i + 1), $runs, array_keys($runs));

        $category = $this->decideCategory($mission, $cases, $forbidden, $missingVariables, $missingBranches);

        return [
            'mission_number' => $missionNumber,
            'is_passed' => $category === null,
            'error_category' => $category,
            'first_error_line' => collect($cases)->pluck('error.line')->filter()->first(),
            'input_count' => $inputCount,
            'forbidden_constructs' => $forbidden,
            'missing_variables' => $missingVariables,
            'missing_branches' => $missingBranches,
            'cases' => $cases,
            'terminal_output' => $this->buildTerminalOutput($cases),
        ];
    }

    private function evaluateRun(array $mission, array $run, int $index): array
    {
        $rawInputs = array_map(fn ($v) => trim((string) $v), $run['inputs'] ?? []);
        $stdout = (string) ($run['stdout'] ?? '');
        $error = $run['error'] ?? null;

        $numbers = $this->parseIntegers($rawInputs);
        $validInputs = $numbers !== null && count($numbers) === count($mission['inputs']);

        $expected = $validInputs ? ($mission['expected'])($numbers) : null;
        $branch = ($validInputs && isset($mission['branch_of'])) ? ($mission['branch_of'])($numbers) : null;
        $actualLines = $this->lastLines($stdout, $expected ? count($expected) : 1);

        $passed = $error === null && $expected !== null && $this->linesMatch($actualLines, $expected);

        return [
            'index' => $index,
            'inputs' => $rawInputs,
            'valid_inputs' => $validInputs,
            'stdout' => $stdout,
            'expected' => $expected,
            'actual' => $actualLines,
            'has_output' => trim($stdout) !== '',
            'branch' => $branch,
            'error' => $error ? [
                'type' => (string) ($error['type'] ?? 'Error'),
                'message' => (string) ($error['message'] ?? ''),
                'line' => isset($error['line']) ? (int) $error['line'] : null,
            ] : null,
            'passed' => $passed,
        ];
    }

    /**
     * Urutan prioritas: aturan kurikulum → sintaks → variabel wajib → galat
     * saat berjalan → data uji → keluaran → kelengkapan uji (khusus Misi 3).
     */
    private function decideCategory(array $mission, array $cases, array $forbidden, array $missingVariables, ?array &$missingBranches): ?string
    {
        $missingBranches = [];
        $errorTypes = collect($cases)->pluck('error.type')->filter();

        if ($forbidden) {
            return ErrorTranslator::FORBIDDEN_CONSTRUCT;
        }
        if ($errorTypes->contains(fn ($t) => ErrorTranslator::categoryFromPython($t) === ErrorTranslator::SYNTAX_ERROR)) {
            return ErrorTranslator::SYNTAX_ERROR;
        }
        if ($missingVariables) {
            return ErrorTranslator::MISSING_VARIABLE;
        }
        if ($errorTypes->isNotEmpty()) {
            return ErrorTranslator::categoryFromPython($errorTypes->first());
        }
        if (count($cases) < $mission['min_runs'] && ! $mission['branches']) {
            return ErrorTranslator::INVALID_INPUT;
        }
        if (collect($cases)->contains(fn ($c) => ! $c['valid_inputs'])) {
            return ErrorTranslator::INVALID_INPUT;
        }
        if (collect($cases)->every(fn ($c) => ! $c['has_output'])) {
            return ErrorTranslator::NO_OUTPUT;
        }
        if (collect($cases)->contains(fn ($c) => ! $c['passed'])) {
            return ErrorTranslator::WRONG_OUTPUT;
        }
        if ($mission['branches']) {
            $tested = collect($cases)->pluck('branch')->unique()->all();
            $missingBranches = array_values(array_diff($mission['branches'], $tested));
            if ($missingBranches) {
                return ErrorTranslator::INCOMPLETE_TEST;
            }
        }

        return null;
    }

    /** Ganti isi string dengan "" dan hapus komentar agar pemeriksaan statis tidak tertipu. */
    private function stripStringsAndComments(string $code): string
    {
        $pattern = '/("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\n])*\'|#[^\n]*)/';

        return preg_replace_callback($pattern, fn ($m) => str_starts_with($m[0], '#') ? '' : '""', $code) ?? $code;
    }

    private function findForbiddenConstructs(string $stripped): array
    {
        $found = [];
        foreach (self::FORBIDDEN_KEYWORDS as $keyword) {
            if (preg_match('/\b'.$keyword.'\b/', $stripped)) {
                $found[] = $keyword;
            }
        }
        if (preg_match('/[\[\]]/', $stripped)) {
            $found[] = 'list [ ]';
        }
        if (preg_match('/[{}]/', $stripped)) {
            $found[] = 'dictionary { }';
        }

        return $found;
    }

    private function findMissingVariables(string $stripped, array $required): array
    {
        return array_values(array_filter(
            $required,
            fn (string $name) => ! preg_match('/^[ \t]*'.preg_quote($name, '/').'[ \t]*=(?!=)/m', $stripped),
        ));
    }

    /** @return int[]|null */
    private function parseIntegers(array $raw): ?array
    {
        $numbers = [];
        foreach ($raw as $value) {
            if (! preg_match('/^[+-]?\d{1,10}$/', $value)) {
                return null;
            }
            $n = (int) $value;
            if (abs($n) > MissionCatalog::MAX_ABS_INPUT) {
                return null;
            }
            $numbers[] = $n;
        }

        return $numbers;
    }

    private function lastLines(string $stdout, int $count): array
    {
        $lines = array_values(array_filter(
            preg_split('/\r\n|\r|\n/', $stdout),
            fn ($l) => trim($l) !== '',
        ));

        return array_slice($lines, -$count);
    }

    private function linesMatch(array $actual, array $expected): bool
    {
        if (count($actual) !== count($expected)) {
            return false;
        }
        foreach ($expected as $i => $exp) {
            if (! $this->lineMatches($actual[$i], $exp)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Cocok bila baris sama persis, atau diakhiri nilai yang diharapkan
     * setelah spasi/titik dua/sama dengan (mis. "Laba bersih: 550000"),
     * sehingga teks prompt input() yang menempel tidak menggagalkan uji.
     */
    private function lineMatches(string $line, string $expected): bool
    {
        $normalize = fn (string $s) => mb_strtoupper(preg_replace('/\s+/u', ' ', trim(str_replace(['"', "'"], '', $s))));
        $l = $normalize($line);
        $e = $normalize($expected);

        return $l === $e || preg_match('/(^|[\s:=])'.preg_quote($e, '/').'$/u', $l) === 1;
    }

    private function buildTerminalOutput(array $cases): string
    {
        $blocks = array_map(function (array $c) {
            $header = "── Uji {$c['index']} | masukan: ".(implode(', ', $c['inputs']) ?: '-').' ──';
            $body = rtrim($c['stdout']);
            if ($c['error']) {
                $line = $c['error']['line'] ? " (baris {$c['error']['line']})" : '';
                $body .= ($body !== '' ? "\n" : '')."[Galat{$line}] {$c['error']['type']}: {$c['error']['message']}";
            }

            return $header."\n".($body !== '' ? $body : '(tidak ada keluaran)');
        }, $cases);

        return mb_substr(implode("\n\n", $blocks), 0, 20000);
    }
}
