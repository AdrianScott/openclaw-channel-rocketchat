/**
 * Rate limiting utilities for API calls and WebSocket messages
 */

import {
  getEnvironmentSecurityConfig,
  type RateLimitConfig,
} from "./config.js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  check(): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    const remaining = Math.max(
      0,
      this.config.maxRequests - this.requests.length,
    );
    const allowed = this.requests.length < this.config.maxRequests;

    if (allowed) {
      this.requests.push(now);
    }

    const resetTime = windowStart + this.config.windowMs;
    const retryAfter = allowed
      ? undefined
      : Math.ceil((resetTime - now) / 1000);

    // Log when rate limits are approached or exceeded
    const usagePercent = (this.requests.length / this.config.maxRequests) * 100;
    if (usagePercent >= 90) {
      console.warn(
        `[RATE_LIMIT] High usage detected: ${this.requests.length}/${this.config.maxRequests} requests (${usagePercent.toFixed(1)}%)`,
      );
    }

    if (!allowed) {
      console.error(
        `[RATE_LIMIT] Rate limit exceeded: ${this.requests.length}/${this.config.maxRequests} requests. Retry after ${retryAfter}s`,
      );
    }

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter,
    };
  }

  reset(): void {
    this.requests = [];
  }

  getStatus(): { current: number; max: number; windowMs: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const current = this.requests.filter(
      (timestamp) => timestamp > windowStart,
    ).length;

    return {
      current,
      max: this.config.maxRequests,
      windowMs: this.config.windowMs,
    };
  }
}

/**
 * API rate limiter for REST API calls
 */
export class ApiRateLimiter {
  private limiters = new Map<string, RateLimiter>();
  private defaultConfig: RateLimitConfig;

  constructor(defaultConfig?: Partial<RateLimitConfig>) {
    this.defaultConfig = {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      ...defaultConfig,
    };
  }

  /**
   * Check if a request is allowed for a given identifier
   */
  check(
    identifier: string,
    config?: Partial<RateLimitConfig>,
  ): RateLimitResult {
    const finalConfig = { ...this.defaultConfig, ...config };

    if (!this.limiters.has(identifier)) {
      this.limiters.set(identifier, new RateLimiter(finalConfig));
      console.info(
        `[RATE_LIMIT] Created new rate limiter for identifier: ${identifier}`,
      );
    }

    const result = this.limiters.get(identifier)!.check();

    // Log detailed status for monitoring
    const status = this.limiters.get(identifier)!.getStatus();
    if (result.allowed) {
      console.debug(
        `[RATE_LIMIT] ${identifier}: ${status.current}/${status.max} requests used (${status.max - status.current} remaining)`,
      );
    } else {
      console.error(
        `[RATE_LIMIT] ${identifier}: BLOCKED - ${status.current}/${status.max} requests used. Retry after ${result.retryAfter}s`,
      );
    }

    return result;
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    const limiter = this.limiters.get(identifier);
    if (limiter) {
      limiter.reset();
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(
    identifier: string,
  ): { current: number; max: number; windowMs: number } | null {
    const limiter = this.limiters.get(identifier);
    return limiter ? limiter.getStatus() : null;
  }

  /**
   * Clean up old limiters to prevent memory leaks
   */
  cleanup(): void {
    // Simple cleanup - remove limiters that haven't been used recently
    // In production, you might want a more sophisticated cleanup strategy
    if (this.limiters.size > 1000) {
      this.limiters.clear();
    }
  }
}

/**
 * WebSocket message rate limiter
 */
export class WebSocketRateLimiter {
  private limiters = new Map<string, RateLimiter>();
  private defaultConfig: RateLimitConfig;

  constructor(defaultConfig?: Partial<RateLimitConfig>) {
    this.defaultConfig = {
      maxRequests: 30,
      windowMs: 10000, // 10 seconds
      ...defaultConfig,
    };
  }

  /**
   * Check if a WebSocket message is allowed
   */
  check(
    connectionId: string,
    config?: Partial<RateLimitConfig>,
  ): RateLimitResult {
    const finalConfig = { ...this.defaultConfig, ...config };

    if (!this.limiters.has(connectionId)) {
      this.limiters.set(connectionId, new RateLimiter(finalConfig));
      console.info(
        `[WS_RATE_LIMIT] Created new WebSocket rate limiter for connection: ${connectionId}`,
      );
    }

    const result = this.limiters.get(connectionId)!.check();

    // Log detailed status for monitoring
    const status = this.limiters.get(connectionId)!.getStatus();
    if (result.allowed) {
      console.debug(
        `[WS_RATE_LIMIT] ${connectionId}: ${status.current}/${status.max} messages used (${status.max - status.current} remaining)`,
      );
    } else {
      console.error(
        `[WS_RATE_LIMIT] ${connectionId}: BLOCKED - ${status.current}/${status.max} messages used. Retry after ${result.retryAfter}s`,
      );
    }

    return result;
  }

  /**
   * Remove rate limiter for disconnected connection
   */
  removeConnection(connectionId: string): void {
    this.limiters.delete(connectionId);
  }

  /**
   * Get current rate limit status for a connection
   */
  getStatus(
    connectionId: string,
  ): { current: number; max: number; windowMs: number } | null {
    const limiter = this.limiters.get(connectionId);
    return limiter ? limiter.getStatus() : null;
  }
}

/**
 * Global rate limiter instances - configured using security config
 */
const securityConfig = getEnvironmentSecurityConfig();

export const apiRateLimiter = new ApiRateLimiter(securityConfig.apiRateLimit);

export const websocketRateLimiter = new WebSocketRateLimiter(
  securityConfig.websocketRateLimit,
);

/**
 * Rate limiting middleware for API calls
 */
export function withRateLimit<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  identifier: string,
  config?: Partial<RateLimitConfig>,
) {
  return async (...args: T): Promise<R> => {
    const result = apiRateLimiter.check(identifier, config);

    if (!result.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      );
    }

    return fn(...args);
  };
}

/**
 * Rate limiting for WebSocket messages
 */
export function checkWebSocketRateLimit(
  connectionId: string,
  config?: Partial<RateLimitConfig>,
): RateLimitResult {
  return websocketRateLimiter.check(connectionId, config);
}

/**
 * Cleanup function to prevent memory leaks
 */
export function cleanupRateLimiters(): void {
  apiRateLimiter.cleanup();
}
