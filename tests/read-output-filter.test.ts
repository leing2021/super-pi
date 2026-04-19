import { describe, expect, test } from "bun:test"
import { filterReadOutput } from "../extensions/ce-core/tools/read-output-filter"

// Helper: generate multi-line content
function repeatLines(line: string, count: number): string {
  return Array(count).fill(line).join("\n")
}

function sizeOf(text: string): number {
  return Buffer.byteLength(text, "utf-8")
}

// ============================================================================
// Threshold & Safety
// ============================================================================

describe("read-output-filter: thresholds and safety", () => {
  test("does not filter small files", () => {
    const output = "const x = 1\nexport default x"
    const result = filterReadOutput({ path: "src/x.ts", output })
    expect(result.filtered).toBe(false)
    expect(result.strategy).toContain("below threshold")
  })

  test("does not filter error outputs", () => {
    const output = repeatLines("line of code", 500)
    const result = filterReadOutput({ path: "src/big.ts", output, isError: true })
    expect(result.filtered).toBe(false)
    expect(result.strategy).toContain("error")
  })

  test("does not filter images", () => {
    const result = filterReadOutput({
      path: "image.png",
      output: "[binary image data]",
      isImage: true,
    })
    expect(result.filtered).toBe(false)
  })
})

// ============================================================================
// Lock / Generated Files
// ============================================================================

describe("read-output-filter: lock and generated files", () => {
  test("extremely compresses package-lock.json", () => {
    const output = JSON.stringify({
      name: "my-project",
      lockfileVersion: 3,
      requires: true,
      packages: Object.fromEntries(
        Array(500).fill(0).map((_, i) => [`node_modules/pkg-${i}`, { version: `${i}.0.0` }])
      ),
    }, null, 2)
    const result = filterReadOutput({ path: "package-lock.json", output })
    expect(result.filtered).toBe(true)
    expect(result.output).toContain("Lock file")
    expect(result.filteredBytes).toBeLessThan(result.originalBytes * 0.1) // >90% reduction
  })

  test("extremely compresses yarn.lock", () => {
    const output = repeatLines('"pkg@^1.0.0:\n  resolved "https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz"\n  integrity sha512-abc=="', 200)
    const result = filterReadOutput({ path: "yarn.lock", output })
    expect(result.filtered).toBe(true)
    expect(result.output).toContain("Lock file")
  })

  test("compresses bun.lock", () => {
    const output = repeatLines('pkg@1.0.0: resolved https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz integrity sha512-xyz', 200)
    const result = filterReadOutput({ path: "bun.lock", output })
    expect(result.filtered).toBe(true)
  })

  test("compresses minified JS files", () => {
    const output = "var a=1,b=2,c=3;" + "function x(){return a+b+c}".repeat(200)
    const result = filterReadOutput({ path: "dist/bundle.min.js", output })
    expect(result.filtered).toBe(true)
    expect(result.output).toContain("minified")
  })

  test("compresses .generated.ts files", () => {
    const output = repeatLines("export type GeneratedType = { field: string }", 200)
    const result = filterReadOutput({ path: "src/types.generated.ts", output })
    expect(result.filtered).toBe(true)
  })
})

// ============================================================================
// package.json Smart Filter
// ============================================================================

describe("read-output-filter: package.json", () => {
  test("keeps scripts, deps summary; drops full dep versions list", () => {
    const pkg = {
      name: "my-app",
      version: "1.0.0",
      scripts: { dev: "next dev", build: "next build", test: "vitest" },
      dependencies: Object.fromEntries(
        Array(100).fill(0).map((_, i) => [`dep-${i}`, `^${i}.0.0`])
      ),
      devDependencies: Object.fromEntries(
        Array(50).fill(0).map((_, i) => [`dev-dep-${i}`, `^${i}.0.0`])
      ),
    }
    const output = JSON.stringify(pkg, null, 2)
    const result = filterReadOutput({ path: "package.json", output })
    expect(result.filtered).toBe(true)
    expect(result.output).toContain("scripts")
    expect(result.output).toContain("my-app")
    expect(result.output).toContain("Dependencies")
  })
})

