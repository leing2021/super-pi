import type { AssistantMessage } from "@mariozechner/pi-ai"
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"
import { Type } from "@sinclair/typebox"
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui"
import { createArtifactHelperTool, type ArtifactType } from "./tools/artifact-helper"
import { createAskUserQuestionTool } from "./tools/ask-user-question"
import { createSubagentTool } from "./tools/subagent"
import { createWorkflowStateTool } from "./tools/workflow-state"
import { createWorktreeManagerTool } from "./tools/worktree-manager"
import { createReviewRouterTool } from "./tools/review-router"
import { createParallelSubagentTool } from "./tools/parallel-subagent"
import { createSessionCheckpointTool } from "./tools/session-checkpoint"
import { createTaskSplitterTool } from "./tools/task-splitter"
import { createBrainstormDialogTool } from "./tools/brainstorm-dialog"
import { createPlanDiffTool } from "./tools/plan-diff"
import { createSessionHistoryTool } from "./tools/session-history"
import { createPatternExtractorTool } from "./tools/pattern-extractor"

const artifactHelperParams = Type.Object({
  repoRoot: Type.String({ description: "Repository root where workflow artifacts should be created" }),
  artifactType: Type.Union([
    Type.Literal("brainstorm"),
    Type.Literal("plan"),
    Type.Literal("solution"),
    Type.Literal("run"),
  ], { description: "Artifact type to resolve" }),
  date: Type.Optional(Type.String({ description: "Date prefix for dated artifacts" })),
  topic: Type.Optional(Type.String({ description: "Topic or slug source for the artifact" })),
  category: Type.Optional(Type.String({ description: "Solution category for docs/solutions" })),
  skillName: Type.Optional(Type.String({ description: "Skill name for run artifacts" })),
  runId: Type.Optional(Type.String({ description: "Run identifier for runtime artifacts" })),
  ensureDir: Type.Optional(Type.Boolean({ description: "Create the parent directory when true" })),
})

const askUserQuestionParams = Type.Object({
  question: Type.String({ description: "Question shown to the user" }),
  options: Type.Optional(Type.Array(Type.String(), { description: "Selectable options" })),
  allowCustom: Type.Optional(Type.Boolean({ description: "Allow a custom answer when options are present" })),
})

const subagentTaskSchema = Type.Object({
  agent: Type.String({ description: "Skill name to invoke via /skill:<name>" }),
  task: Type.String({ description: "Task text passed to the subagent" }),
})

const subagentParams = Type.Object({
  agent: Type.Optional(Type.String({ description: "Single subagent skill name" })),
  task: Type.Optional(Type.String({ description: "Single subagent task" })),
  chain: Type.Optional(Type.Array(subagentTaskSchema, { description: "Serial subagent chain with optional {previous} placeholder" })),
})

const workflowStateParams = Type.Object({
  repoRoot: Type.String({ description: "Repository root to scan for workflow artifacts" }),
})

const worktreeManagerParams = Type.Object({
  operation: Type.Union([
    Type.Literal("create"),
    Type.Literal("detect"),
    Type.Literal("merge"),
    Type.Literal("cleanup"),
  ], { description: "Worktree operation to perform" }),
  repoRoot: Type.String({ description: "Repository root" }),
  branchName: Type.Optional(Type.String({ description: "Feature branch name for create/merge/cleanup" })),
  worktreePath: Type.Optional(Type.String({ description: "Worktree directory path for cleanup" })),
})

const reviewRouterParams = Type.Object({
  filesChanged: Type.Array(Type.String(), { description: "List of file paths changed in the diff" }),
  insertions: Type.Number({ description: "Number of lines added" }),
  deletions: Type.Number({ description: "Number of lines removed" }),
})

const parallelSubagentTaskSchema = Type.Object({
  agent: Type.String({ description: "Skill name to invoke via /skill:<name>" }),
  task: Type.String({ description: "Task text passed to the subagent" }),
})

const parallelSubagentParams = Type.Object({
  tasks: Type.Array(parallelSubagentTaskSchema, { description: "Array of independent tasks to run concurrently" }),
})

