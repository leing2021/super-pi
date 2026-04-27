/**
 * CE Model & Thinking Strategy Bridge
 * 
 * 同步 super-pi 的 modelStrategy 和 thinkingStrategy 到 pi-subagents 的 agentOverrides
 * 确保阶段模型和 thinking 等级自动应用到对应的 CE Agent
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// CE Stage to Agent mapping
const STAGE_AGENT_MAP: Record<string, string[]> = {
  "01-brainstorm": ["ce-scout", "ce-researcher"],
  "02-plan": ["ce-planner"],
  "03-work": ["ce-worker"],
  "04-review": ["ce-reviewer"],
  "05-learn": ["ce-oracle"],
};

// Default fallback
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_THINKING = "medium";

export interface ModelStrategyConfig {
  [stage: string]: string;
}

export interface ThinkingStrategyConfig {
  [stage: string]: string;
}

export interface SubagentAgentOverride {
  model?: string;
  thinking?: string;
}

export interface SubagentConfig {
  agentOverrides?: Record<string, SubagentAgentOverride>;
}

export interface Settings {
  modelStrategy?: ModelStrategyConfig;
  thinkingStrategy?: ThinkingStrategyConfig;
  subagents?: SubagentConfig;
  [key: string]: unknown;
}

/**
 * Read settings from file
 */
export function readSettings(filePath: string): Settings {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Write settings to file
 */
export function writeSettings(filePath: string, settings: Settings): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

/**
 * Sync modelStrategy and thinkingStrategy to subagents.agentOverrides
 * 
 * This ensures that when pi-subagents runs a CE agent,
 * it uses the model and thinking level configured for that stage.
 */
export function syncStrategiesToAgentOverrides(settings: Settings): Settings {
  const modelStrategy = settings.modelStrategy;
  const thinkingStrategy = settings.thinkingStrategy;
  
  if (!modelStrategy && !thinkingStrategy) return settings;

  // Initialize subagents if not present
  const subagents = settings.subagents || { agentOverrides: {} };
  const agentOverrides = subagents.agentOverrides || {};

  // Build stage-based override for each agent
  for (const [stage, agents] of Object.entries(STAGE_AGENT_MAP)) {
    const model = modelStrategy?.[stage];
    const thinking = thinkingStrategy?.[stage];
    
    if (model || thinking) {
      for (const agent of agents) {
        agentOverrides[agent] = {
          ...agentOverrides[agent],
          ...(model ? { model } : {}),
          ...(thinking ? { thinking } : {}),
        };
      }
    }
  }

  return {
    ...settings,
    subagents: {
      ...subagents,
      agentOverrides,
    },
  };
}

/**
 * Get the effective model for a stage
 */
export function getStageModel(stage: string, settings: Settings): string {
  if (settings.modelStrategy?.[stage]) {
    return settings.modelStrategy[stage];
  }

  const agents = STAGE_AGENT_MAP[stage];
  if (agents && settings.subagents?.agentOverrides) {
    for (const agent of agents) {
      const override = settings.subagents.agentOverrides[agent];
      if (override?.model) {
        return override.model;
      }
    }
  }

  return settings.modelStrategy?.default || DEFAULT_MODEL;
}

/**
 * Get the effective thinking level for a stage
 */
export function getStageThinking(stage: string, settings: Settings): string {
  if (settings.thinkingStrategy?.[stage]) {
    return settings.thinkingStrategy[stage];
  }

  const agents = STAGE_AGENT_MAP[stage];
  if (agents && settings.subagents?.agentOverrides) {
    for (const agent of agents) {
      const override = settings.subagents.agentOverrides[agent];
      if (override?.thinking) {
        return override.thinking;
      }
    }
  }

  return DEFAULT_THINKING;
}

/**
 * Auto-sync settings on startup
 */
export function autoSyncSettings(projectRoot?: string): { home: boolean; project: boolean } {
  const homeSettingsPath = path.join(os.homedir(), ".pi", "agent", "settings.json");
  const projectSettingsPath = projectRoot 
    ? path.join(projectRoot, ".pi", "settings.json")
    : null;

  let homeSynced = false;
  let projectSynced = false;

  // Sync home settings
  const homeSettings = readSettings(homeSettingsPath);
  const syncedHome = syncStrategiesToAgentOverrides(homeSettings);
  if (JSON.stringify(homeSettings) !== JSON.stringify(syncedHome)) {
    writeSettings(homeSettingsPath, syncedHome);
    homeSynced = true;
    console.log("[super-pi-extension] Synced modelStrategy + thinkingStrategy to agentOverrides");
  }

  // Sync project settings
  if (projectSettingsPath && fs.existsSync(projectSettingsPath)) {
    const projectSettings = readSettings(projectSettingsPath);
    const syncedProject = syncStrategiesToAgentOverrides(projectSettings);
    if (JSON.stringify(projectSettings) !== JSON.stringify(syncedProject)) {
      writeSettings(projectSettingsPath, syncedProject);
      projectSynced = true;
      console.log("[super-pi-extension] Synced modelStrategy + thinkingStrategy (project)");
    }
  }

  return { home: homeSynced, project: projectSynced };
}

/**
 * CLI helper to sync settings
 */
export function syncSettingsCli(): void {
  const cwd = process.cwd();
  const result = autoSyncSettings(cwd);
  if (result.home || result.project) {
    console.log("[super-pi-extension] Settings synced successfully");
  } else {
    console.log("[super-pi-extension] No settings needed syncing");
  }
}

// Run if called directly
const isMain = process.argv[1] && process.argv[1].endsWith("model-sync.ts");
if (isMain) {
  syncSettingsCli();
}
