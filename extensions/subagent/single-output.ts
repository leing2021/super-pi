// Based on pi-subagents by Nico Bailon (https://github.com/nicobailon/pi-subagents)
// MIT License
import * as fs from "node:fs";
import * as path from "node:path";

export interface SingleOutputSnapshot {
	exists: boolean;
	mtimeMs?: number;
	size?: number;
}

export function resolveSingleOutputPath(
	output: string | false | undefined,
	runtimeCwd: string,
	requestedCwd?: string,
): string | undefined {
	if (typeof output !== "string" || !output) return undefined;
	if (path.isAbsolute(output)) return output;
	const baseCwd = requestedCwd
		? (path.isAbsolute(requestedCwd) ? requestedCwd : path.resolve(runtimeCwd, requestedCwd))
		: runtimeCwd;
	return path.resolve(baseCwd, output);
}

export function injectSingleOutputInstruction(task: string, outputPath: string | undefined): string {
	if (!outputPath) return task;
	return `${task}\n\n---\n**Output:** Write your findings to: ${outputPath}`;
}

export function captureSingleOutputSnapshot(outputPath: string | undefined): SingleOutputSnapshot | undefined {
	if (!outputPath) return undefined;
	try {
		const stat = fs.statSync(outputPath);
		return { exists: true, mtimeMs: stat.mtimeMs, size: stat.size };
	} catch {
		return { exists: false };
	}
}

export function persistSingleOutput(
	outputPath: string | undefined,
	fullOutput: string,
): { savedPath?: string; error?: string } {
	if (!outputPath) return {};
	try {
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });
		fs.writeFileSync(outputPath, fullOutput, "utf-8");
		return { savedPath: outputPath };
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) };
	}
}

export function resolveSingleOutput(
	outputPath: string | undefined,
	fallbackOutput: string,
	beforeRun: SingleOutputSnapshot | undefined,
): { fullOutput: string; savedPath?: string; saveError?: string } {
	if (!outputPath) return { fullOutput: fallbackOutput };

	try {
		const stat = fs.statSync(outputPath);
		const changedSinceStart = !beforeRun?.exists
			|| stat.mtimeMs !== beforeRun.mtimeMs
			|| stat.size !== beforeRun.size;
		if (changedSinceStart) {
			return {
				fullOutput: fs.readFileSync(outputPath, "utf-8"),
				savedPath: outputPath,
			};
		}
	} catch {}

	const save = persistSingleOutput(outputPath, fallbackOutput);
	if (save.savedPath) return { fullOutput: fallbackOutput, savedPath: save.savedPath };
	return { fullOutput: fallbackOutput, saveError: save.error };
}

export function finalizeSingleOutput(params: {
	fullOutput: string;
	truncatedOutput?: string;
	outputPath?: string;
	exitCode: number;
	savedPath?: string;
	saveError?: string;
}): { displayOutput: string; savedPath?: string; saveError?: string } {
	let displayOutput = params.truncatedOutput || params.fullOutput;
	if (params.exitCode === 0 && params.savedPath) {
		displayOutput += `\n\nOutput saved to: ${params.savedPath}`;
		return { displayOutput, savedPath: params.savedPath };
	}
	if (params.exitCode === 0 && params.saveError && params.outputPath) {
		displayOutput += `\n\nFailed to save output to: ${params.outputPath}\n${params.saveError}`;
		return { displayOutput, saveError: params.saveError };
	}
	return { displayOutput };
}
