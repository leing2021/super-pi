/**
 * Throttle utility for subagent event streams.
 * Prevents render storms by coalescing high-frequency onUpdate calls.
 */

/**
 * Resolve the throttle interval based on parallel task count.
 * Returns 0 for single task (no throttling needed).
 */
export function resolveThrottleInterval(taskCount: number): number {
	if (taskCount <= 1) return 0;
	if (taskCount <= 4) return 200;
	if (taskCount <= 8) return 500;
	return 1000;
}

/**
 * Create a throttled version of a function.
 *
 * - First call executes immediately.
 * - Subsequent calls within `intervalMs` are coalesced; only the latest args are kept.
 * - After `intervalMs`, if there was a pending call, it fires with the latest args.
 * - `flush()` immediately executes any pending call.
 * - `dispose()` cancels the timer and prevents future trailing calls.
 */
export function createThrottle<T extends (...args: any[]) => void>(
	fn: T,
	intervalMs: number,
): T & { flush(): void; dispose(): void } {
	let pendingArgs: any[] | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;

	function execute(args: any[]) {
		pendingArgs = null;
		timer = null;
		fn(...args);
	}

	const throttled = function (this: unknown, ...args: any[]) {
		if (timer === null) {
			// First call — execute immediately
			execute(args);
			timer = setTimeout(() => {
				if (pendingArgs !== null) {
					execute(pendingArgs);
				} else {
					timer = null;
				}
			}, intervalMs);
			if (timer && typeof timer === "object" && "unref" in timer) {
				(timer as ReturnType<typeof setTimeout> & { unref(): void }).unref();
			}
		} else {
			// Within interval — save latest args
			pendingArgs = args;
		}
	} as T & { flush(): void; dispose(): void };

	throttled.flush = () => {
		if (pendingArgs !== null) {
			if (timer !== null) {
				clearTimeout(timer);
			}
			execute(pendingArgs);
		}
	};

	throttled.dispose = () => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		pendingArgs = null;
	};

	return throttled;
}
