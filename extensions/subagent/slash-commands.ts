// SPDX-FileCopyrightText: 2025 Nico Bailon
// SPDX-License-Identifier: MIT
// Source: https://github.com/nicobailon/pi-subagents
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey } from "@mariozechner/pi-tui";
import { discoverAgentsAll } from "./agents.ts";
import { AgentManagerComponent, type ManagerResult } from "./agent-manager.ts";
import { SubagentsStatusComponent } from "./subagents-status.ts";
import { discoverAvailableSkills } from "./skills.ts";
import type { SubagentParamsLike } from "./subagent-executor.ts";
import type { SlashSubagentResponse, SlashSubagentUpdate } from "./slash-bridge.ts";
import {
	applySlashUpdate,
	buildSlashInitialResult,
	failSlashResult,
	finalizeSlashResult,
} from "./slash-live-state.ts";
import {
	SLASH_RESULT_TYPE,
	SLASH_SUBAGENT_CANCEL_EVENT,
	SLASH_SUBAGENT_REQUEST_EVENT,
	SLASH_SUBAGENT_RESPONSE_EVENT,
	SLASH_SUBAGENT_STARTED_EVENT,
	SLASH_SUBAGENT_UPDATE_EVENT,
	type SingleResult,
	type SubagentState,
} from "./types.ts";

function extractSlashMessageText(content: string | Array<{ type?: string; text?: string }>): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((part): part is { type: "text"; text: string } => part?.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n");
}

function formatExportPathList(paths: string[]): string {
	return paths.map((file) => `- \`${file}\``).join("\n");
}

function collectResultPaths(results: SingleResult[], getPath: (result: SingleResult) => string | undefined): string[] {
	return results
		.map(getPath)
		.filter((file): file is string => typeof file === "string" && file.length > 0);
}

function buildSlashExportText(response: SlashSubagentResponse): string {
	const output = extractSlashMessageText(response.result.content) || response.errorText || "(no output)";
	const results = response.result.details?.results ?? [];
	const sessionFiles = collectResultPaths(results, (result) => result.sessionFile);
	const savedOutputs = collectResultPaths(results, (result) => result.savedOutputPath);
	const artifactOutputs = collectResultPaths(results, (result) => result.artifactPaths?.outputPath);
	const sections = ["## Subagent result", output];
	if (sessionFiles.length > 0) sections.push("## Child session exports", formatExportPathList(sessionFiles));
	if (savedOutputs.length > 0) sections.push("## Saved outputs", formatExportPathList(savedOutputs));
	if (artifactOutputs.length > 0) sections.push("## Artifact outputs", formatExportPathList(artifactOutputs));
	return sections.join("\n\n");
}

function persistSlashSessionSnapshot(ctx: ExtensionContext): void {
	try {
		if (!ctx.sessionManager) return;
		const sessionManager = ctx.sessionManager as typeof ctx.sessionManager & {
			_rewriteFile?: () => void;
			flushed?: boolean;
		};
		const sessionFile = sessionManager.getSessionFile();
		if (!sessionFile || typeof sessionManager._rewriteFile !== "function") return;
		fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
		sessionManager._rewriteFile();
		sessionManager.flushed = true;
	} catch (error) {
		console.error("Failed to persist slash session snapshot for export:", error);
	}
}

async function requestSlashRun(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	requestId: string,
	params: SubagentParamsLike,
): Promise<SlashSubagentResponse> {
	return new Promise((resolve, reject) => {
		let done = false;
		let started = false;

		const startTimeoutMs = 15_000;
		const startTimeout = setTimeout(() => {
			finish(() => reject(new Error(
				"Slash subagent bridge did not start within 15s. Ensure the extension is loaded correctly.",
			)));
		}, startTimeoutMs);

		const onStarted = (data: unknown) => {
			if (done || !data || typeof data !== "object") return;
			if ((data as { requestId?: unknown }).requestId !== requestId) return;
			started = true;
			clearTimeout(startTimeout);
			if (ctx.hasUI) ctx.ui.setStatus("subagent-slash", "running...");
		};

		const onResponse = (data: unknown) => {
			if (done || !data || typeof data !== "object") return;
			const response = data as Partial<SlashSubagentResponse>;
			if (response.requestId !== requestId) return;
			clearTimeout(startTimeout);
			finish(() => resolve(response as SlashSubagentResponse));
		};

		const onUpdate = (data: unknown) => {
			if (done || !data || typeof data !== "object") return;
			const update = data as SlashSubagentUpdate;
			if (update.requestId !== requestId) return;
			applySlashUpdate(requestId, update);
			if (!ctx.hasUI) return;
			const tool = update.currentTool ? ` ${update.currentTool}` : "";
			const count = update.toolCount ?? 0;
			ctx.ui.setStatus("subagent-slash", `${count} tools${tool} | Ctrl+O live detail`);
		};

		const onTerminalInput = ctx.hasUI
			? ctx.ui.onTerminalInput((input) => {
				if (!matchesKey(input, Key.escape)) return undefined;
				pi.events.emit(SLASH_SUBAGENT_CANCEL_EVENT, { requestId });
				finish(() => reject(new Error("Cancelled")));
				return { consume: true };
			})
			: undefined;

		const unsubStarted = pi.events.on(SLASH_SUBAGENT_STARTED_EVENT, onStarted);
		const unsubResponse = pi.events.on(SLASH_SUBAGENT_RESPONSE_EVENT, onResponse);
		const unsubUpdate = pi.events.on(SLASH_SUBAGENT_UPDATE_EVENT, onUpdate);

		const finish = (next: () => void) => {
			if (done) return;
			done = true;
			clearTimeout(startTimeout);
			unsubStarted();
			unsubResponse();
			unsubUpdate();
			onTerminalInput?.();
			next();
		};

		pi.events.emit(SLASH_SUBAGENT_REQUEST_EVENT, { requestId, params });

		// Bridge emits STARTED synchronously during REQUEST emit.
		// If not started, no bridge received the request.
		if (!started && done) return;
		if (!started) {
			finish(() => reject(new Error(
				"No slash subagent bridge responded. Ensure the subagent extension is loaded correctly.",
			)));
		}
	});
}

