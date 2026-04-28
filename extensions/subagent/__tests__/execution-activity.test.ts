import { describe, it, expect } from "bun:test";
import { resolveActivityTimerInterval } from "../execution.ts";

describe("resolveActivityTimerInterval", () => {
	it("returns 2000ms as default (single subprocess)", () => {
		expect(resolveActivityTimerInterval()).toBe(2000);
		expect(resolveActivityTimerInterval(1)).toBe(2000);
	});

	it("returns 3000ms for parallel scenarios (2+ concurrent)", () => {
		expect(resolveActivityTimerInterval(2)).toBe(3000);
		expect(resolveActivityTimerInterval(4)).toBe(3000);
		expect(resolveActivityTimerInterval(8)).toBe(3000);
	});
});
