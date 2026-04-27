// SPDX-FileCopyrightText: 2025 Nico Bailon
// SPDX-License-Identifier: MIT
// Source: https://github.com/nicobailon/pi-subagents
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { buildCompletionKey, markSeenWithTtl } from "./completion-dedupe.ts";
import { createFileCoalescer } from "./file-coalescer.ts";
import {
	SUBAGENT_ASYNC_COMPLETE_EVENT,
	type SubagentState,
} from "./types.ts";
import {
	buildSubagentResultIntercomPayload,
	deliverSubagentResultIntercomEvent,
	resolveSubagentResultStatus,
} from "./result-intercom.ts";

function isNotFoundError(error: unknown): boolean {
	return typeof error === "object"
		&& error !== null
		&& "code" in error
		&& (error as NodeJS.ErrnoException).code === "ENOENT";
}

export function createResultWatcher(
	pi: ExtensionAPI,
	state: SubagentState,
	resultsDir: string,
	completionTtlMs: number,
): {
	startResultWatcher: () => void;
	primeExistingResults: () => void;
	stopResultWatcher: () => void;
} {
	const handleResult = async (file: string) => {
		const resultPath = path.join(resultsDir, file);
		if (!fs.existsSync(resultPath)) return;
		try {
			const data = JSON.parse(fs.readFileSync(resultPath, "utf-8")) as {
				id?: string;
				runId?: string;
				agent?: string;
				success?: boolean;
				state?: string;
				mode?: string;
				summary?: string;
				results?: Array<{
					agent?: string;
					output?: string;
					success?: boolean;
					artifactPaths?: { outputPath?: string };
					intercomTarget?: string;
				}>;
				sessionId?: string;
				cwd?: string;
				sessionFile?: string;
				asyncDir?: string;
				intercomTarget?: string;
			};
			if (data.sessionId && data.sessionId !== state.currentSessionId) return;
			if (!data.sessionId && data.cwd && data.cwd !== state.baseCwd) return;

			const now = Date.now();
			const completionKey = buildCompletionKey(data, `result:${file}`);
			if (markSeenWithTtl(state.completionSeen, completionKey, now, completionTtlMs)) {
				fs.unlinkSync(resultPath);
				return;
			}

			const intercomTarget = data.intercomTarget?.trim();
			if (intercomTarget) {
				const childResults = Array.isArray(data.results) && data.results.length > 0
					? data.results
					: [{
						agent: data.agent,
						output: data.summary,
						success: data.success,
					}];
				const runId = data.runId ?? data.id ?? file.replace(/\.json$/i, "");
				const mode = data.mode === "single" || data.mode === "parallel" || data.mode === "chain"
					? data.mode
					: childResults.length > 1 ? "chain" : "single";
				const payload = buildSubagentResultIntercomPayload({
					to: intercomTarget,
					runId,
					mode,
					source: "async",
					children: childResults.map((result = {}, index) => ({
						agent: result.agent ?? data.agent ?? `step-${index + 1}`,
						status: resolveSubagentResultStatus({
							success: result.success,
							state: data.state === "paused" || typeof result.success !== "boolean" ? data.state : undefined,
						}),
						summary: result.output ?? data.summary ?? "(no output)",
						index,
						artifactPath: result.artifactPaths?.outputPath,
						sessionPath: data.sessionFile,
						intercomTarget: result.intercomTarget,
					})),
					asyncId: data.id,
					asyncDir: data.asyncDir,
				});
				const delivered = await deliverSubagentResultIntercomEvent(pi.events, payload);
				if (!delivered) {
					console.error(`Subagent async grouped result intercom delivery was not acknowledged for '${resultPath}'.`);
				}
			}

			pi.events.emit(SUBAGENT_ASYNC_COMPLETE_EVENT, data);
			fs.unlinkSync(resultPath);
		} catch (error) {
			if (isNotFoundError(error)) return;
			console.error(`Failed to process subagent result file '${resultPath}':`, error);
		}
	};

	state.resultFileCoalescer = createFileCoalescer((file) => {
		void handleResult(file);
	}, 50);

	const scheduleRestart = () => {
		state.watcherRestartTimer = setTimeout(() => {
			try {
				fs.mkdirSync(resultsDir, { recursive: true });
				startResultWatcher();
			} catch (error) {
				console.error(`Failed to restart subagent result watcher for '${resultsDir}':`, error);
			}
		}, 3000);
	};

	const startResultWatcher = () => {
		state.watcherRestartTimer = null;
		try {
			state.watcher = fs.watch(resultsDir, (ev, file) => {
				if (ev !== "rename" || !file) return;
				const fileName = file.toString();
				if (!fileName.endsWith(".json")) return;
				state.resultFileCoalescer.schedule(fileName);
			});
			state.watcher.on("error", (error) => {
				console.error(`Subagent result watcher failed for '${resultsDir}':`, error);
				state.watcher = null;
				scheduleRestart();
			});
			state.watcher.unref?.();
		} catch (error) {
			console.error(`Failed to start subagent result watcher for '${resultsDir}':`, error);
			state.watcher = null;
			scheduleRestart();
		}
	};

	const primeExistingResults = () => {
		fs.readdirSync(resultsDir)
			.filter((f) => f.endsWith(".json"))
			.forEach((file) => state.resultFileCoalescer.schedule(file, 0));
	};

	const stopResultWatcher = () => {
		state.watcher?.close();
		state.watcher = null;
		if (state.watcherRestartTimer) {
			clearTimeout(state.watcherRestartTimer);
		}
		state.watcherRestartTimer = null;
		state.resultFileCoalescer.clear();
	};

	return { startResultWatcher, primeExistingResults, stopResultWatcher };
}
