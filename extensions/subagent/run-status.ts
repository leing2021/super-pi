// Based on pi-subagents by Nico Bailon (https://github.com/nicobailon/pi-subagents)
// MIT License
import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { formatAsyncRunList, listAsyncRuns } from "./async-status.ts";
import { ASYNC_DIR, RESULTS_DIR, type Details } from "./types.ts";
import { findByPrefix, readStatus } from "./utils.ts";

export interface RunStatusParams {
	action?: "status";
	id?: string;
	runId?: string;
	dir?: string;
}

function activityText(activityState: unknown, lastActivityAt: unknown): string | undefined {
	if (typeof lastActivityAt !== "number") return undefined;
	const seconds = Math.floor(Math.max(0, Date.now() - lastActivityAt) / 1000);
	return activityState === "needs_attention" ? `no activity for ${seconds}s` : `active ${seconds}s ago`;
}

export function inspectSubagentStatus(params: RunStatusParams): AgentToolResult<Details> {
	if (!params.id && !params.runId && !params.dir) {
		try {
			const runs = listAsyncRuns(ASYNC_DIR, { states: ["queued", "running"] });
			return {
				content: [{ type: "text", text: formatAsyncRunList(runs) }],
				details: { mode: "single", results: [] },
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: "text", text: message }],
				isError: true,
				details: { mode: "single", results: [] },
			};
		}
	}

	let asyncDir: string | null = null;
	let resolvedId = params.id ?? params.runId;

	if (params.dir) {
		asyncDir = path.resolve(params.dir);
	} else if (resolvedId) {
		const direct = path.join(ASYNC_DIR, resolvedId);
		if (fs.existsSync(direct)) {
			asyncDir = direct;
		} else {
			const match = findByPrefix(ASYNC_DIR, resolvedId);
			if (match) {
				asyncDir = match;
				resolvedId = path.basename(match);
			}
		}
	}

	const resultPath = resolvedId && !asyncDir ? findByPrefix(RESULTS_DIR, resolvedId, ".json") : null;

	if (!asyncDir && !resultPath) {
		return {
			content: [{ type: "text", text: "Async run not found. Provide id or dir." }],
			isError: true,
			details: { mode: "single", results: [] },
		};
	}

	if (asyncDir) {
		let status;
		try {
			status = readStatus(asyncDir);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: "text", text: message }],
				isError: true,
				details: { mode: "single", results: [] },
			};
		}
		const logPath = path.join(asyncDir, `subagent-log-${resolvedId ?? "unknown"}.md`);
		const eventsPath = path.join(asyncDir, "events.jsonl");
		if (status) {
			const stepsTotal = status.steps?.length ?? 1;
			const current = status.currentStep !== undefined ? status.currentStep + 1 : undefined;
			const stepLine = current !== undefined ? `Step: ${current}/${stepsTotal}` : `Steps: ${stepsTotal}`;
			const started = new Date(status.startedAt).toISOString();
			const updated = status.lastUpdate ? new Date(status.lastUpdate).toISOString() : "n/a";
			const statusActivityText = status.state === "running" ? activityText(status.activityState, status.lastActivityAt) : undefined;

			const lines = [
				`Run: ${status.runId}`,
				`State: ${status.state}`,
				statusActivityText ? `Activity: ${statusActivityText}` : undefined,
				`Mode: ${status.mode}`,
				stepLine,
				`Started: ${started}`,
				`Updated: ${updated}`,
				`Dir: ${asyncDir}`,
			].filter((line): line is string => Boolean(line));
			for (const [index, step] of (status.steps ?? []).entries()) {
				const stepActivityText = step.status === "running" ? activityText(step.activityState, step.lastActivityAt) : undefined;
				lines.push(`Step ${index + 1}: ${step.agent} ${step.status}${stepActivityText ? `, ${stepActivityText}` : ""}`);
			}
			if (status.sessionFile) lines.push(`Session: ${status.sessionFile}`);
			if (fs.existsSync(logPath)) lines.push(`Log: ${logPath}`);
			if (fs.existsSync(eventsPath)) lines.push(`Events: ${eventsPath}`);

			return { content: [{ type: "text", text: lines.join("\n") }], details: { mode: "single", results: [] } };
		}
	}

	if (resultPath) {
		try {
			const raw = fs.readFileSync(resultPath, "utf-8");
			const data = JSON.parse(raw) as { id?: string; success?: boolean; summary?: string; exitCode?: number; state?: string };
			const status = data.success ? "complete" : data.state === "paused" || data.exitCode === 0 ? "paused" : "failed";
			const lines = [`Run: ${data.id ?? resolvedId}`, `State: ${status}`, `Result: ${resultPath}`];
			if (data.summary) lines.push("", data.summary);
			return { content: [{ type: "text", text: lines.join("\n") }], details: { mode: "single", results: [] } };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: "text", text: `Failed to read async result file: ${message}` }],
				isError: true,
				details: { mode: "single", results: [] },
			};
		}
	}

	return {
		content: [{ type: "text", text: "Status file not found." }],
		isError: true,
		details: { mode: "single", results: [] },
	};
}