async function runSlashSubagent(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	params: SubagentParamsLike,
): Promise<void> {
	const requestId = randomUUID();
	const initialDetails = buildSlashInitialResult(requestId, params);
	const initialText = extractSlashMessageText(initialDetails.result.content) || "Running subagent...";
	pi.sendMessage({
		customType: SLASH_RESULT_TYPE,
		content: initialText,
		display: true,
		details: initialDetails,
	});
	persistSlashSessionSnapshot(ctx);

	try {
		const response = await requestSlashRun(pi, ctx, requestId, params);
		const finalDetails = finalizeSlashResult(response);
		pi.sendMessage({
			customType: SLASH_RESULT_TYPE,
			content: buildSlashExportText(response),
			display: true,
			details: finalDetails,
		});
		persistSlashSessionSnapshot(ctx);
		if (ctx.hasUI) {
			ctx.ui.setStatus("subagent-slash", undefined);
		}
		if (response.isError && ctx.hasUI) {
			ctx.ui.notify(response.errorText || "Subagent failed", "error");
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const failedDetails = failSlashResult(requestId, params, message);
		pi.sendMessage({
			customType: SLASH_RESULT_TYPE,
			content: `## Subagent result\n\n${message}`,
			display: true,
			details: failedDetails,
		});
		persistSlashSessionSnapshot(ctx);
		if (ctx.hasUI) {
			ctx.ui.setStatus("subagent-slash", undefined);
		}
		if (message === "Cancelled") {
			if (ctx.hasUI) ctx.ui.notify("Cancelled", "warning");
			return;
		}
		if (ctx.hasUI) ctx.ui.notify(message, "error");
	}
}

async function openAgentManager(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): Promise<void> {
	const agentData = { ...discoverAgentsAll(ctx.cwd), cwd: ctx.cwd };
	const models = ctx.modelRegistry.getAvailable().map((m) => ({
		provider: m.provider,
		id: m.id,
		fullId: `${m.provider}/${m.id}`,
	}));
	const skills = discoverAvailableSkills(ctx.cwd);

	const result = await ctx.ui.custom<ManagerResult>(
		(tui, theme, _kb, done) => new AgentManagerComponent(tui, theme, agentData, models, skills, done),
		{ overlay: true, overlayOptions: { anchor: "center", width: 84, maxHeight: "80%" } },
	);
	if (!result) return;

	const launchOptions: SubagentParamsLike = {
		clarify: !result.skipClarify && !result.background,
		agentScope: "both",
		...(result.fork ? { context: "fork" as const } : {}),
		...(result.background ? { async: true } : {}),
	};

	if (result.action === "chain") {
		const chain = result.agents.map((name, i) => ({
			agent: name,
			...(i === 0 ? { task: result.task } : {}),
		}));
		await runSlashSubagent(pi, ctx, { chain, task: result.task, ...launchOptions });
		return;
	}

	if (result.action === "launch") {
		await runSlashSubagent(pi, ctx, { agent: result.agent, task: result.task, ...launchOptions });
	} else if (result.action === "launch-chain") {
		const chain = result.chain.steps.map((step) => ({
			agent: step.agent,
			task: step.task || undefined,
			output: step.output,
			reads: step.reads,
			progress: step.progress,
			skill: step.skills,
			model: step.model,
		}));
		await runSlashSubagent(pi, ctx, { chain, task: result.task, ...launchOptions, ...(result.worktree ? { worktree: true } : {}) });
	} else if (result.action === "parallel") {
		await runSlashSubagent(pi, ctx, {
			tasks: result.tasks,
			...launchOptions,
			...(result.worktree ? { worktree: true } : {}),
		});
	}
}

export function registerSlashCommands(
	pi: ExtensionAPI,
	state: SubagentState,
): void {
	pi.registerCommand("agents", {
		description: "Open the Agents Manager",
		handler: async (_args, ctx) => {
			await openAgentManager(pi, ctx);
		},
	});

	pi.registerCommand("subagents-status", {
		description: "Show active and recent async subagent runs",
		handler: async (_args, ctx) => {
			await ctx.ui.custom<void>(
				(tui, theme, _kb, done) => new SubagentsStatusComponent(tui, theme, () => done(undefined)),
				{ overlay: true, overlayOptions: { anchor: "center", width: 84, maxHeight: "80%" } },
			);
		},
	});

	pi.registerCommand("subagents-doctor", {
		description: "Show subagent diagnostics",
		handler: async (_args, ctx) => {
			await runSlashSubagent(pi, ctx, { action: "doctor" });
		},
	});

	pi.registerShortcut("ctrl+shift+a", {
		handler: async (ctx) => {
			await openAgentManager(pi, ctx);
		},
	});
}
