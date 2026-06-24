import { readFile } from "node:fs/promises"
import path from "node:path"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import { createArtifactHelperTool, type ArtifactType } from "./tools/artifact-helper"
import { createAskUserQuestionTool, CUSTOM_SENTINEL } from "./tools/ask-user-question"
import { createAskUserQuestionCustomFactory } from "./tools/ask-user-question-ui"
import { createWorkflowStateTool } from "./tools/workflow-state"
import { createWorktreeManagerTool } from "./tools/worktree-manager"
import { createReviewRouterTool } from "./tools/review-router"
import { createSessionCheckpointTool } from "./tools/session-checkpoint"
import { createTaskSplitterTool } from "./tools/task-splitter"
import { createBrainstormDialogTool } from "./tools/brainstorm-dialog"
import { createPlanDiffTool } from "./tools/plan-diff"
import { createSessionHistoryTool } from "./tools/session-history"
import { createPatternExtractorTool } from "./tools/pattern-extractor"
import { createContextHandoffTool } from "./tools/context-handoff"
import { filterBashOutput } from "./tools/bash-output-filter"
import { filterReadOutput } from "./tools/read-output-filter"
import { COMPACTION_FOCUS_INSTRUCTIONS } from "./tools/compaction-optimizer"

const PIPELINE_STAGE_KEYS = new Set([
  "01-brainstorm",
  "02-plan",
  "03-work",
  "04-review",
  "05-learn",
])

/**
 * Module-level promise chain that serializes interactive `ask_user_question`
 * UI calls within a single Pi process.
 *
 * Why: `@earendil-works/pi-coding-agent` renders extension selectors via a
 * singleton field (`extensionSelector` / `extensionInput` in
 * `interactive-mode.js`). When two selector calls overlap, the second
 * overwrites the first, and the first promise never resolves — surfacing to
 * the agent as a silent `No result provided`. See
 * `docs/bug/ask-user-question-parallel-call-silent-failure.md`.
 *
 * This guard ensures at most one selector/input is on screen at a time.
 */
let askUserQuestionExclusiveChain: Promise<unknown> = Promise.resolve()

function runAskUserQuestionExclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = askUserQuestionExclusiveChain.then(task, task)
  // Keep the chain robust: a rejected run must not poison subsequent calls.
  askUserQuestionExclusiveChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Build the UI adapter for `ask_user_question`.
 *
 * In interactive TUI mode with `ctx.ui.custom` available, route `select`
 * through the scrollable custom dialog so long questions/options stay readable
 * (see `docs/bug/ask-user-question-long-text-not-scrollable.md`). Otherwise
 * fall back to the built-in `ctx.ui.select()`.
 */
function buildAskUserQuestionUi(ctx: any): import("./tools/ask-user-question").AskUserQuestionUi {
  const useCustom = ctx?.mode === "tui" && typeof ctx?.ui?.custom === "function"
  const input = async (question: string) => (await ctx.ui.input(question)) ?? null
  const selectFallback = async (question: string, options: string[]) =>
    (await ctx.ui.select(question, options)) ?? null

  if (!useCustom) {
    return { input, select: selectFallback }
  }

  const select = async (question: string, options: string[]): Promise<string | null> => {
    // The custom sentinel is appended last (if present) and matches
    // `CUSTOM_SENTINEL` or a `CUSTOM_SENTINEL (#n)` disambiguation suffix.
    const last = options.length > 0 ? options[options.length - 1] : null
    const customLabel = last !== null
      && (last === CUSTOM_SENTINEL || last.startsWith(`${CUSTOM_SENTINEL} (#`))
      ? last
      : null
    const factory = createAskUserQuestionCustomFactory({
      question,
      displayOptions: options,
      customLabel,
    })
    const selection = (await ctx.ui.custom(factory)) as
      { selectedLabel: string | null } | null | undefined
    return selection?.selectedLabel ?? null
  }

  return { input, select }
}

interface StrategySettings {
  modelStrategy?: Record<string, string>
  thinkingStrategy?: Record<string, string>
}

/**
 * Read settings from two locations (config dir honors pi's `CONFIG_DIR_NAME`,
 * which defaults to `.pi` but is user-configurable since pi 0.79.7):
 * 1. Project-level: {cwd}/{CONFIG_DIR_NAME}/settings.json (highest priority)
 * 2. Global-level: ~/{CONFIG_DIR_NAME}/agent/settings.json (fallback)
 *
 * Project-level takes precedence; global-level is used as fallback.
 */