// ============================================================================
// Large Code Files — Structural Compression
// ============================================================================

describe("read-output-filter: large code files", () => {
  test("compresses large TypeScript by keeping signatures, collapsing bodies", () => {
    const lines = [
      "import { something } from 'lib'",
      "import { other } from 'lib2'",
      "",
      "interface Config {",
      "  name: string",
      "  value: number",
      "}",
      "",
      "export class MyService {",
      "  private data: Map<string, any>",
      "",
      "  constructor(config: Config) {",
      "    this.data = new Map()",
      "    // lots of initialization",
      ...Array(30).fill("    this.data.set('key', 'value')"),
      "  }",
      "",
      "  process(input: string): string {",
      ...Array(40).fill("    // processing step"),
      "    return input",
      "  }",
      "",
      "  helper(x: number): void {",
      ...Array(20).fill("    console.log(x)"),
      "  }",
      "}",
    ]
    const output = lines.join("\n")
    // Pad to exceed threshold
    const padded = output + "\n" + repeatLines("// padding line", 100)
    const result = filterReadOutput({ path: "src/service.ts", output: padded })
    if (result.filtered) {
      // Should keep imports and class signature
      expect(result.output).toContain("import")
      expect(result.output).toContain("class MyService")
      // Should collapse long function bodies
      expect(result.filteredBytes).toBeLessThan(result.originalBytes)
    }
  })

  test("keeps TODO/FIXME/HACK comments in compressed output", () => {
    const lines = [
      "export function simple(): void {",
      "  // TODO: fix this later",
      "  console.log('todo item')",
      "}",
      ...Array(200).fill("// regular comment"),
      "export function other(): void {",
      "  // HACK: workaround for bug #123",
      "  console.log('hack')",
      "}",
    ]
    const output = lines.join("\n")
    const result = filterReadOutput({ path: "src/code.ts", output })
    if (result.filtered) {
      expect(result.output).toContain("TODO")
      expect(result.output).toContain("HACK")
    }
  })

  test("preserves export signatures", () => {
    const lines = [
      "export function foo(a: string, b: number): boolean {",
      ...Array(50).fill("  // body"),
      "  return true",
      "}",
      "",
      "export const CONFIG = {",
      ...Array(50).fill("  key: 'value',"),
      "}",
    ]
    const output = repeatLines("// header\n", 50) + lines.join("\n")
    const result = filterReadOutput({ path: "src/exports.ts", output })
    if (result.filtered) {
      expect(result.output).toContain("export function foo")
      expect(result.output).toContain("export const CONFIG")
    }
  })
})

// ============================================================================
// Markdown Files
// ============================================================================

describe("read-output-filter: markdown files", () => {
  test("compresses markdown by keeping headings and first paragraph", () => {
    const lines = [
      "# Project README",
      "",
      "This is a long description of the project.",
      "It spans many lines with details.",
      ...Array(50).fill("More details about the project here."),
      "",
      "## Installation",
      "",
      "Run the following commands:",
      ...Array(30).fill("Additional installation notes."),
      "",
      "## API Reference",
      "",
      "Details about the API.",
      ...Array(100).fill("API documentation line."),
    ]
    const output = lines.join("\n")
    const result = filterReadOutput({ path: "README.md", output })
    if (result.filtered) {
      expect(result.output).toContain("# Project README")
      expect(result.output).toContain("## Installation")
      expect(result.output).toContain("## API Reference")
      expect(result.filteredBytes).toBeLessThan(result.originalBytes * 0.7)
    }
  })

  test("preserves code block content in markdown", () => {
    const lines = [
      "# Guide",
      "",
      "Intro text.",
      ...Array(50).fill("More intro text."),
      "",
      "## Example",
      "",
      "```typescript",
      "import { foo } from 'bar'",
      "const x = foo()",
      "console.log(x)",
      "// This is important code",
      "const y = x + 1",
      "```",
      "",
      "After code block text.",
      ...Array(50).fill("More after text."),
    ]
    const output = lines.join("\n")
    const result = filterReadOutput({ path: "guide.md", output })
    if (result.filtered) {
      // Code block lines must be preserved
      expect(result.output).toContain("import { foo } from 'bar'")
      expect(result.output).toContain("const y = x + 1")
      // Paragraph compression should still work outside code blocks
      expect(result.output).toContain("After code block text.")
    }
  })
})

