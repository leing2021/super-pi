import { describe, it, expect } from "bun:test";
import { resolvePollInterval } from "../async-job-tracker.ts";

describe("resolvePollInterval", () => {
	it("returns 1000ms as default (no running jobs)", () => {
		expect(resolvePollInterval(0)).toBe(1000);
		expect(resolvePollInterval(1)).toBe(1000);
		expect(resolvePollInterval(2)).toBe(1000);
	});

	it("returns 1500ms for 3-4 running jobs", () => {
		expect(resolvePollInterval(3)).toBe(1500);
		expect(resolvePollInterval(4)).toBe(1500);
	});

	it("returns 2000ms for 5+ running jobs", () => {
		expect(resolvePollInterval(5)).toBe(2000);
		expect(resolvePollInterval(8)).toBe(2000);
		expect(resolvePollInterval(16)).toBe(2000);
	});
});
