// SPDX-FileCopyrightText: 2025 Nico Bailon
// SPDX-License-Identifier: MIT
// Source: https://github.com/nicobailon/pi-subagents
import type { AgentScope } from "./agents.ts";

export function resolveExecutionAgentScope(scope: unknown): AgentScope {
	if (scope === "user" || scope === "project" || scope === "both") return scope;
	return "both";
}
