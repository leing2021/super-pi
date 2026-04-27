// SPDX-FileCopyrightText: 2025 Nico Bailon
// SPDX-License-Identifier: MIT
// Source: https://github.com/nicobailon/pi-subagents
export type SubagentExecutionContext = "fresh" | "fork";

interface ForkableSessionManagerStatic {
	open(path: string): { createBranchedSession(leafId: string): string | undefined };
}

export interface ForkableSessionManager {
	getSessionFile(): string | undefined;
	getLeafId(): string | null;
	constructor: ForkableSessionManagerStatic;
}

export interface ForkContextResolver {
	sessionFileForIndex(index?: number): string | undefined;
}

export function resolveSubagentContext(value: unknown): SubagentExecutionContext {
	return value === "fork" ? "fork" : "fresh";
}

export function createForkContextResolver(
	sessionManager: ForkableSessionManager,
	requestedContext: unknown,
): ForkContextResolver {
	if (resolveSubagentContext(requestedContext) !== "fork") {
		return {
			sessionFileForIndex: () => undefined,
		};
	}

	const parentSessionFile = sessionManager.getSessionFile();
	if (!parentSessionFile) {
		throw new Error("Forked subagent context requires a persisted parent session.");
	}

	const leafId = sessionManager.getLeafId();
	if (!leafId) {
		throw new Error("Forked subagent context requires a current leaf to fork from.");
	}

	const cachedSessionFiles = new Map<number, string>();

	return {
		sessionFileForIndex(index = 0): string | undefined {
			const cached = cachedSessionFiles.get(index);
			if (cached) return cached;
			try {
				const sourceManager = sessionManager.constructor.open(parentSessionFile);
				const sessionFile = sourceManager.createBranchedSession(leafId);
				if (!sessionFile) {
					throw new Error("Session manager did not return a session file.");
				}
				cachedSessionFiles.set(index, sessionFile);
				return sessionFile;
			} catch (error) {
				const cause = error instanceof Error ? error : new Error(String(error));
				throw new Error(`Failed to create forked subagent session: ${cause.message}`, { cause });
			}
		},
	};
}
