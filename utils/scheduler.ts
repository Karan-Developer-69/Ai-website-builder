
import { SchedulerTask } from '../types';

/**
 * Task Scheduler for optimizing API calls and handling Rate Limits.
 */
class TaskScheduler {
  private queue: SchedulerTask[] = [];
  private isProcessing = false;

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
        await task.execute();
      } catch (error: any) {
        // NOTE: App.tsx handles the key rotation inside executeWithRetry.
        // If an error still bubbles up here, it means all keys failed or it's non-retriable.
        console.error(`[Scheduler] Final task failure:`, error);
      }
    }

    // Processing delay to avoid burst limits even with rotation
    setTimeout(() => {
      this.isProcessing = false;
      this.processQueue();
    }, 200);
  }
}

export const apiScheduler = new TaskScheduler();
