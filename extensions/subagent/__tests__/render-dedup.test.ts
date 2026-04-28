import { describe, it, expect, vi, beforeEach } from "bun:test";

describe("render dedup", () => {
	beforeEach(async () => {
		const { _testResetWidgetState } = await import("../render.ts");
		_testResetWidgetState();
	});

	it("should not call requestRender when widget data is identical", async () => {
		const { renderWidget, stopWidgetAnimation } = await import("../render.ts");

		const setWidget = vi.fn();
		const requestRender = vi.fn();
		const theme = {
			fg: (_color: string, text: string) => text,
			bold: (text: string) => text,
		};
		const ctx = {
			hasUI: true,
			ui: { setWidget, requestRender, theme },
		} as any;

		const jobs = [
			{ asyncId: "test-1", asyncDir: "/tmp/test", status: "complete" as const, updatedAt: 1000 },
		];

		// First render — should call requestRender (new content)
		renderWidget(ctx, jobs);
		expect(requestRender).toHaveBeenCalledTimes(1);

		// Second render with EXACTLY same data — should NOT call requestRender
		renderWidget(ctx, jobs);
		expect(requestRender).toHaveBeenCalledTimes(1); // Still 1

		stopWidgetAnimation();
	});

	it("should call requestRender when widget data changes", async () => {
		const { renderWidget, stopWidgetAnimation } = await import("../render.ts");

		const setWidget = vi.fn();
		const requestRender = vi.fn();
		const theme = {
			fg: (_color: string, text: string) => text,
			bold: (text: string) => text,
		};
		const ctx = {
			hasUI: true,
			ui: { setWidget, requestRender, theme },
		} as any;

		// First render
		const jobs1 = [
			{ asyncId: "test-1", asyncDir: "/tmp/test", status: "running" as const, updatedAt: 1000 },
		];
		renderWidget(ctx, jobs1);
		expect(requestRender).toHaveBeenCalledTimes(1);

		// Second render with changed updatedAt — should call requestRender
		const jobs2 = [
			{ asyncId: "test-1", asyncDir: "/tmp/test", status: "running" as const, updatedAt: 2000 },
		];
		renderWidget(ctx, jobs2);
		expect(requestRender).toHaveBeenCalledTimes(2);

		stopWidgetAnimation();
	});

	it("should call requestRender on status transitions", async () => {
		const { renderWidget, stopWidgetAnimation } = await import("../render.ts");

		const setWidget = vi.fn();
		const requestRender = vi.fn();
		const theme = {
			fg: (_color: string, text: string) => text,
			bold: (text: string) => text,
		};
		const ctx = {
			hasUI: true,
			ui: { setWidget, requestRender, theme },
		} as any;

		const jobs1 = [
			{ asyncId: "test-1", asyncDir: "/tmp/test", status: "running" as const, updatedAt: 1000 },
		];
		renderWidget(ctx, jobs1);
		expect(requestRender).toHaveBeenCalledTimes(1);

		// Status changes to complete — should trigger requestRender
		const jobs2 = [
			{ asyncId: "test-1", asyncDir: "/tmp/test", status: "complete" as const, updatedAt: 2000 },
		];
		renderWidget(ctx, jobs2);
		expect(requestRender).toHaveBeenCalledTimes(2);

		stopWidgetAnimation();
	});
});
