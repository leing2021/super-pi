import { describe, it, expect, vi, beforeEach, afterEach } from "bun:test";
import {
	resolveWidgetInterval,
} from "../render.ts";

describe("resolveWidgetInterval", () => {
	it("returns 250ms for 1-2 running jobs", () => {
		expect(resolveWidgetInterval(0)).toBe(250);
		expect(resolveWidgetInterval(1)).toBe(250);
		expect(resolveWidgetInterval(2)).toBe(250);
	});

	it("returns 400ms for 3-4 running jobs", () => {
		expect(resolveWidgetInterval(3)).toBe(400);
		expect(resolveWidgetInterval(4)).toBe(400);
	});

	it("returns 600ms for 5-6 running jobs", () => {
		expect(resolveWidgetInterval(5)).toBe(600);
		expect(resolveWidgetInterval(6)).toBe(600);
	});

	it("returns 1000ms for 7+ running jobs", () => {
		expect(resolveWidgetInterval(7)).toBe(1000);
		expect(resolveWidgetInterval(8)).toBe(1000);
		expect(resolveWidgetInterval(16)).toBe(1000);
	});
});