async function readSettings(cwd: string): Promise<StrategySettings | null> {
  const agentHome = process.env.HOME || "~"
  // Try project-level first
  const projectPath = path.join(cwd, CONFIG_DIR_NAME, "settings.json")
  try {
    const content = await readFile(projectPath, "utf8")
    const projectSettings = JSON.parse(content) as StrategySettings
    // If project has modelStrategy or thinkingStrategy, use it
    if (projectSettings.modelStrategy || projectSettings.thinkingStrategy) {
      return projectSettings
    }
  } catch {
    // Project settings not found, continue to global
  }

  // Fallback to global-level
  const globalPath = path.join(agentHome, CONFIG_DIR_NAME, "agent", "settings.json")
  try {
    const content = await readFile(globalPath, "utf8")
    return JSON.parse(content) as StrategySettings
  } catch {
    // Global settings not found either
  }

  // Try ~/{CONFIG_DIR_NAME}/settings.json as another fallback
  const altGlobalPath = path.join(agentHome, CONFIG_DIR_NAME, "settings.json")
  try {
    const content = await readFile(altGlobalPath, "utf8")
    return JSON.parse(content) as StrategySettings
  } catch {
    return null
  }
}

function parseStageSkillName(text: string): string | null {
  const trimmed = text.trim()
  const match = trimmed.match(/^\/skill:([^\s]+)/)
  if (!match) {
    return null
  }

  const skillName = match[1]
  return PIPELINE_STAGE_KEYS.has(skillName) ? skillName : null
}

function parseModelRef(
  modelRef: string,
  currentProvider?: string,
): { provider: string, id: string } | null {
  const trimmed = modelRef.trim()
  if (!trimmed) {
    return null
  }

  const slashIndex = trimmed.indexOf("/")
  if (slashIndex > 0 && slashIndex < trimmed.length - 1) {
    return {
      provider: trimmed.slice(0, slashIndex),
      id: trimmed.slice(slashIndex + 1),
    }
  }

  if (!currentProvider) {
    return null
  }

  return {
    provider: currentProvider,
    id: trimmed,
  }
}

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

