
import { SchedulerTask } from '../types';

/**
 * Task Scheduler for optimizing API calls and handling Rate Limits.
 * Features:
 * - Priority queue for task execution
 * - Configurable delays to avoid rate limits
 * - Automatic throttling between requests
 */
class TaskScheduler {
  private queue: SchedulerTask[] = [];
  private isProcessing = false;
  private minDelayMs: number = 800; // Increased from 200ms to 800ms to avoid rate limits
  private lastExecutionTime: number = 0;

  /**
   * Set minimum delay between requests (in milliseconds)
   * Higher values = slower but safer from rate limits
   */
  public setMinDelay(delayMs: number): void {
    this.minDelayMs = Math.max(100, delayMs); // Minimum 100ms
    console.log(`[Scheduler] Request throttling set to ${this.minDelayMs}ms`);
  }

  public enqueue(execute: () => Promise<any>, priority: number = 5): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: SchedulerTask = {
        id: Math.random().toString(36).substring(7),
        priority,
        retries: 0,
        execute: async () => {
          try {
            const result = await execute();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      };

      this.queue.push(task);
      this.queue.sort((a, b) => b.priority - a.priority); // High priority first
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const task = this.queue.shift();

    if (task) {
      try {
        // Smart throttling: wait if last request was too recent
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastExecutionTime;

        if (timeSinceLastRequest < this.minDelayMs) {
          const waitTime = this.minDelayMs - timeSinceLastRequest;
          console.log(`[Scheduler] ⏳ Throttling request (waiting ${waitTime}ms to avoid rate limits)`);
          await new Promise(r => setTimeout(r, waitTime));
        }

        await task.execute();
        this.lastExecutionTime = Date.now();
      } catch (error: any) {
        // NOTE: App.tsx handles the key rotation inside executeWithRetry.
        // If an error still bubbles up here, it means all keys failed or it's non-retriable.
        console.error(`[Scheduler] Final task failure:`, error);
      }
    }

    // Additional delay between tasks to avoid burst limits
    setTimeout(() => {
      this.isProcessing = false;
      this.processQueue();
    }, this.minDelayMs);
  }

  /**
   * Get current queue length (useful for debugging)
   */
  public getQueueLength(): number {
    return this.queue.length;
  }
}

export const apiScheduler = new TaskScheduler();

