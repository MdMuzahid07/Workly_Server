import { logger } from './logger.js';

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
        logger.info(
          '[CircuitBreaker] %s state changed to HALF_OPEN. Allowing verification request.',
          this.name,
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
        logger.info('[CircuitBreaker] %s returned to CLOSED state.', this.name);
      }
      this.failureCount = 0;
      return result;
    } catch (error) {
      if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
        this.failureCount++;
        logger.warn(
          { failureCount: this.failureCount, threshold: this.failureThreshold, err: error },
          '[CircuitBreaker] %s operation failed',
          this.name,
        );
        if (this.failureCount >= this.failureThreshold) {
          this.state = 'OPEN';
          this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
          logger.error(
            '[ALERT] [CircuitBreaker] %s is now OPEN. Cooldown active until %s',
            this.name,
            new Date(this.nextAttemptTime).toISOString(),
          );
        }
      }
      throw error;
    }
  }
}