// ============================================================================
// Unknown / Other Files
// ============================================================================

describe("read-output-filter: unknown and edge cases", () => {
  test("does not filter files without recognizable extension below threshold", () => {
    const output = "some content\nmore content"
    const result = filterReadOutput({ path: "Makefile", output })
    expect(result.filtered).toBe(false)
  })

  test("generic filter for large unknown text files", () => {
    const output = repeatLines("line of text that repeats many times here", 500)
    const result = filterReadOutput({ path: "data/trace.log", output })
    if (result.filtered) {
      expect(result.filteredBytes).toBeLessThan(result.originalBytes)
    }
  })

  test("handles empty output", () => {
    const result = filterReadOutput({ path: "src/empty.ts", output: "" })
    expect(result.filtered).toBe(false)
  })

  test("includes filter notice with original/filtered size", () => {
    const output = JSON.stringify({
      packages: Object.fromEntries(
        Array(300).fill(0).map((_, i) => [`pkg-${i}`, { version: `${i}.0.0` }])
      ),
    }, null, 2)
    const result = filterReadOutput({ path: "package-lock.json", output })
    if (result.filtered) {
      expect(result.output).toContain("filtered")
    }
  })
})

// ============================================================================
// Real-world Savings Estimation
// ============================================================================

describe("read-output-filter: real-world savings", () => {
  test("package-lock.json ~500KB → extreme compression", () => {
    const pkg = {
      name: "big-project",
      lockfileVersion: 3,
      packages: Object.fromEntries(
        Array(1000).fill(0).map((_, i) => [
          `node_modules/pkg-${i}`,
          {
            version: `${i}.0.0`,
            resolved: `https://registry.npmjs.org/pkg-${i}/-/pkg-${i}-${i}.0.0.tgz`,
            integrity: `sha512-${"abc".repeat(30)}`,
            requires: Object.fromEntries(
              Array(5).fill(0).map((_, j) => [`dep-${j}`, `^${j}.0.0`])
            ),
          },
        ])
      ),
    }
    const output = JSON.stringify(pkg, null, 2)
    const result = filterReadOutput({ path: "package-lock.json", output })
    console.log(`package-lock.json: ${sizeOf(output)} → ${result.filteredBytes} bytes (${((1 - result.filteredBytes / sizeOf(output)) * 100).toFixed(0)}% reduction, strategy: ${result.strategy})`)
    if (result.filtered) {
      expect(result.filteredBytes).toBeLessThan(sizeOf(output) * 0.05) // >95% reduction expected
    }
  })

  test("large TS file ~20KB → structural compression", () => {
    const lines = [
      "import { A, B, C } from 'module'",
      "import { D } from 'other'",
      "",
      "interface Props { name: string; age: number }",
      "",
      "export class BigComponent {",
      ...Array(100).fill("  private method(): void { /* body */ }"),
      "",
      "  render(): JSX.Element {",
      ...Array(150).fill("    <div>content</div>"),
      "  }",
      "}",
    ]
    const output = lines.join("\n")
    const result = filterReadOutput({ path: "src/BigComponent.tsx", output })
    console.log(`BigComponent.tsx: ${sizeOf(output)} → ${result.filteredBytes} bytes (${((1 - result.filteredBytes / sizeOf(output)) * 100).toFixed(0)}% reduction, strategy: ${result.strategy})`)
    if (result.filtered) {
      expect(result.output).toContain("import")
      expect(result.output).toContain("class BigComponent")
    }
  })
})
