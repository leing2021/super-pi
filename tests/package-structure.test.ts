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
  })

  test("typebox is a direct dependency, not a peer dependency", () => {
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"))

    expect(packageJson.dependencies).toBeDefined()
    expect(packageJson.dependencies.typebox).toBeDefined()
    expect(packageJson.peerDependencies.typebox).toBeUndefined()
  })

  test("pi-subagents is not a peer dependency (source-integrated)", () => {
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"))

    expect(packageJson.peerDependencies["pi-subagents"]).toBeUndefined()
  })

  test("declares subagent extension and agents in Pi manifest", () => {
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"))

    expect(packageJson.pi.extensions).toContain("./extensions/subagent")
    expect(packageJson.pi.agents).toContain("./extensions/subagent/agents")
    expect(packageJson.pi.prompts).toContain("./extensions/subagent/prompts")
  })

  test("README documents installation and the Phase 1 commands", () => {
    const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8")

    expect(readme).toContain("pi install")
    expect(readme).toContain("01-brainstorm")
    expect(readme).toContain("02-plan")
    expect(readme).toContain("03-work")
    expect(readme).toContain("04-review")
    expect(readme).toContain("05-learn")
    expect(readme).toContain("09-help")
    expect(readme).toContain("08-status")
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
    expect(packageJson).toContain('"https://github.com/leing2021/super-pi"')
  })

  test("repo includes a gitignore for node and Pi package development", () => {
    const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8")

    expect(gitignore).toContain("node_modules")
    expect(gitignore).toContain("dist")
    expect(gitignore).toContain(".DS_Store")
  })

  test("includes test workflow triggered on push and PR to main", () => {
    const workflow = readFileSync(path.join(repoRoot, ".github", "workflows", "test.yml"), "utf8")

    expect(workflow).toContain("push")
    expect(workflow).toContain("pull_request")
    expect(workflow).toContain("main")
    expect(workflow).toContain("bun test")
  })

  test("includes publish workflow triggered on version tags", () => {
    const workflow = readFileSync(path.join(repoRoot, ".github", "workflows", "publish.yml"), "utf8")

    expect(workflow).toContain("v*")
    expect(workflow).toContain("npm publish")
    expect(workflow).toContain("NPM_TOKEN")
    expect(workflow).toContain("bun test")
  })
})
