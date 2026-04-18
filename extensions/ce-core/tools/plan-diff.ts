export interface PlanUnit {
  name: string
  description: string
  files: string[]
}

export interface PlanChange {
  action: "add" | "remove" | "modify"
  name: string
  description?: string
  files?: string[]
}

export interface PlanDiffInput {
  operation: "compare" | "patch"
  existingUnits: PlanUnit[]
  newRequirements?: PlanUnit[]
  changes?: PlanChange[]
}

export interface CompareResult {
  operation: "compare"
  added: PlanUnit[]
  removed: PlanUnit[]
  modified: PlanUnit[]
  unchanged: PlanUnit[]
}

export interface PatchResult {
  operation: "patch"
  units: PlanUnit[]
  appliedChanges: number
}

export type PlanDiffResult = CompareResult | PatchResult

function unitKey(u: PlanUnit): string {
  return u.name
}

function unitsEqual(a: PlanUnit, b: PlanUnit): boolean {
  return (
    a.description === b.description &&
    a.files.length === b.files.length &&
    a.files.every((f, i) => f === b.files[i])
  )
}

export function createPlanDiffTool() {
  return {
    name: "plan_diff",
    execute(input: PlanDiffInput): PlanDiffResult {
      switch (input.operation) {
        case "compare":
          return compare(input.existingUnits, input.newRequirements ?? [])
        case "patch":
          return patch(input.existingUnits, input.changes ?? [])
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

function compare(existing: PlanUnit[], newReqs: PlanUnit[]): CompareResult {
  const existingMap = new Map(existing.map((u) => [unitKey(u), u]))
  const newMap = new Map(newReqs.map((u) => [unitKey(u), u]))

  const added: PlanUnit[] = []
  const removed: PlanUnit[] = []
  const modified: PlanUnit[] = []
  const unchanged: PlanUnit[] = []

  // Find added and modified
  for (const [key, newUnit] of newMap) {
    const existingUnit = existingMap.get(key)
    if (!existingUnit) {
      added.push(newUnit)
    } else if (!unitsEqual(existingUnit, newUnit)) {
      modified.push(newUnit)
    } else {
      unchanged.push(newUnit)
    }
  }

  // Find removed
  for (const [key, existingUnit] of existingMap) {
    if (!newMap.has(key)) {
      removed.push(existingUnit)
    }
  }

  return { operation: "compare", added, removed, modified, unchanged }
}

function patch(existing: PlanUnit[], changes: PlanChange[]): PatchResult {
  const unitMap = new Map(existing.map((u) => [unitKey(u), { ...u }]))
  let appliedChanges = 0

  for (const change of changes) {
    switch (change.action) {
      case "add":
        unitMap.set(change.name, {
          name: change.name,
          description: change.description ?? "",
          files: change.files ?? [],
        })
        appliedChanges++
        break
      case "remove":
        if (unitMap.has(change.name)) {
          unitMap.delete(change.name)
          appliedChanges++
        }
        break
      case "modify": {
        const existing = unitMap.get(change.name)
        if (existing) {
          unitMap.set(change.name, {
            ...existing,
            description: change.description ?? existing.description,
            files: change.files ?? existing.files,
          })
          appliedChanges++
        }
        break
      }
    }
  }

  return {
    operation: "patch",
    units: Array.from(unitMap.values()),
    appliedChanges,
  }
}
