export interface SplitterUnit {
  name: string
  files: string[]
}

export interface SplitterGroup {
  units: string[]
  parallelSafe: boolean
  sharedFiles?: string[]
}

export interface TaskSplitterInput {
  units: SplitterUnit[]
}

export interface TaskSplitterResult {
  groups: SplitterGroup[]
  independentUnits: string[]
  dependentUnits: string[]
}

export function createTaskSplitterTool() {
  return {
    name: "task_splitter",
    execute(input: TaskSplitterInput): TaskSplitterResult {
      if (input.units.length === 0) {
        return { groups: [], independentUnits: [], dependentUnits: [] }
      }

      // Build file → unit names map
      const fileToUnits = new Map<string, string[]>()
      for (const unit of input.units) {
        for (const file of unit.files) {
          const existing = fileToUnits.get(file) ?? []
          existing.push(unit.name)
          fileToUnits.set(file, existing)
        }
      }

      // Union-Find: merge units that share files
      const parent = new Map<string, string>()
      const sharedFilesMap = new Map<string, Set<string>>()

      function find(name: string): string {
        if (!parent.has(name)) parent.set(name, name)
        let root = name
        while (parent.get(root) !== root) {
          root = parent.get(root)!
        }
        // Path compression
        let current = name
        while (current !== root) {
          const next = parent.get(current)!
          parent.set(current, root)
          current = next
        }
        return root
      }

      function union(a: string, b: string) {
        const rootA = find(a)
        const rootB = find(b)
        if (rootA !== rootB) {
          parent.set(rootA, rootB)
        }
      }

      // Initialize all units
      for (const unit of input.units) {
        find(unit.name)
      }

      // Merge units sharing files
      for (const [file, unitNames] of fileToUnits) {
        if (unitNames.length > 1) {
          for (let i = 1; i < unitNames.length; i++) {
            union(unitNames[0], unitNames[i])
          }
          // Track shared files per root
          const root = find(unitNames[0])
          if (!sharedFilesMap.has(root)) sharedFilesMap.set(root, new Set())
          sharedFilesMap.get(root)!.add(file)
        }
      }

      // Build groups by root
      const rootToUnits = new Map<string, string[]>()
      for (const unit of input.units) {
        const root = find(unit.name)
        const group = rootToUnits.get(root) ?? []
        group.push(unit.name)
        rootToUnits.set(root, group)
      }

      // Build output
      const groups: SplitterGroup[] = []
      const independentUnits: string[] = []
      const dependentUnits: string[] = []

      for (const [root, unitNames] of rootToUnits) {
        const hasShared = sharedFilesMap.has(root) && sharedFilesMap.get(root)!.size > 0
        const parallelSafe = !hasShared

        const group: SplitterGroup = {
          units: unitNames,
          parallelSafe,
        }

        if (!parallelSafe) {
          group.sharedFiles = Array.from(sharedFilesMap.get(root)!)
          dependentUnits.push(...unitNames)
        } else {
          independentUnits.push(...unitNames)
        }

        groups.push(group)
      }

      return { groups, independentUnits, dependentUnits }
    },
  }
}
