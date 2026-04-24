import { describe, expect, test } from "bun:test"
import { filterBashOutput } from "../extensions/ce-core/tools/bash-output-filter"

// Helper: generate a large output string
function repeatLines(line: string, count: number): string {
  return Array(count).fill(line).join("\n")
}

function makeOutput(lines: string[]): string {
  return lines.join("\n")
}

function sizeOf(text: string): number {
  return Buffer.byteLength(text, "utf-8")
}

// ============================================================================
// Command Classification
// ============================================================================

describe("bash-output-filter: command classification", () => {
  test("classifies npm install", () => {
    const output = repeatLines("package@1.0.0 installed successfully", 150)
    const result = filterBashOutput({ command: "npm install", output, isError: false })
    expect(result.strategy).toContain("install")
  })

  test("classifies bun add", () => {
    const output = repeatLines("installed pkg successfully", 150)
    const result = filterBashOutput({ command: "bun add react", output, isError: false })
    expect(result.strategy).toContain("install")
  })

  test("classifies pip install", () => {
    const output = repeatLines("Collecting package from PyPI", 150)
    const result = filterBashOutput({ command: "pip install requests", output, isError: false })
    expect(result.strategy).toContain("install")
  })

  test("classifies npm test", () => {
    const output = repeatLines("✓ test passed successfully", 150)
    const result = filterBashOutput({ command: "npm test", output, isError: false })
    expect(result.strategy).toContain("test")
  })

  test("classifies vitest", () => {
    const output = repeatLines("✓ test case passing", 150)
    const result = filterBashOutput({ command: "npx vitest run", output, isError: false })
    expect(result.strategy).toContain("test")
  })

  test("classifies pytest", () => {
    const output = repeatLines("PASSED test_something", 100)
    const result = filterBashOutput({ command: "pytest tests/", output, isError: false })
    expect(result.strategy).toContain("test")
  })

  test("classifies tsc build", () => {
    const output = repeatLines("src/file.ts(10,5): error TS1234", 100)
    const result = filterBashOutput({ command: "tsc --noEmit", output, isError: false })
    expect(result.strategy).toContain("build")
  })

  test("classifies cargo build", () => {
    const output = repeatLines("Compiling crate v0.1.0", 100)
    const result = filterBashOutput({ command: "cargo build", output, isError: false })
    expect(result.strategy).toContain("build")
  })

  test("does NOT filter grep (purpose command)", () => {
    const output = repeatLines("src/file.ts:const x = 1", 100)
    const result = filterBashOutput({ command: "grep -r 'pattern' src/", output, isError: false })
    expect(result.filtered).toBe(false)
  })

  test("does NOT filter git diff (purpose command)", () => {
    const output = repeatLines("+added line", 100)
    const result = filterBashOutput({ command: "git diff HEAD~1", output, isError: false })
    expect(result.filtered).toBe(false)
  })

  test("does NOT filter rg (purpose command)", () => {
    const output = repeatLines("src/file.ts:10:match", 100)
    const result = filterBashOutput({ command: "rg 'pattern'", output, isError: false })
    expect(result.filtered).toBe(false)
  })
})

// ============================================================================
// Thresholds
// ============================================================================

describe("bash-output-filter: thresholds", () => {
  test("does not filter small outputs", () => {
    const output = "hello world"
    const result = filterBashOutput({ command: "npm install", output, isError: false })
    expect(result.filtered).toBe(false)
    expect(result.strategy).toContain("below threshold")
  })

  test("does not filter error outputs", () => {
    const output = repeatLines("error: something failed", 200)
    const result = filterBashOutput({ command: "npm install", output, isError: true })
    expect(result.filtered).toBe(false)
    expect(result.strategy).toContain("error output")
  })

  test("does not filter if reduction < 20%", () => {
    // Output that's mostly unique/error lines — can't be reduced much
    const lines = Array(100).fill(0).map((_, i) => `unique line ${i} with error context ${i * 2}`)
    const output = lines.join("\n")
    // Pad to exceed threshold
    const padded = output + "\n" + repeatLines("x".repeat(50), 50)
    const result = filterBashOutput({ command: "npm install", output: padded, isError: false })
    // If it can't reduce by 20%, it should not filter
    if (result.filtered) {
      expect(result.filteredBytes).toBeLessThan(result.originalBytes * 0.8)
    }
  })
})

