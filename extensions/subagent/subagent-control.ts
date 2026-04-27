// Based on pi-subagents by Nico Bailon (https://github.com/nicobailon/pi-subagents)
// MIT License
import {
	type ActivityState,
	type ControlConfig,
	type ControlEvent,
	type ControlEventType,
	type ControlNotificationChannel,
	type ResolvedControlConfig,
} from "./types.ts";

const CONTROL_EVENT_TYPES: ControlEventType[] = ["needs_attention"];
const CONTROL_NOTIFICATION_CHANNELS: ControlNotificationChannel[] = ["event", "async", "intercom"];
const DEFAULT_NOTIFY_ON: ControlEventType[] = ["needs_attention"];

export const DEFAULT_CONTROL_CONFIG: ResolvedControlConfig = {
	enabled: true,
	needsAttentionAfterMs: 60_000,
	notifyOn: DEFAULT_NOTIFY_ON,
	notifyChannels: CONTROL_NOTIFICATION_CHANNELS,
};

function parsePositiveInt(value: unknown): number | undefined {
	if (typeof value !== "number") return undefined;
	if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) return undefined;
	return value;
}

function parseControlList<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
	if (!Array.isArray(value)) return undefined;
	if (value.length === 0) return [];
	const allowedSet = new Set(allowed);
	const parsed = value.filter((entry): entry is T => typeof entry === "string" && allowedSet.has(entry as T));
	return parsed.length > 0 ? Array.from(new Set(parsed)) : undefined;
}

export function resolveControlConfig(
	globalConfig?: ControlConfig,
	override?: ControlConfig,
): ResolvedControlConfig {
	const enabled = override?.enabled ?? globalConfig?.enabled ?? DEFAULT_CONTROL_CONFIG.enabled;
	const needsAttentionAfterMs = parsePositiveInt(override?.needsAttentionAfterMs)
		?? parsePositiveInt(globalConfig?.needsAttentionAfterMs)
		?? DEFAULT_CONTROL_CONFIG.needsAttentionAfterMs;
	const notifyOn = parseControlList(override?.notifyOn, CONTROL_EVENT_TYPES)
		?? parseControlList(globalConfig?.notifyOn, CONTROL_EVENT_TYPES)
		?? DEFAULT_CONTROL_CONFIG.notifyOn;
	const notifyChannels = parseControlList(override?.notifyChannels, CONTROL_NOTIFICATION_CHANNELS)
		?? parseControlList(globalConfig?.notifyChannels, CONTROL_NOTIFICATION_CHANNELS)
		?? DEFAULT_CONTROL_CONFIG.notifyChannels;
	return {
		enabled,
		needsAttentionAfterMs,
		notifyOn: [...notifyOn],
		notifyChannels: [...notifyChannels],
	};
}

export function deriveActivityState(input: {
	config: ResolvedControlConfig;
	startedAt: number;
	lastActivityAt?: number;
	now?: number;
}): ActivityState | undefined {
	if (!input.config.enabled) return undefined;
	const now = input.now ?? Date.now();
	const lastActivity = input.lastActivityAt ?? input.startedAt;
	const ageMs = Math.max(0, now - lastActivity);
	return ageMs > input.config.needsAttentionAfterMs ? "needs_attention" : undefined;
}

export function shouldEmitControlEvent(
	config: ResolvedControlConfig,
	from: ActivityState | undefined,
	to: ActivityState | undefined,
): boolean {
	return config.enabled && from !== to && to === "needs_attention";
}

export function buildControlEvent(input: {
	from?: ActivityState;
	to: ActivityState;
	runId: string;
	agent: string;
	index?: number;
	ts?: number;
	lastActivityAt?: number;
}): ControlEvent {
	const ts = input.ts ?? Date.now();
	const elapsedMs = input.lastActivityAt ? Math.max(0, ts - input.lastActivityAt) : undefined;
	const elapsedSeconds = elapsedMs !== undefined ? Math.floor(elapsedMs / 1000) : undefined;
	const message = elapsedSeconds !== undefined
		? `${input.agent} needs attention (no observed activity for ${elapsedSeconds}s)`
		: `${input.agent} needs attention`;
	return {
		type: "needs_attention",
		from: input.from,
		to: input.to,
		ts,
		runId: input.runId,
		agent: input.agent,
		index: input.index,
		message,
	};
}

export function shouldNotifyControlEvent(config: ResolvedControlConfig, event: ControlEvent): boolean {
	return config.enabled && config.notifyOn.includes(event.type);
}

export function controlNotificationKey(event: ControlEvent, childIntercomTarget?: string): string {
	const childKey = childIntercomTarget ?? (event.index !== undefined ? `${event.runId}:${event.index}` : event.runId);
	return `${childKey}:${event.type}`;
}

export function claimControlNotification(config: ResolvedControlConfig, event: ControlEvent, seenKeys: Set<string>, childIntercomTarget?: string): boolean {
	if (!shouldNotifyControlEvent(config, event)) return false;
	const key = controlNotificationKey(event, childIntercomTarget);
	if (seenKeys.has(key)) return false;
	seenKeys.add(key);
	return true;
}

export function formatControlNoticeMessage(event: ControlEvent, childIntercomTarget?: string): string {
	const runTarget = event.runId;
	const nudgeCommand = childIntercomTarget
		? `intercom({ action: "send", to: "${childIntercomTarget}", message: "What are you blocked on? Reply with the smallest next step or ask for a decision." })`
		: undefined;
	return [
		`Subagent needs attention: ${event.agent}`,
		`Run: ${runTarget}${event.index !== undefined ? ` step ${event.index + 1}` : ""}`,
		`Signal: ${event.message}`,
		"Hint: Inspect status first unless the run is clearly blocked.",
		childIntercomTarget
			? `Nudge: ${nudgeCommand}`
			: "Nudge: no child message route registered",
		`Status: subagent({ action: "status", id: "${runTarget}" })`,
		`Interrupt: subagent({ action: "interrupt", id: "${runTarget}" })`,
	].join("\n");
}

export function formatControlIntercomMessage(event: ControlEvent, childIntercomTarget?: string): string {
	return [
		"subagent needs attention",
		"",
		`${event.agent} needs attention in run ${event.runId}.`,
		"",
		formatControlNoticeMessage(event, childIntercomTarget),
	].join("\n");
}
