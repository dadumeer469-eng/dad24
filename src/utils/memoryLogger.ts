import { useEffect } from "react";

interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

/**
  * Safely logs current JS Heap memory usage in development mode if supported by the runtime (e.g. Chrome/WebKit with flags).
  */
export function logMemoryUsage(tag: string = "Memory Snapshot"): void {
  const isDev = import.meta.env?.DEV || process.env.NODE_ENV !== "production";
  if (!isDev) return;

  const perf = window.performance as Performance & { memory?: PerformanceMemory };

  if (perf && perf.memory) {
    const usedMB = (perf.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
    const totalMB = (perf.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2);
    const limitMB = (perf.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);

    console.groupCollapsed(
      `%c[Memory Usage] %c${tag}%c - ${usedMB} MB / ${totalMB} MB (Limit: ${limitMB} MB)`,
      "color: #d70f64; font-weight: bold;",
      "color: #10b981; font-weight: bold;",
      "color: #6b7280;"
    );
    console.log({
      usedJSHeapSizeMB: Number(usedMB),
      totalJSHeapSizeMB: Number(totalMB),
      jsHeapSizeLimitMB: Number(limitMB),
      timestamp: new Date().toISOString(),
    });
    console.groupEnd();
  } else {
    console.log(
      `%c[Memory Usage] %c${tag}%c - performance.memory is not supported in this browser environment.`,
      "color: #d70f64; font-weight: bold;",
      "color: #10b981; font-weight: bold;",
      "color: #6b7280;"
    );
  }
}

/**
 * Disposable resource manager for holding heavy references or listeners
 * and releasing them explicitly during component unmounts.
 */
export class ResourceDisposer {
  private cleanups: Array<() => void> = [];

  /**
   * Add a cleanup callback (e.g., removing event listener, aborting fetch, clearing interval/timeout, releasing blob URLs).
   */
  public add(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  /**
   * Helper to attach window/document event listener and auto-register cleanup.
   */
  public addEventListener<K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }

  /**
   * Helper to register timeouts and auto-register clear.
   */
  public setTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(fn, ms);
    this.add(() => window.clearTimeout(id));
    return id;
  }

  /**
   * Helper to register intervals and auto-register clear.
   */
  public setInterval(fn: () => void, ms: number): number {
    const id = window.setInterval(fn, ms);
    this.add(() => window.clearInterval(id));
    return id;
  }

  /**
   * Dispose all registered resources and empty the list.
   */
  public dispose(): void {
    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop();
      if (cleanup) {
        try {
          cleanup();
        } catch (err) {
          console.warn("[ResourceDisposer] Error during resource cleanup:", err);
        }
      }
    }
  }
}

/**
 * React hook to monitor component memory footprint on mount/unmount in dev mode
 * and execute a cleanup routine to dispose of heavy objects or long-lived event listeners.
 */
export function useMemoryMonitor(
  componentName: string,
  onCleanup?: (disposer: ResourceDisposer) => void
): ResourceDisposer {
  useEffect(() => {
    logMemoryUsage(`${componentName} Mount`);
    const disposer = new ResourceDisposer();

    if (onCleanup) {
      onCleanup(disposer);
    }

    return () => {
      disposer.dispose();
      logMemoryUsage(`${componentName} Unmount`);
    };
  }, [componentName]);

  return new ResourceDisposer();
}