// ============================================================================
// Install Filter
// ============================================================================

describe("bash-output-filter: install output", () => {
  test("keeps error and summary lines, removes noise", () => {
    const lines = [
      "npm warn deprecated package@1.0.0",
      "downloading package-a@1.0.0...",
      "downloading package-b@2.0.0...",
      "downloading package-c@3.0.0...",
      "npm ERR! code E404",
      "npm ERR! 404 Not Found - GET https://registry.npmjs.org/missing",
      "downloading package-d@4.0.0...",
      ...Array(300).fill("progress bar line that nobody needs to read"),
      "",
      "added 150 packages in 12s",
      "3 vulnerabilities (1 low, 2 high)",
    ]
    const output = makeOutput(lines)
    const result = filterBashOutput({ command: "npm install", output, isError: false })

    expect(result.filtered).toBe(true)
    expect(result.output).toContain("npm ERR!")
    expect(result.output).toContain("added 150 packages")
    expect(result.output).toContain("vulnerabilities")
    expect(result.output).toContain("npm warn")
    expect(result.filteredBytes).toBeLessThan(result.originalBytes)
  })

  test("keeps bun install summary", () => {
    const lines = [
      ...Array(300).fill("installing package via bun..."),
      "",
      "3 packages installed [1.23s]",
    ]
    const output = makeOutput(lines)
    const result = filterBashOutput({ command: "bun install", output, isError: false })

    expect(result.filtered).toBe(true)
    expect(result.output).toContain("packages installed")
  })
})

// ============================================================================
// Test Filter
// ============================================================================

describe("bash-output-filter: test output", () => {
  test("removes PASS lines, keeps FAIL and summary", () => {
    const lines = [
      "✓ src/utils.test.ts > helper returns correct value",
      "✓ src/utils.test.ts > helper handles edge case",
      "✓ src/utils.test.ts > helper is fast",
      "✓ src/parser.test.ts > parses input",
      "✓ src/parser.test.ts > handles errors",
      "✕ src/main.test.ts > integration test fails",
      "✕ src/main.test.ts > another failure",
      "",
      "Test Suites: 1 failed, 2 passed, 3 total",
      "Tests:       2 failed, 5 passed, 7 total",
      "Time:        3.456s",
    ]
    // Make it big enough to trigger filtering
    const output = makeOutput([...Array(200).fill("✓ some.test.ts > test case " + Math.random()), ...lines])
    const result = filterBashOutput({ command: "npm test", output, isError: false })

    expect(result.filtered).toBe(true)
    expect(result.output).toContain("✕")
    expect(result.output).toContain("Test Suites:")
    expect(result.output).toContain("Tests:")
    // The filter notice
    expect(result.output).toContain("Output filtered")
  })

  test("keeps pytest FAILURES section", () => {
    const lines = [
      ...Array(200).fill("PASSED tests/test_utils.py::test_something"),
      "FAILED tests/test_main.py::test_integration - AssertionError",
      "FAILED tests/test_main.py::test_another - TypeError",
      "",
      "=== FAILURES ===",
      "___ test_integration ___",
      "assert 1 == 2",
      "",
      "1 failed, 200 passed, 3 warnings in 5.67s",
    ]
    const output = makeOutput(lines)
    const result = filterBashOutput({ command: "pytest tests/", output, isError: false })

    expect(result.filtered).toBe(true)
    expect(result.output).toContain("FAILED")
    expect(result.output).toContain("FAILURES")
    expect(result.output).toContain("1 failed, 200 passed")
  })
})

// ============================================================================
// Build Filter
// ============================================================================