const sessionCheckpointParams = Type.Object({
  operation: Type.Union([
    Type.Literal("save"),
    Type.Literal("load"),
    Type.Literal("list"),
    Type.Literal("fail"),
    Type.Literal("retry"),
  ], { description: "Checkpoint operation" }),
  repoRoot: Type.String({ description: "Repository root" }),
  planPath: Type.Optional(Type.String({ description: "Plan artifact path" })),
  completedUnits: Type.Optional(Type.Array(Type.String(), { description: "List of completed implementation unit names" })),
  failedUnit: Type.Optional(Type.String({ description: "Name of the unit that failed" })),
  error: Type.Optional(Type.String({ description: "Error message from the failure" })),
})

const splitterUnitSchema = Type.Object({
  name: Type.String({ description: "Implementation unit name" }),
  files: Type.Array(Type.String(), { description: "Files this unit touches" }),
})

const taskSplitterParams = Type.Object({
  units: Type.Array(splitterUnitSchema, { description: "Implementation units to analyze for dependencies" }),
})

const brainstormDialogParams = Type.Object({
  operation: Type.Union([
    Type.Literal("start"),
    Type.Literal("refine"),
    Type.Literal("summarize"),
  ], { description: "Dialog operation" }),
  repoRoot: Type.String({ description: "Repository root" }),
  artifactPath: Type.String({ description: "Brainstorm artifact path" }),
  analysis: Type.Optional(Type.String({ description: "Agent's current analysis" })),
  questions: Type.Optional(Type.Array(Type.String(), { description: "Open questions for the user" })),
  userResponses: Type.Optional(Type.Array(Type.String(), { description: "User's answers from previous round" })),
})

const planUnitSchema = Type.Object({
  name: Type.String({ description: "Unit name" }),
  description: Type.String({ description: "Unit description" }),
  files: Type.Array(Type.String(), { description: "Files this unit touches" }),
})

const planChangeSchema = Type.Object({
  action: Type.Union([Type.Literal("add"), Type.Literal("remove"), Type.Literal("modify")], { description: "Change action" }),
  name: Type.String({ description: "Unit name" }),
  description: Type.Optional(Type.String({ description: "Updated description" })),
  files: Type.Optional(Type.Array(Type.String(), { description: "Updated file list" })),
})

const planDiffParams = Type.Object({
  operation: Type.Union([Type.Literal("compare"), Type.Literal("patch")], { description: "Diff operation" }),
  existingUnits: Type.Array(planUnitSchema, { description: "Current plan units" }),
  newRequirements: Type.Optional(Type.Array(planUnitSchema, { description: "Updated requirements for compare" })),
  changes: Type.Optional(Type.Array(planChangeSchema, { description: "Changes to apply for patch" })),
})

const sessionHistoryParams = Type.Object({
  operation: Type.Union([
    Type.Literal("record"),
    Type.Literal("query"),
    Type.Literal("latest"),
  ], { description: "History operation" }),
  repoRoot: Type.String({ description: "Repository root" }),
  skill: Type.Optional(Type.String({ description: "Skill name to filter or record" })),
  artifactPath: Type.Optional(Type.String({ description: "Artifact path" })),
  summary: Type.Optional(Type.String({ description: "Execution summary" })),
})

const artifactInputSchema = Type.Object({
  path: Type.String({ description: "Artifact path" }),
  content: Type.String({ description: "Artifact content" }),
})

const patternSchema = Type.Object({
  keyword: Type.String({ description: "Pattern keyword" }),
  occurrences: Type.Number({ description: "Number of occurrences" }),
  sources: Type.Array(Type.String(), { description: "Artifact sources" }),
})

const patternExtractorParams = Type.Object({
  operation: Type.Union([
    Type.Literal("extract"),
    Type.Literal("categorize"),
  ], { description: "Pattern operation" }),
  artifacts: Type.Optional(Type.Array(artifactInputSchema, { description: "Artifacts to analyze" })),
  keywords: Type.Optional(Type.Array(Type.String(), { description: "Keywords to search for" })),
  patterns: Type.Optional(Type.Array(patternSchema, { description: "Patterns to categorize" })),
  categories: Type.Optional(Type.Record(Type.String(), Type.Array(Type.String()), { description: "Category name to keyword mapping" })),
})