const contextHandoffParams = Type.Object({
  operation: Type.Union([
    Type.Literal("save"),
    Type.Literal("load"),
    Type.Literal("latest"),
    Type.Literal("status"),
    Type.Literal("validate"),
  ], { description: "Handoff operation" }),
  repoRoot: Type.String({ description: "Repository root" }),
  currentStage: Type.Optional(Type.String({ description: "Current pipeline stage (e.g. 02-plan)" })),
  nextStage: Type.Optional(Type.String({ description: "Next pipeline stage" })),
  contextHealth: Type.Optional(Type.Union([
    Type.Literal("good"),
    Type.Literal("watch"),
    Type.Literal("heavy"),
    Type.Literal("critical"),
  ], { description: "Context health assessment" })),
  activeFiles: Type.Optional(Type.Array(Type.String(), { description: "1-5 must-know active file paths" })),
  blocker: Type.Optional(Type.String({ description: "Current blocker description" })),
  verification: Type.Optional(Type.String({ description: "Latest verification command + result" })),
  artifacts: Type.Optional(Type.Record(Type.String(), Type.Optional(Type.String()), { description: "Artifact paths (requirements, plan, checkpoint, proof)" })),
  handoffMarkdown: Type.Optional(Type.String({ description: "Custom handoff markdown content" })),
  handoffPath: Type.Optional(Type.String({ description: "Specific handoff file path to load" })),
  currentTruth: Type.Optional(Type.Array(Type.String(), { description: "Known true statements validated during session" })),
  invalidatedAssumptions: Type.Optional(Type.Array(Type.String(), { description: "Assumptions proven wrong during session" })),
  openDecisions: Type.Optional(Type.Array(Type.String(), { description: "Pending decisions that affect next steps" })),
  recentlyAccessedFiles: Type.Optional(Type.Array(Type.String(), { description: "Files recently read or edited (defaults to activeFiles)" })),
  compressionRisk: Type.Optional(Type.Array(Type.String(), { description: "Context compression risks to watch for" })),
  activeRules: Type.Optional(Type.Array(Type.String(), { description: "1-5 must-know rules for continuation (TDD gates, constraints, do-not-repeat)" })),
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

export default function ceCoreExtension(pi: ExtensionAPI) {
  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") {
      return { action: "continue" as const }
    }

    const stageKey = parseStageSkillName(event.text)
    if (!stageKey) {
      return { action: "continue" as const }
    }

    // Skip model/thinking switching during streaming steers — these are
    // mid-stream interrupts, not new pipeline invocations.
    if (event.streamingBehavior === "steer") {
      return { action: "continue" as const }
    }

    const settings = await readSettings(ctx.cwd)
    const modelStrategy = settings?.modelStrategy
    const thinkingStrategy = settings?.thinkingStrategy
    // Notification guard: only notify in interactive (TUI) or RPC modes.
    // For interactive input capability checks (askUserQuestion), use ctx.hasUI directly.
    const shouldNotify = ctx.mode === "tui" || ctx.mode === "rpc"

    // Model switching
    if (modelStrategy) {
      const targetModelRef = modelStrategy[stageKey] ?? modelStrategy.default
      if (targetModelRef) {
        const parsed = parseModelRef(targetModelRef, ctx.model?.provider)
        if (parsed) {
          // Skip if already using the same model
          if (ctx.model?.provider !== parsed.provider || ctx.model?.id !== parsed.id) {
            const model = ctx.modelRegistry.find(parsed.provider, parsed.id)
            if (model) {
              const switched = await pi.setModel(model)
              if (switched) {
                if (shouldNotify) {
                  ctx.ui.notify(`Switched model for ${stageKey}: ${model.provider}/${model.id}`, "info")
                }
              } else {
                if (shouldNotify) {
                  ctx.ui.notify(`No API key for ${stageKey}: ${model.provider}/${model.id}`, "warning")
                }
              }
            } else if (shouldNotify) {
              ctx.ui.notify(`Model not found for ${stageKey}: ${targetModelRef}`, "warning")
            }
          }
        } else if (shouldNotify) {
          ctx.ui.notify(`Invalid modelStrategy for ${stageKey}: ${targetModelRef}`, "warning")
        }
      }
    }

    // Thinking level switching
    if (thinkingStrategy) {
      const targetThinking = thinkingStrategy[stageKey] ?? thinkingStrategy.default
      if (targetThinking) {
        const levelMap: Record<string, ReturnType<ExtensionAPI["getThinkingLevel"]>> = {
          off: "off",
          minimal: "minimal",
          low: "low",
          medium: "medium",
          high: "high",
          xhigh: "xhigh",
          "0": "low",
          "1": "medium",
          "2": "high",
        }
        const normalized = levelMap[targetThinking.toLowerCase()] ?? "medium"
        const currentLevel = pi.getThinkingLevel()
        if (currentLevel !== normalized) {
          pi.setThinkingLevel(normalized)
          if (shouldNotify) {
            ctx.ui.notify(`Switched thinking level for ${stageKey}: ${normalized}`, "info")
          }
        }
      }
    }

    return { action: "continue" as const }
  })

  const artifactHelper = createArtifactHelperTool()
  const askUserQuestion = createAskUserQuestionTool()
  const workflowState = createWorkflowStateTool()
  const worktreeManager = createWorktreeManagerTool()
  const reviewRouter = createReviewRouterTool()
  const sessionCheckpoint = createSessionCheckpointTool()
  const taskSplitter = createTaskSplitterTool()
  const brainstormDialog = createBrainstormDialogTool()
  const planDiff = createPlanDiffTool()
  const sessionHistory = createSessionHistoryTool()
  const patternExtractor = createPatternExtractorTool()
  const contextHandoff = createContextHandoffTool()

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
    promptSnippet: "Ask the user a structured question with optional choices and custom answers",
    promptGuidelines: [
      "Call ask_user_question one at a time, never two or more in the same assistant message: Pi renders selectors on a shared singleton, so parallel ask_user_question calls silently fail with 'No result provided'.",
      "For ask_user_question, keep the question concise and put long analysis in prior text or a file first; ask_user_question normalizes long options to short labels but the full answer is still returned to you.",
    ],
    parameters: askUserQuestionParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        return {
          isError: true,
          content: [{ type: "text", text: "UI is unavailable in this mode." }],
          details: { answer: null, mode: "cancelled" },
        }
      }

      const result = await runAskUserQuestionExclusive(() => askUserQuestion.execute(
        {
          question: params.question,
          options: params.options,
          allowCustom: params.allowCustom,
        },
        buildAskUserQuestionUi(ctx),
      ))

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

  pi.registerTool({
    name: contextHandoff.name,
    label: "Context Handoff",
    description: "Manage cross-stage context handoffs with evidence-first templates. Supports save (write handoff + state), load (read handoff + state), latest (read latest dated handoff), status (read current state), and validate (check continuation readiness with deterministic probes).",
    parameters: contextHandoffParams,
    async execute(_toolCallId, params) {
      const result = await contextHandoff.execute({
        operation: params.operation,
        repoRoot: params.repoRoot,
        currentStage: params.currentStage,
        nextStage: params.nextStage,
        contextHealth: params.contextHealth,
        activeFiles: params.activeFiles,
        blocker: params.blocker,
        verification: params.verification,
        artifacts: params.artifacts as Record<string, string | undefined> | undefined,
        handoffMarkdown: params.handoffMarkdown,
        handoffPath: params.handoffPath,
        currentTruth: params.currentTruth,
        invalidatedAssumptions: params.invalidatedAssumptions,
        openDecisions: params.openDecisions,
        recentlyAccessedFiles: params.recentlyAccessedFiles,
        compressionRisk: params.compressionRisk,
        activeRules: params.activeRules,
      })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      }
    },
  })

  // Bash output smart filter — reduces context waste from verbose command output
  pi.on("tool_result", async (event, _ctx) => {
    if (event.toolName !== "bash") return undefined

    // Extract command from input
    const command = (event.input as any)?.command ?? ""
    if (!command) return undefined

    // Extract text content from tool result
    const textBlocks = (event.content as Array<any>)?.filter((b: any) => b.type === "text") ?? []
    if (textBlocks.length === 0) return undefined

    const output = textBlocks.map((b: any) => b.text).join("")
    const fullOutputPath = (event.details as any)?.fullOutputPath

    const result = filterBashOutput({
      command,
      output,
      isError: event.isError ?? false,
      fullOutputPath,
    })

    if (!result.filtered) return undefined

    // Replace content with filtered version
    return {
      content: [{ type: "text", text: result.output }],
      details: {
        ...(event.details && typeof event.details === "object" ? event.details : {}),
        bashFilter: {
          strategy: result.strategy,
          originalBytes: result.originalBytes,
          filteredBytes: result.filteredBytes,
        },
      },
    }
  })

  // Read output smart filter — reduces context waste from large file reads
  pi.on("tool_result", async (event, _ctx) => {
    if (event.toolName !== "read") return undefined

    // Extract path from input
    const path = (event.input as any)?.path ?? ""
    if (!path) return undefined

    // Extract text content from tool result
    const textBlocks = (event.content as Array<any>)?.filter((b: any) => b.type === "text") ?? []
    if (textBlocks.length === 0) return undefined

    const output = textBlocks.map((b: any) => b.text).join("")
    const isImage = (event.content as Array<any>)?.some((b: any) => b.type === "image") ?? false

    const result = filterReadOutput({
      path,
      output,
      isError: event.isError ?? false,
      isImage,
    })

    if (!result.filtered) return undefined

    return {
      content: [{ type: "text", text: result.output }],
      details: {
        ...(event.details && typeof event.details === "object" ? event.details : {}),
        readFilter: {
          strategy: result.strategy,
          originalBytes: result.originalBytes,
          filteredBytes: result.filteredBytes,
        },
      },
    }
  })

  // Branch summary prompt optimizer — appends focus instructions to `/tree`
  // navigation summaries. `SessionBeforeTreeResult.customInstructions` is
  // consumed by pi (agent-session.js navigateTree), so this return shape is
  // effective for branch summaries.
  //
  // NOTE on regular context compaction (manual `/compact`, threshold,
  // overflow): pi's `session_before_compact` result only accepts `cancel` or
  // a full `compaction` replacement — there is NO prompt-only injection
  // field (`customInstructions` is an event *input*, not a return value).
  // So we cannot append focus instructions to regular compaction summaries
  // without replacing pi's entire summarizer. We deliberately do not hook
  // `session_before_compact` to avoid dead handlers and needless emit()
  // overhead on every compaction.
  pi.on("session_before_tree", async (_event, _ctx) => {
    return {
      customInstructions: COMPACTION_FOCUS_INSTRUCTIONS,
      replaceInstructions: false,
    }
  })
}


export { createArtifactHelperTool } from "./tools/artifact-helper"
export { createAskUserQuestionTool } from "./tools/ask-user-question"
export { createWorkflowStateTool } from "./tools/workflow-state"
export { createWorktreeManagerTool } from "./tools/worktree-manager"
export { createReviewRouterTool } from "./tools/review-router"
export { createSessionCheckpointTool } from "./tools/session-checkpoint"
export { createTaskSplitterTool } from "./tools/task-splitter"
export { createBrainstormDialogTool } from "./tools/brainstorm-dialog"
export { createPlanDiffTool } from "./tools/plan-diff"
export { createSessionHistoryTool } from "./tools/session-history"
export { createPatternExtractorTool } from "./tools/pattern-extractor"
export { createContextHandoffTool } from "./tools/context-handoff"
export {
  getBrainstormArtifactPath,
  getPlanArtifactPath,
  getSolutionArtifactPath,
  getRunArtifactPath,
} from "./utils/artifact-paths"
export { normalizeSlug } from "./utils/name-utils"
export { filterBashOutput } from "./tools/bash-output-filter"
export { filterReadOutput } from "./tools/read-output-filter"
export { COMPACTION_FOCUS_INSTRUCTIONS } from "./tools/compaction-optimizer"