describe("bash-output-filter: build output", () => {
  test("keeps errors and deduplicates warnings", () => {
    const lines = [
      "Compiling src/utils.rs",
      "Compiling src/parser.rs",
      "Compiling src/main.rs",
      ...Array(100).fill('warning: unused variable `x` in src/utils.rs:10:5'),
      'warning: unused import `std::collections` in src/parser.rs:20:3',
      "error[E0425]: cannot find value `missing` in this scope",
      "  --> src/main.rs:30:5",
      "",
      "error: could not compile `myapp` due to 1 previous error",
    ]
    const output = makeOutput(lines)
    const result = filterBashOutput({ command: "cargo build", output, isError: false })

    expect(result.filtered).toBe(true)
    expect(result.output).toContain("error[E0425]")
    expect(result.output).toContain("could not compile")
  })

  test("keeps tsc errors with file locations", () => {
    const lines = [
      ...Array(100).fill("src/generated/types.ts(50,3): warning TS6133: 'x' is declared but never used."),
      "src/main.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
      "",
      "Found 1 error.",
    ]
    const output = makeOutput(lines)
    const result = filterBashOutput({ command: "tsc --noEmit", output, isError: false })

    expect(result.filtered).toBe(true)
    expect(result.output).toContain("error TS2322")
    expect(result.output).toContain("Found 1 error")
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe("bash-output-filter: edge cases", () => {
  test("handles piped commands (classifies first command)", () => {
    const output = repeatLines("npm package line", 200)
    const result = filterBashOutput({ command: "npm install | grep -v warning", output, isError: false })
    // First command is npm install → should try to filter
    expect(result.strategy).toContain("install")
  })

  test("handles empty output", () => {
    const result = filterBashOutput({ command: "npm install", output: "", isError: false })
    expect(result.filtered).toBe(false)
  })

  test("preserves fullOutputPath in filter notice", () => {
    const output = repeatLines("installing package...", 300)
    const result = filterBashOutput({
      command: "npm install",
      output,
      isError: false,
      fullOutputPath: "/tmp/pi-bash-abc123.log",
    })
    if (result.filtered) {
      expect(result.output).toContain("/tmp/pi-bash-abc123.log")
    }
  })

  test("handles ANSI escape sequences in large unknown output", () => {
    const output = repeatLines("\x1b[32mSuccess\x1b[0m: operation completed", 200)
    const result = filterBashOutput({ command: "some-unknown-command", output, isError: false })
    // For unknown commands, only filters if above aggressive threshold AND generic helps
    // The output is ~15KB which is below 30KB threshold, so should not filter
    expect(result.filtered).toBe(false)
  })

  test("unknown command above aggressive threshold gets generic filter", () => {
    // 40KB of output with ANSI codes
    const output = repeatLines("\x1b[32mSuccess\x1b[0m: operation completed with lots of text padding here", 500)
    const result = filterBashOutput({ command: "custom-tool --verbose", output, isError: false })
    // Above 30KB threshold → should get generic filter if it reduces enough
    // ANSI removal should reduce size
    if (result.filtered) {
      expect(result.output).not.toContain("\x1b[")
    }
  })
})

// ============================================================================
// Token Savings Estimation
// ============================================================================

describe("bash-output-filter: real-world savings estimation", () => {
  test("npm install: typical output ~50KB → estimate savings", () => {
    const lines = [
      "npm warn deprecated left-pad@1.3.0: this module is deprecated",
      ...Array(500).fill("added 1 package"),
      ...Array(200).fill("progress: downloading https://registry.npmjs.org/package/-/package-1.0.0.tgz"),
      "",
      "added 856 packages in 45s",
      "28 vulnerabilities (5 low, 12 moderate, 8 high, 3 critical)",
      "",
      "Run `npm audit` for details.",
    ]
    const output = makeOutput(lines)
    const result = filterBashOutput({ command: "npm install", output, isError: false })

    console.log(`npm install: ${sizeOf(output)} → ${result.filteredBytes} bytes (${((1 - result.filteredBytes / sizeOf(output)) * 100).toFixed(0)}% reduction)`)
    if (result.filtered) {
      expect(result.filteredBytes).toBeLessThan(sizeOf(output) * 0.5) // At least 50% reduction
    }
  })

  test("vitest: typical output ~30KB → estimate savings", () => {
    const lines = [
      ...Array(300).fill("✓ src/module.test.ts > test case description here"),
      "✕ src/integration.test.ts > should handle error properly",
      "AssertionError: expected true to be false",
      "  at Context.<anonymous> (src/integration.test.ts:25:18)",
      "",
      "Test Files  1 failed | 12 passed (13)",
      "Tests  1 failed | 300 passed (301)",
      "Duration 4.23s",
    ]
    const output = makeOutput(lines)
    const result = filterBashOutput({ command: "npx vitest run", output, isError: false })

    console.log(`vitest: ${sizeOf(output)} → ${result.filteredBytes} bytes (${((1 - result.filteredBytes / sizeOf(output)) * 100).toFixed(0)}% reduction)`)
    if (result.filtered) {
      expect(result.filteredBytes).toBeLessThan(sizeOf(output) * 0.5)
    }
  })
})