// Session-scoped stats for custom footer
let statsEnabled = false
const toolCounts = new Map<string, number>()
let subagentCount = 0
let projectPath = ""
let footerTui: any = null

function renderStatsFooter(ctx: any, tui: any, theme: any, footerData: any, width: number): string[] {
  const shortPath = projectPath
    .replace(/^\/Users\/[^/]+/, "~")
    .split("/")
    .slice(-2)
    .join("/")

  const sorted = [...toolCounts.entries()].sort((a, b) => b[1] - a[1])
  const total = sorted.reduce((sum, e) => sum + e[1], 0)
  const top3 = sorted.slice(0, 3).map(([name, count]) => `${name}:${count}`).join(" ")
  const toolsStr = total > 0 ? `tools(${total}) ${top3}` : ""
  const subStr = subagentCount > 0 ? `sub:${subagentCount}` : ""
  const branch = footerData.getGitBranch()
  const branchStr = branch ? ` (${branch})` : ""

  const left = theme.fg("dim", `${shortPath}${branchStr}`)
  const rightParts = [subStr, toolsStr].filter(Boolean)
  const right = rightParts.length > 0 ? theme.fg("dim", rightParts.join(" │ ")) : ""

  const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)))
  return [truncateToWidth(left + pad + right, width)]
}

