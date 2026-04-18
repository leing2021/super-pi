import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"
import { Type } from "@sinclair/typebox"
import { createArtifactHelperTool, type ArtifactType } from "./tools/artifact-helper"
import { createAskUserQuestionTool } from "./tools/ask-user-question"
import { createSubagentTool } from "./tools/subagent"
import { createWorkflowStateTool } from "./tools/workflow-state"
import { createWorktreeManagerTool } from "./tools/worktree-manager"
import { createReviewRouterTool } from "./tools/review-router"
import { createParallelSubagentTool } from "./tools/parallel-subagent"
import { createSessionCheckpointTool } from "./tools/session-checkpoint"
import { createTaskSplitterTool } from "./tools/task-splitter"

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
  ], { description: "Checkpoint operation" }),
  repoRoot: Type.String({ description: "Repository root" }),
  planPath: Type.Optional(Type.String({ description: "Plan artifact path" })),
  completedUnits: Type.Optional(Type.Array(Type.String(), { description: "List of completed implementation unit names" })),
})

const splitterUnitSchema = Type.Object({
  name: Type.String({ description: "Implementation unit name" }),
  files: Type.Array(Type.String(), { description: "Files this unit touches" }),
})

const taskSplitterParams = Type.Object({
  units: Type.Array(splitterUnitSchema, { description: "Implementation units to analyze for dependencies" }),
})

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
export {
  getBrainstormArtifactPath,
  getPlanArtifactPath,
  getSolutionArtifactPath,
  getRunArtifactPath,
} from "./utils/artifact-paths"
export { normalizeSlug } from "./utils/name-utils"
