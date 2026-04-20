/**
 * Async mutex for serializing critical sections that mutate shared state
 * (e.g. process.env) across concurrent async operations.
 */
export class AsyncMutex {
  private queue: (() => void)[] = []
  private locked = false

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const tryAcquire = () => {
        if (!this.locked) {
          this.locked = true
          resolve(() => this.release())
        } else {
          this.queue.push(tryAcquire)
        }
      }
      tryAcquire()
    })
  }

  private release(): void {
    this.locked = false
    const next = this.queue.shift()
    if (next) next()
  }
}