export default function ceCoreExtension(pi: ExtensionAPI) {
  const artifactHelper = createArtifactHelperTool()
  const askUserQuestion = createAskUserQuestionTool()
  const subagent = createSubagentTool()
  const workflowState = createWorkflowStateTool()
  const worktreeManager = createWorktreeManagerTool()
  const reviewRouter = createReviewRouterTool()
  const parallelSubagent = createParallelSubagentTool()
  const sessionCheckpoint = createSessionCheckpointTool()
  const taskSplitter = createTaskSplitterTool()
  const brainstormDialog = createBrainstormDialogTool()
  const planDiff = createPlanDiffTool()
  const sessionHistory = createSessionHistoryTool()
  const patternExtractor = createPatternExtractorTool()

  pi.registerTool({
    name: artifactHelper.name,
    label: "Artifact Helper",
    description: "Resolve and optionally create standard Compound Engineering artifact paths.",
    parameters: artifactHelperParams,
    async execute(_toolCallId, params) {
      const result = await artifactHelper.execute({
        repoRoot: params.repoRoot,
        artifactType: params.artifactType as ArtifactType,
        date: params.date,
        topic: params.topic,
        category: params.category,
        skillName: params.skillName,
        runId: params.runId,
        ensureDir: params.ensureDir,
      })

      return {
        content: [{ type: "text", text: result.path }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: askUserQuestion.name,
    label: "Ask User Question",
    description: "Ask the user a structured question with optional choices and custom answers.",
    parameters: askUserQuestionParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        return {
          isError: true,
          content: [{ type: "text", text: "UI is unavailable in this mode." }],
          details: { answer: null, mode: "cancelled" },
        }
      }

      const result = await askUserQuestion.execute(
        {
          question: params.question,
          options: params.options,
          allowCustom: params.allowCustom,
        },
        {
          input: async (question) => ctx.ui.input(question),
          select: async (question, options) => ctx.ui.select(question, options),
        },
      )

      const contentText = result.answer === null
        ? "User cancelled."
        : result.mode === "custom"
          ? `User answered: ${result.answer}`
          : result.mode === "select"
            ? `User selected: ${result.answer}`
            : `User answered: ${result.answer}`

      return {
        content: [{ type: "text", text: contentText }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: subagent.name,
    label: "Subagent",
    description: "Run a single skill-based subagent or a serial chain in an isolated Pi process.",
    parameters: subagentParams,
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const result = await subagent.execute(
        {
          agent: params.agent,
          task: params.task,
          chain: params.chain,
        },
        async (prompt: string) => {
          const execResult = await pi.exec("pi", ["--no-session", "-p", prompt], {
            signal,
            timeout: 10 * 60 * 1000,
          })

          if (execResult.code !== 0) {
            throw new Error(execResult.stderr || execResult.stdout || `Subagent failed for prompt: ${prompt}`)
          }

          return (execResult.stdout || "").trim()
        },
      )

      return {
        content: [{ type: "text", text: result.outputs[result.outputs.length - 1] ?? "" }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: workflowState.name,
    label: "Workflow State",
    description: "Scan repo-local Compound Engineering artifacts and return structured workflow state.",
    parameters: workflowStateParams,
    async execute(_toolCallId, params) {
      const result = await workflowState.execute({
        repoRoot: params.repoRoot,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: worktreeManager.name,
    label: "Worktree Manager",
    description: "Manage git worktree lifecycle: create, detect, merge, and cleanup worktrees for isolated feature development.",
    parameters: worktreeManagerParams,
    async execute(_toolCallId, params, signal) {
      const result = await worktreeManager.execute(
        {
          operation: params.operation,
          repoRoot: params.repoRoot,
          branchName: params.branchName,
          worktreePath: params.worktreePath,
        },
        async (args: string[]) => {
          const execResult = await pi.exec("git", args.slice(1), {
            signal,
            timeout: 60 * 1000,
            cwd: params.repoRoot,
          })

          if (execResult.code !== 0) {
            throw new Error(execResult.stderr || `git ${args.slice(1).join(" ")} failed`)
          }

          return (execResult.stdout || "").trim()
        },
      )

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: reviewRouter.name,
    label: "Review Router",
    description: "Analyze diff metadata and recommend reviewer personas for structured code review.",
    parameters: reviewRouterParams,
    async execute(_toolCallId, params) {
      const result = await reviewRouter.execute({
        filesChanged: params.filesChanged,
        insertions: params.insertions,
        deletions: params.deletions,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: parallelSubagent.name,
    label: "Parallel Subagent",
    description: "Run multiple skill-based subagent tasks concurrently.",
    parameters: parallelSubagentParams,
    async execute(_toolCallId, params, signal) {
      const result = await parallelSubagent.execute(
        { tasks: params.tasks },
        async (prompt: string) => {
          const execResult = await pi.exec("pi", ["--no-session", "-p", prompt], {
            signal,
            timeout: 10 * 60 * 1000,
          })

          if (execResult.code !== 0) {
            throw new Error(execResult.stderr || execResult.stdout || `Subagent failed for prompt: ${prompt}`)
          }

          return (execResult.stdout || "").trim()
        },
      )

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: sessionCheckpoint.name,
    label: "Session Checkpoint",
    description: "Save and load plan execution checkpoints for resume-from-checkpoint behavior.",
    parameters: sessionCheckpointParams,
    async execute(_toolCallId, params) {
      const result = await sessionCheckpoint.execute({
        operation: params.operation,
        repoRoot: params.repoRoot,
        planPath: params.planPath,
        completedUnits: params.completedUnits,
        failedUnit: params.failedUnit,
        error: params.error,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: taskSplitter.name,
    label: "Task Splitter",
    description: "Analyze implementation units for file-level dependencies and output parallel-safe execution groups.",
    parameters: taskSplitterParams,
    async execute(_toolCallId, params) {
      const result = taskSplitter.execute({
        units: params.units,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: brainstormDialog.name,
    label: "Brainstorm Dialog",
    description: "Manage multi-round brainstorm conversations with iterative refinement.",
    parameters: brainstormDialogParams,
    async execute(_toolCallId, params) {
      const result = await brainstormDialog.execute({
        operation: params.operation,
        repoRoot: params.repoRoot,
        artifactPath: params.artifactPath,
        analysis: params.analysis,
        questions: params.questions,
        userResponses: params.userResponses,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: planDiff.name,
    label: "Plan Diff",
    description: "Compare plan units with new requirements or apply incremental changes to an existing plan.",
    parameters: planDiffParams,
    async execute(_toolCallId, params) {
      const result = planDiff.execute({
        operation: params.operation,
        existingUnits: params.existingUnits,
        newRequirements: params.newRequirements,
        changes: params.changes,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: sessionHistory.name,
    label: "Session History",
    description: "Record and query CE skill execution history.",
    parameters: sessionHistoryParams,
    async execute(_toolCallId, params) {
      const result = await sessionHistory.execute({
        operation: params.operation,
        repoRoot: params.repoRoot,
        skill: params.skill,
        artifactPath: params.artifactPath,
        summary: params.summary,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  pi.registerTool({
    name: patternExtractor.name,
    label: "Pattern Extractor",
    description: "Extract and categorize recurring patterns from artifacts.",
    parameters: patternExtractorParams,
    async execute(_toolCallId, params) {
      const input: Record<string, unknown> = { operation: params.operation }
      if (params.artifacts) input.artifacts = params.artifacts
      if (params.keywords) input.keywords = params.keywords
      if (params.patterns) input.patterns = params.patterns
      if (params.categories) input.categories = params.categories

      const result = patternExtractor.execute(input as any)

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  // Track tool calls for stats footer
  pi.on("tool_call", async (event, _ctx) => {
    if (!statsEnabled) return
    const name = event.toolName
    toolCounts.set(name, (toolCounts.get(name) || 0) + 1)
    if (name === "subagent" || name === "parallel_subagent") {
      subagentCount++
    }
    if (footerTui) footerTui.requestRender()
  })

  // Enable custom footer on session start
  pi.on("session_start", async (_event, ctx) => {
    projectPath = process.cwd()
    statsEnabled = true
    toolCounts.clear()
    subagentCount = 0
    ctx.ui.setFooter((tui, theme, footerData) => {
      footerTui = tui
      const unsub = footerData.onBranchChange(() => tui.requestRender())
      return {
        dispose: () => {
          unsub()
          footerTui = null
        },
        invalidate() {},
        render(width: number): string[] {
          return renderStatsFooter(ctx, tui, theme, footerData, width)
        },
      }
    })
  })

  // /stats command to toggle footer
  pi.registerCommand("stats", {
    description: "Toggle stats footer (project path, tool usage, subagent count)",
    handler: async (_args, ctx) => {
      statsEnabled = !statsEnabled
      if (statsEnabled) {
        ctx.ui.setFooter((tui, theme, footerData) => {
          footerTui = tui
          const unsub = footerData.onBranchChange(() => tui.requestRender())
          return {
            dispose: () => {
              unsub()
              footerTui = null
            },
            invalidate() {},
            render(width: number): string[] {
              return renderStatsFooter(ctx, tui, theme, footerData, width)
            },
          }
        })
        ctx.ui.notify("Stats footer enabled", "info")
      } else {
        ctx.ui.setFooter(undefined)
        ctx.ui.notify("Default footer restored", "info")
      }
    },
  })
}

export { createArtifactHelperTool } from "./tools/artifact-helper"
export { createAskUserQuestionTool } from "./tools/ask-user-question"
export { createSubagentTool } from "./tools/subagent"
export { createWorkflowStateTool } from "./tools/workflow-state"
export { createWorktreeManagerTool } from "./tools/worktree-manager"
export { createReviewRouterTool } from "./tools/review-router"
export { createParallelSubagentTool } from "./tools/parallel-subagent"
export { createSessionCheckpointTool } from "./tools/session-checkpoint"
export { createTaskSplitterTool } from "./tools/task-splitter"
export { createBrainstormDialogTool } from "./tools/brainstorm-dialog"
export { createPlanDiffTool } from "./tools/plan-diff"
export { createSessionHistoryTool } from "./tools/session-history"
export { createPatternExtractorTool } from "./tools/pattern-extractor"
export {
  getBrainstormArtifactPath,
  getPlanArtifactPath,
  getSolutionArtifactPath,
  getRunArtifactPath,
} from "./utils/artifact-paths"
export { normalizeSlug } from "./utils/name-utils"
