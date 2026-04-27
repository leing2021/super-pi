// SPDX-FileCopyrightText: 2025 Nico Bailon
// SPDX-License-Identifier: MIT
// Source: https://github.com/nicobailon/pi-subagents
export interface AsyncOverrideParams {
	async?: boolean;
	clarify?: boolean;
}

export function applyForceTopLevelAsyncOverride<T extends AsyncOverrideParams>(
	params: T,
	depth: number,
	forceTopLevelAsync: boolean,
): T {
	if (!(depth === 0 && forceTopLevelAsync)) return params;
	return { ...params, async: true, clarify: false };
}
