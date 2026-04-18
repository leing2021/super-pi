export interface ArtifactInput {
  path: string
  content: string
}

export interface Pattern {
  keyword: string
  occurrences: number
  sources: string[]
}

export interface ExtractInput {
  operation: "extract"
  artifacts: ArtifactInput[]
  keywords?: string[]
}

export interface ExtractResult {
  operation: "extract"
  patterns: Pattern[]
}

export interface CategorizeInput {
  operation: "categorize"
  patterns: Pattern[]
  categories: Record<string, string[]>
}

export interface CategorizeResult {
  operation: "categorize"
  categories: Record<string, Pattern[]>
  uncategorized: Pattern[]
}

export type PatternExtractorInput = ExtractInput | CategorizeInput | { operation: string; artifacts?: ArtifactInput[] }
export type PatternExtractorResult = ExtractResult | CategorizeResult

function extractKeywords(content: string): string[] {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function extractWithKeywords(artifacts: ArtifactInput[], keywords: string[]): Pattern[] {
  const patterns: Pattern[] = []

  for (const keyword of keywords) {
    const sources: string[] = []
    let occurrences = 0

    for (const artifact of artifacts) {
      const regex = new RegExp(keyword, "gi")
      const matches = artifact.content.match(regex)
      if (matches && matches.length > 0) {
        occurrences += matches.length
        sources.push(artifact.path)
      }
    }

    if (occurrences > 0) {
      patterns.push({ keyword, occurrences, sources })
    }
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences)
}

function extractAllKeywords(artifacts: ArtifactInput[]): Pattern[] {
  const wordMap = new Map<string, { count: number; sources: Set<string> }>()

  for (const artifact of artifacts) {
    const words = extractKeywords(artifact.content)
    const uniqueWords = new Set(words)

    for (const word of uniqueWords) {
      const existing = wordMap.get(word) ?? { count: 0, sources: new Set<string>() }
      existing.count += words.filter((w) => w === word).length
      existing.sources.add(artifact.path)
      wordMap.set(word, existing)
    }
  }

  return Array.from(wordMap.entries())
    .map(([keyword, data]) => ({
      keyword,
      occurrences: data.count,
      sources: Array.from(data.sources),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
}

export function createPatternExtractorTool() {
  return {
    name: "pattern_extractor",
    execute(input: PatternExtractorInput): PatternExtractorResult {
      switch (input.operation) {
        case "extract": {
          const artifacts = (input as ExtractInput).artifacts
          const keywords = (input as ExtractInput).keywords
          const patterns = keywords && keywords.length > 0
            ? extractWithKeywords(artifacts, keywords)
            : extractAllKeywords(artifacts)
          return { operation: "extract", patterns }
        }
        case "categorize": {
          const { patterns, categories } = input as CategorizeInput
          const result: Record<string, Pattern[]> = {}
          const uncategorized: Pattern[] = []
          const matched = new Set<string>()

          for (const [category, catKeywords] of Object.entries(categories)) {
            result[category] = []
          }

          for (const pattern of patterns) {
            let found = false
            for (const [category, catKeywords] of Object.entries(categories)) {
              if (catKeywords.some((kw) => kw.toLowerCase() === pattern.keyword.toLowerCase())) {
                result[category].push(pattern)
                matched.add(pattern.keyword)
                found = true
                break
              }
            }
            if (!found) {
              uncategorized.push(pattern)
            }
          }

          return { operation: "categorize", categories: result, uncategorized }
        }
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}
