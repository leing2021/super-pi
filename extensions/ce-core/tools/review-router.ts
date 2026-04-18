export interface ReviewRouterInput {
  filesChanged: string[]
  insertions: number
  deletions: number
}

export interface ReviewerRecommendation {
  name: string
  reason: string
}

export interface ReviewRouterResult {
  reviewers: ReviewerRecommendation[]
}

interface ReviewerRule {
  name: string
  reason: string
  condition: (input: ReviewRouterInput) => boolean
}

const BASE_REVIEWERS: ReviewerRule[] = [
  {
    name: "correctness-reviewer",
    reason: "Always review for logical correctness and intended behavior.",
    condition: () => true,
  },
  {
    name: "testing-reviewer",
    reason: "Always review test coverage and test quality.",
    condition: () => true,
  },
  {
    name: "maintainability-reviewer",
    reason: "Always review code clarity, naming, and structure.",
    condition: () => true,
  },
]

const CONDITIONAL_REVIEWERS: ReviewerRule[] = [
  {
    name: "security-reviewer",
    reason: "Auth, permissions, or user input files were changed.",
    condition: (input) =>
      input.filesChanged.some((f) =>
        /auth|permission|login|password|token|session|credential|crypto/i.test(f),
      ),
  },
  {
    name: "performance-reviewer",
    reason: "Data, query, or cache-related files were changed.",
    condition: (input) =>
      input.filesChanged.some((f) =>
        /query|cache|database|db\/|sql|perf|benchmark|stream|batch/i.test(f),
      ),
  },
  {
    name: "integration-reviewer",
    reason: "Configuration, CI/CD, or package files were changed.",
    condition: (input) =>
      input.filesChanged.some((f) =>
        /workflows|docker|compose|package\.json|tsconfig|\.env|config/i.test(f),
      ),
  },
  {
    name: "thoroughness-reviewer",
    reason: "Large diff with many changes across multiple files.",
    condition: (input) =>
      input.filesChanged.length >= 5 ||
      input.insertions + input.deletions >= 300,
  },
]

export function createReviewRouterTool() {
  return {
    name: "review_router",
    async execute(input: ReviewRouterInput): Promise<ReviewRouterResult> {
      const reviewers: ReviewerRecommendation[] = []

      for (const rule of BASE_REVIEWERS) {
        if (rule.condition(input)) {
          reviewers.push({ name: rule.name, reason: rule.reason })
        }
      }

      for (const rule of CONDITIONAL_REVIEWERS) {
        if (rule.condition(input)) {
          reviewers.push({ name: rule.name, reason: rule.reason })
        }
      }

      return { reviewers }
    },
  }
}
