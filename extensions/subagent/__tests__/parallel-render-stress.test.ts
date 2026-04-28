import { describe, it, expect, vi, beforeEach, afterEach } from "bun:test";
import { createThrottle, resolveThrottleInterval } from "../throttle.ts";
import { resolveWidgetInterval } from "../render.ts";
import { resolveActivityTimerInterval } from "../execution.ts";
import { resolvePollInterval } from "../async-job-tracker.ts";

/**
 * Integration stress test: simulates 8 parallel subagents firing events
 * and validates that total render frequency stays within bounds.
 */
describe("parallel render stress", () => {
	beforeEach(() => { vi.useFakeTimers(); });
	afterEach(() => { vi.useRealTimers(); });

	it("limits onUpdate to ≤5 triggers/s with 8 parallel tasks", () => {
		const interval = resolveThrottleInterval(8);
		expect(interval).toBe(500);

		const fn = vi.fn();
		const throttled = createThrottle(fn, interval);

		// Simulate 100 rapid fireUpdate calls in 1ms intervals (like 8 processes sending events)
		for (let i = 0; i < 100; i++) {
			throttled({ index: i });
			vi.advanceTimersByTime(1);
		}

		// First call executes immediately, then at most 1 call per 500ms
		// Over 100ms simulated time: 1 (immediate) + ~0 (no 500ms passed yet) = 1 call
		expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1);
		expect(fn.mock.calls.length).toBeLessThanOrEqual(2);

		throttled.dispose();
	});

	it("allows at most 2 calls in 500ms for 8 tasks (500ms throttle)", () => {
		const interval = resolveThrottleInterval(8);
		const fn = vi.fn();
		const throttled = createThrottle(fn, interval);

		// Immediate first call
		throttled("a");
		expect(fn).toHaveBeenCalledTimes(1);

		// Fire many more
		for (let i = 0; i < 50; i++) throttled(`b-${i}`);

		// Advance 500ms — trailing fires
		vi.advanceTimersByTime(500);
		expect(fn).toHaveBeenCalledTimes(2); // immediate + 1 trailing

		throttled.dispose();
	});

	it("widget animation interval adapts to 1000ms at 7+ running jobs", () => {
		expect(resolveWidgetInterval(7)).toBe(1000);
		expect(resolveWidgetInterval(8)).toBe(1000);
	});

	it("activity timer adapts to 3000ms for parallel scenarios", () => {
		expect(resolveActivityTimerInterval(8)).toBe(3000);
	});

	it("poll interval adapts to 2000ms at 5+ running jobs", () => {
		expect(resolvePollInterval(5)).toBe(2000);
		expect(resolvePollInterval(8)).toBe(2000);
	});

	it("total theoretical render rate with 8 parallel subagents is ≤ 8/s", () => {
		const widgetRate = 1000 / resolveWidgetInterval(8);      // renders/s
		const pollRate = 1000 / resolvePollInterval(8);           // polls/s
		const throttleRate = 1000 / resolveThrottleInterval(8);   // onUpdate/s
		const activityRate = 1000 / resolveActivityTimerInterval(8); // activity checks/s

		// Widget animation + poll + onUpdate throttle + activity are the main render sources
		// Note: not all fire requestRender every time
		const totalMaxRate = widgetRate + pollRate + throttleRate + activityRate;

		// With all optimizations, should be well under 8/s total
		expect(totalMaxRate).toBeLessThanOrEqual(8);
	});
});
