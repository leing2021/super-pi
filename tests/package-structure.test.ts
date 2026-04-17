import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dir, "..")

describe("package bootstrap structure", () => {
  test("exposes the initial Bun + TypeScript package structure", () => {
    expect(existsSync(path.join(repoRoot, "package.json"))).toBe(true)
    expect(existsSync(path.join(repoRoot, "tsconfig.json"))).toBe(true)
    expect(existsSync(path.join(repoRoot, "README.md"))).toBe(true)
    expect(existsSync(path.join(repoRoot, "skills"))).toBe(true)
    expect(existsSync(path.join(repoRoot, "extensions"))).toBe(true)
    expect(existsSync(path.join(repoRoot, "tests"))).toBe(true)
  })

  test("keeps skills and extensions as top-level Pi package resources", () => {
    expect(existsSync(path.join(repoRoot, "skills"))).toBe(true)
    expect(existsSync(path.join(repoRoot, "extensions", "ce-core"))).toBe(true)
  })

  test("declares a Pi package manifest for skills and extensions", () => {
    const packageJson = readFileSync(path.join(repoRoot, "package.json"), "utf8")

    expect(packageJson).toContain('"pi"')
    expect(packageJson).toContain('"skills"')
    expect(packageJson).toContain('"extensions"')
  })

  test("declares Pi core packages as peer dependencies", () => {
    const packageJson = readFileSync(path.join(repoRoot, "package.json"), "utf8")

    expect(packageJson).toContain('"peerDependencies"')
    expect(packageJson).toContain('"@mariozechner/pi-coding-agent"')
    expect(packageJson).toContain('"@sinclair/typebox"')
  })

  test("README documents installation and the Phase 1 commands", () => {
    const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8")

    expect(readme).toContain("pi install")
    expect(readme).toContain("ce-brainstorm")
    expect(readme).toContain("ce-plan")
    expect(readme).toContain("ce-work")
    expect(readme).toContain("ce-review")
    expect(readme).toContain("ce-compound")
    expect(readme).toContain("ce-help")
    expect(readme).toContain("ce-status")
  })

  test("package metadata is publish-ready", () => {
    const packageJson = readFileSync(path.join(repoRoot, "package.json"), "utf8")

    expect(packageJson).toContain('"keywords"')
    expect(packageJson).toContain('"pi-package"')
    expect(packageJson).toContain('"license"')
    expect(packageJson).toContain('"repository"')
    expect(packageJson).toContain('"homepage"')
    expect(packageJson).toContain('"bugs"')
    expect(packageJson).toContain('"publishConfig"')
    expect(packageJson).toContain('"access": "public"')
    expect(packageJson).toContain('"files"')
    expect(packageJson).toContain('"private": false')
    expect(packageJson).toContain('"https://github.com/leing2021/pi-compound-engineering"')
  })

  test("repo includes a gitignore for node and Pi package development", () => {
    const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8")

    expect(gitignore).toContain("node_modules")
    expect(gitignore).toContain("dist")
    expect(gitignore).toContain(".DS_Store")
  })
})
