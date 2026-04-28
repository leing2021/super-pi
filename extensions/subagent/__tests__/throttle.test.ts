import { describe, it, expect, vi, beforeEach, afterEach } from "bun:test";
import { createThrottle, resolveThrottleInterval } from "../throttle.ts";

describe("createThrottle", () => {
	beforeEach(() => { vi.useFakeTimers(); });
	afterEach(() => { vi.useRealTimers(); });

	it("executes the first call immediately", () => {
		const fn = vi.fn();
		const throttled = createThrottle(fn, 200);
		throttled("a");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith("a");
	});

	it("drops calls within the interval, keeping only the latest args", () => {
		const fn = vi.fn();
		const throttled = createThrottle(fn, 200);
		throttled("a");
		throttled("b");
		throttled("c");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith("a");

		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith("c");
	});

	it("does not fire trailing call if no pending args", () => {
		const fn = vi.fn();
		const throttled = createThrottle(fn, 200);
		throttled("a");
		expect(fn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(200);
		// No new call after "a", so no trailing fire
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("flush() immediately executes the latest pending args", () => {
		const fn = vi.fn();
		const throttled = createThrottle(fn, 200);
		throttled("a");
		throttled("b");
		throttled.flush();
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith("b");
	});

	it("flush() does nothing if no pending call", () => {
		const fn = vi.fn();
		const throttled = createThrottle(fn, 200);
		throttled.flush();
		expect(fn).toHaveBeenCalledTimes(0);
	});

	it("dispose() clears timers and prevents future trailing calls", () => {
		const fn = vi.fn();
		const throttled = createThrottle(fn, 200);
		throttled("a");
		throttled("b");
		throttled.dispose();
		vi.advanceTimersByTime(500);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith("a");
	});
});

describe("resolveThrottleInterval", () => {
	it("returns 0 for 1 task (no throttle)", () => {
		expect(resolveThrottleInterval(1)).toBe(0);
	});

	it("returns 200ms for 2-4 tasks", () => {
		expect(resolveThrottleInterval(2)).toBe(200);
		expect(resolveThrottleInterval(3)).toBe(200);
		expect(resolveThrottleInterval(4)).toBe(200);
	});

	it("returns 500ms for 5-8 tasks", () => {
		expect(resolveThrottleInterval(5)).toBe(500);
		expect(resolveThrottleInterval(8)).toBe(500);
	});

	it("returns 1000ms for 9+ tasks", () => {
		expect(resolveThrottleInterval(9)).toBe(1000);
		expect(resolveThrottleInterval(16)).toBe(1000);
	});
});
