/**
 * super-pi-extension
 * 
 * Compound Engineering + pi-subagents integration extension
 * 
 * Features:
 * - Pre-configured CE Agents (ce-scout, ce-planner, ce-worker, ce-reviewer, ce-oracle)
 * - Pre-configured CE Chains (ce-standard, ce-review-only, ce-parallel-review)
 * - Model strategy sync: modelStrategy[stage] → subagents.agentOverrides[agent].model
 * - Thinking strategy sync: thinkingStrategy[stage] → subagents.agentOverrides[agent].thinking
 * - Graceful dependency detection for pi-subagents
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

// CE Stage to Agent mapping
const STAGE_AGENT_MAP: Record<string, string[]> = {
  "01-brainstorm": ["ce-scout", "ce-researcher"],
  "02-plan": ["ce-planner"],
  "03-work": ["ce-worker"],
  "04-review": ["ce-reviewer"],
  "05-learn": ["ce-oracle"],
};

interface Settings {
  modelStrategy?: Record<string, string>;
  thinkingStrategy?: Record<string, string>;
  subagents?: {
    agentOverrides?: Record<string, { model?: string; thinking?: string }>;
  };
  [key: string]: unknown;
}

/**
 * Read settings from file
 */
function readSettings(filePath: string): Settings {
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
function writeSettings(filePath: string, settings: Settings): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

/**
 * Sync modelStrategy and thinkingStrategy to subagents.agentOverrides
 */
function syncStrategiesToAgentOverrides(settings: Settings): Settings {
  const modelStrategy = settings.modelStrategy;
  const thinkingStrategy = settings.thinkingStrategy;
  
  if (!modelStrategy && !thinkingStrategy) return settings;

  const subagents = settings.subagents || { agentOverrides: {} };
  const agentOverrides = subagents.agentOverrides || {};

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
 * Auto-sync settings on extension load
 */
function autoSyncSettings(projectRoot?: string): void {
  const homeSettingsPath = path.join(os.homedir(), ".pi", "agent", "settings.json");
  const projectSettingsPath = projectRoot
    ? path.join(projectRoot, ".pi", "settings.json")
    : null;

  // Sync home settings
  const homeSettings = readSettings(homeSettingsPath);
  const syncedHome = syncStrategiesToAgentOverrides(homeSettings);
  if (JSON.stringify(homeSettings) !== JSON.stringify(syncedHome)) {
    writeSettings(homeSettingsPath, syncedHome);
    console.log("[super-pi-extension] Synced modelStrategy + thinkingStrategy to agentOverrides");
  }

  // Sync project settings
  if (projectSettingsPath && fs.existsSync(projectSettingsPath)) {
    const projectSettings = readSettings(projectSettingsPath);
    const syncedProject = syncStrategiesToAgentOverrides(projectSettings);
    if (JSON.stringify(projectSettings) !== JSON.stringify(syncedProject)) {
      writeSettings(projectSettingsPath, syncedProject);
      console.log("[super-pi-extension] Synced modelStrategy + thinkingStrategy (project)");
    }
  }
}

/**
 * Check if pi-subagents extension is installed
 */
function isPiSubagentsInstalled(): boolean {
  const extensionsDir = path.join(os.homedir(), ".pi", "agent", "extensions", "subagent");
  return fs.existsSync(extensionsDir) && fs.existsSync(path.join(extensionsDir, "index.ts"));
}

/**
 * Try to install pi-subagents automatically
 */
function tryAutoInstallPiSubagents(): boolean {
  try {
    console.log("[super-pi-extension] Attempting to install pi-subagents...");
    execSync("pi install npm:pi-subagents", { stdio: "inherit" });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format installation instructions
 */
function formatInstallInstructions(): string {
  return `
╔══════════════════════════════════════════════════════════════════╗
║                    super-pi Extension Loaded                      ║
╠══════════════════════════════════════════════════════════════════╣
║  ⚡ For enhanced CE workflow capabilities, install pi-subagents:  ║
║                                                                  ║
║    pi install npm:pi-subagents                                   ║
║                                                                  ║
║  This enables:                                                   ║
║    • /run ce-worker "execute plan"                               ║
║    • /run-chain ce-standard -- implement feature                 ║
║    • Parallel review with /run-chain ce-parallel-review --      ║
║                                                                  ║
║  Without it, CE Agents/Chains won't execute.                     ║
╚══════════════════════════════════════════════════════════════════╝
`;
}

export default {
  name: "super-pi-extension",
  description: "Compound Engineering integration for pi-subagents",

  async load(ctx: ExtensionContext): Promise<void> {
    const cwd = ctx.cwd || process.cwd();
    
    // Auto-sync modelStrategy + thinkingStrategy to agentOverrides
    autoSyncSettings(cwd);
    
    // Check for pi-subagents dependency
    if (!isPiSubagentsInstalled()) {
      console.warn("[super-pi-extension] pi-subagents not found. CE Agents/Chains require it.");
      console.warn("[super-pi-extension] Run: pi install npm:pi-subagents");
      
      // Optionally auto-install (uncomment to enable)
      // const installed = tryAutoInstallPiSubagents();
      // if (installed) {
      //   console.log("[super-pi-extension] pi-subagents installed successfully!");
      // }
    } else {
      console.log("[super-pi-extension] pi-subagents detected. Full CE workflow enabled.");
    }
    
    console.log("[super-pi-extension] Loaded. CE agents and chains available.");
  },
};
