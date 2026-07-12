export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private nextAttemptTime = 0;

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 5,
    private readonly cooldownPeriodMs = 30000, // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        console.log(
          `[CircuitBreaker] ${this.name} state changed to HALF_OPEN. Allowing verification request.`,
        );
      } else {
        throw new Error(
          `[CircuitBreaker] ${this.name} is currently OPEN. Request blocked to prevent cascading failure.`,
        );
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        console.log(`[CircuitBreaker] ${this.name} returned to CLOSED state.`);
      }
      this.failureCount = 0;
      return result;
    } catch (error) {
      if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
        this.failureCount++;
        console.warn(
          `[CircuitBreaker] ${this.name} operation failed (${this.failureCount}/${this.failureThreshold}). Error: ${(error as Error).message}`,
        );
        if (this.failureCount >= this.failureThreshold) {
          this.state = 'OPEN';
          this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
          console.error(
            `[ALERT] [CircuitBreaker] ${this.name} is now OPEN. Cooldown active until ${new Date(this.nextAttemptTime).toISOString()}`,
          );
        }
      }
      throw error;
    }
  }
}
