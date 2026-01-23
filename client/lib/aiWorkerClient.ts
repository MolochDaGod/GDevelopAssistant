/**
 * AI Worker Client
 * 
 * Monitors the frontend application and communicates with the AI worker backend.
 * Captures:
 * - Console logs (all levels)
 * - Errors and exceptions
 * - Performance metrics
 * - Application state
 */

interface WorkerConfig {
  apiEndpoint?: string;
  sessionId?: string;
  enableConsoleCapture?: boolean;
  enableErrorCapture?: boolean;
  enableStateCapture?: boolean;
  captureInterval?: number;
  autoStart?: boolean;
}

interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  stack?: string;
  metadata?: Record<string, any>;
}

class AIWorkerClient {
  private config: Required<WorkerConfig>;
  private sessionId: string;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
  };
  private logQueue: ConsoleLog[] = [];
  private sendInterval?: number;
  private isInitialized = false;

  constructor(config: WorkerConfig = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/ai-worker',
      sessionId: config.sessionId || this.generateSessionId(),
      enableConsoleCapture: config.enableConsoleCapture ?? true,
      enableErrorCapture: config.enableErrorCapture ?? true,
      enableStateCapture: config.enableStateCapture ?? true,
      captureInterval: config.captureInterval || 5000,
      autoStart: config.autoStart ?? true,
    };

    this.sessionId = this.config.sessionId;

    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };

    if (this.config.autoStart) {
      this.start();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isInitialized) {
      this.originalConsole.warn('[AI Worker] Already initialized');
      return;
    }

    if (this.config.enableConsoleCapture) {
      this.interceptConsole();
    }

    if (this.config.enableErrorCapture) {
      this.captureErrors();
    }

    if (this.config.enableStateCapture) {
      this.captureState();
      // Send state updates periodically
      this.sendInterval = window.setInterval(() => {
        this.captureState();
        this.flushLogs();
      }, this.config.captureInterval);
    }

    this.isInitialized = true;
    this.originalConsole.info('[AI Worker] Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isInitialized) return;

    // Restore original console
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;

    // Clear interval
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
    }

    this.isInitialized = false;
    this.originalConsole.info('[AI Worker] Monitoring stopped');
  }

  /**
   * Intercept console methods
   */
  private interceptConsole(): void {
    const self = this;

    const interceptor = (level: ConsoleLog['level'], originalMethod: Function) => {
      return function (...args: any[]) {
        // Call original method
        originalMethod(...args);

        // Capture log
        self.captureLog(level, args);
      };
    };

    console.log = interceptor('log', this.originalConsole.log);
    console.warn = interceptor('warn', this.originalConsole.warn);
    console.error = interceptor('error', this.originalConsole.error);
    console.info = interceptor('info', this.originalConsole.info);
    console.debug = interceptor('debug', this.originalConsole.debug);
  }

  /**
   * Capture a console log
   */
  private captureLog(level: ConsoleLog['level'], args: any[]): void {
    try {
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      const log: ConsoleLog = {
        level,
        message,
        timestamp: Date.now(),
      };

      // Capture stack trace for errors
      if (level === 'error' && args[0] instanceof Error) {
        log.stack = args[0].stack;
      }

      this.logQueue.push(log);

      // Send immediately for errors
      if (level === 'error') {
        this.sendError(log);
      }
    } catch (error) {
      this.originalConsole.error('[AI Worker] Failed to capture log:', error);
    }
  }

  /**
   * Capture unhandled errors
   */
  private captureErrors(): void {
    window.addEventListener('error', (event) => {
      const log: ConsoleLog = {
        level: 'error',
        message: event.message,
        timestamp: Date.now(),
        stack: event.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      };

      this.logQueue.push(log);
      this.sendError(log);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const log: ConsoleLog = {
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: Date.now(),
        stack: event.reason?.stack,
      };

      this.logQueue.push(log);
      this.sendError(log);
    });
  }

  /**
   * Capture application state
   */
  private captureState(): void {
    try {
      const state = {
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        performance: {
          domContentLoaded: performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart,
          loadComplete: performance.timing?.loadEventEnd - performance.timing?.navigationStart,
          memoryUsage: (performance as any).memory?.usedJSHeapSize,
        },
      };

      this.sendMessage('state', state).catch(err => {
        this.originalConsole.error('[AI Worker] Failed to send state:', err);
      });
    } catch (error) {
      this.originalConsole.error('[AI Worker] Failed to capture state:', error);
    }
  }

  /**
   * Flush queued logs
   */
  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    try {
      for (const log of logs) {
        await this.sendMessage('console', log);
      }
    } catch (error) {
      this.originalConsole.error('[AI Worker] Failed to flush logs:', error);
      // Re-queue failed logs
      this.logQueue.unshift(...logs);
    }
  }

  /**
   * Send error immediately
   */
  private async sendError(log: ConsoleLog): Promise<void> {
    try {
      await this.sendMessage('error', log);
    } catch (error) {
      this.originalConsole.error('[AI Worker] Failed to send error:', error);
    }
  }

  /**
   * Send a message to the worker
   */
  private async sendMessage(type: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          sessionId: this.sessionId,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Worker API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.originalConsole.error('[AI Worker] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send a chat message to the AI
   */
  async chat(message: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.response;
    } catch (error) {
      this.originalConsole.error('[AI Worker] Failed to send chat:', error);
      throw error;
    }
  }

  /**
   * Get session health
   */
  async getHealth(): Promise<any> {
    try {
      const response = await this.sendMessage('health', {});
      return response.data;
    } catch (error) {
      this.originalConsole.error('[AI Worker] Failed to get health:', error);
      throw error;
    }
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
let workerInstance: AIWorkerClient | null = null;

export function initAIWorker(config?: WorkerConfig): AIWorkerClient {
  if (!workerInstance) {
    workerInstance = new AIWorkerClient(config);
  }
  return workerInstance;
}

export function getAIWorker(): AIWorkerClient | null {
  return workerInstance;
}

export { AIWorkerClient };
export type { WorkerConfig, ConsoleLog };
