/**
 * Error handling and sanitization utilities
 */

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum ErrorCategory {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  NETWORK = "network",
  RATE_LIMIT = "rate_limit",
  SYSTEM = "system",
  UNKNOWN = "unknown"
}

export interface SanitizedError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  details?: Record<string, any>;
  timestamp: number;
  requestId?: string;
}

/**
 * Classifies errors based on error content and type
 */
export function classifyError(error: Error | string): ErrorCategory {
  const message = typeof error === "string" ? error : error.message;
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many requests")) {
    return ErrorCategory.RATE_LIMIT;
  }
  
  if (lowerMessage.includes("invalid") || lowerMessage.includes("validation") || 
      lowerMessage.includes("malformed") || lowerMessage.includes("bad request")) {
    return ErrorCategory.VALIDATION;
  }
  
  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("forbidden") ||
      lowerMessage.includes("authentication") || lowerMessage.includes("token")) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (lowerMessage.includes("network") || lowerMessage.includes("connection") ||
      lowerMessage.includes("timeout") || lowerMessage.includes("fetch")) {
    return ErrorCategory.NETWORK;
  }
  
  if (lowerMessage.includes("system") || lowerMessage.includes("internal") ||
      lowerMessage.includes("server error")) {
    return ErrorCategory.SYSTEM;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determines error severity based on category and content
 */
export function determineSeverity(error: Error | string, category: ErrorCategory): ErrorSeverity {
  const message = typeof error === "string" ? error : error.message;
  const lowerMessage = message.toLowerCase();

  // Critical errors
  if (lowerMessage.includes("critical") || lowerMessage.includes("fatal") ||
      lowerMessage.includes("security") || lowerMessage.includes("breach")) {
    return ErrorSeverity.CRITICAL;
  }

  // High severity based on category
  if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.SYSTEM) {
    return ErrorSeverity.HIGH;
  }

  // Medium severity
  if (category === ErrorCategory.NETWORK || category === ErrorCategory.RATE_LIMIT) {
    return ErrorSeverity.MEDIUM;
  }

  // Default to low for validation errors
  return ErrorSeverity.LOW;
}

/**
 * Sanitizes error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(error: Error | string, requestId?: string): SanitizedError {
  const message = typeof error === "string" ? error : error.message;
  const category = classifyError(error);
  const severity = determineSeverity(error, category);

  // Remove sensitive information
  let sanitizedMessage = message
    .replace(/[A-Za-z0-9_-]{20,}/g, "[REDACTED]") // Redact long tokens/IDs
    .replace(/password/i, "[REDACTED]")
    .replace(/token/i, "[REDACTED]")
    .replace(/secret/i, "[REDACTED]")
    .replace(/key/i, "[REDACTED]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]") // Redact emails
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP]") // Redact IPs
    .replace(/\b[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}\b/g, "[UUID]"); // Redact UUIDs

  // Generate user-friendly messages based on category
  if (category === ErrorCategory.VALIDATION) {
    sanitizedMessage = "Invalid input provided. Please check your request and try again.";
  } else if (category === ErrorCategory.AUTHENTICATION) {
    sanitizedMessage = "Authentication failed. Please check your credentials.";
  } else if (category === ErrorCategory.RATE_LIMIT) {
    sanitizedMessage = "Too many requests. Please wait and try again later.";
  } else if (category === ErrorCategory.NETWORK) {
    sanitizedMessage = "Network error occurred. Please check your connection and try again.";
  } else if (category === ErrorCategory.SYSTEM) {
    sanitizedMessage = "A system error occurred. Please try again later.";
  }

  // Extract error code if present
  const codeMatch = message.match(/\b(error|code|status)\s*[:=]?\s*(\d+)\b/i);
  const code = codeMatch ? codeMatch[2] : undefined;

  return {
    message: sanitizedMessage,
    category,
    severity,
    code,
    timestamp: Date.now(),
    requestId
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: Error | string, requestId?: string): SanitizedError {
  const sanitized = sanitizeErrorMessage(error, requestId);
  
  // Add additional context for different error types
  const details: Record<string, any> = {};
  
  if (sanitized.category === ErrorCategory.RATE_LIMIT) {
    details.retryAfter = 60; // Default retry after 60 seconds
  }
  
  if (sanitized.category === ErrorCategory.VALIDATION) {
    details.fields = ["input"]; // Generic field indicator
  }

  return {
    ...sanitized,
    details: Object.keys(details).length > 0 ? details : undefined
  };
}

/**
 * Error logging utility that prevents sensitive data leakage
 */
export class SecureLogger {
  private static instance: SecureLogger;
  private logs: SanitizedError[] = [];
  private maxLogs = 1000;

  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  log(error: Error | string, context?: Record<string, any>): void {
    const sanitized = sanitizeErrorMessage(error, context?.requestId);
    
    // Add context if provided (sanitized)
    if (context) {
      const sanitizedContext = { ...context };
      delete sanitizedContext.password;
      delete sanitizedContext.token;
      delete sanitizedContext.secret;
      delete sanitizedContext.key;
      
      sanitized.details = {
        ...sanitized.details,
        context: sanitizedContext
      };
    }

    // Add to logs and maintain size limit
    this.logs.push(sanitized);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging with appropriate level
    const logMessage = `[${sanitized.severity.toUpperCase()}] ${sanitized.message}`;
    
    switch (sanitized.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, sanitized);
        break;
      case ErrorSeverity.HIGH:
        console.error(logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  getLogs(severity?: ErrorSeverity, category?: ErrorCategory): SanitizedError[] {
    let filteredLogs = this.logs;

    if (severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === severity);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    return filteredLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const log of this.logs) {
      const key = `${log.category}:${log.severity}`;
      stats[key] = (stats[key] || 0) + 1;
    }

    return stats;
  }
}

/**
 * Global error handler for uncaught errors
 */
export function setupGlobalErrorHandler(): void {
  const logger = SecureLogger.getInstance();

  process.on('uncaughtException', (error: Error) => {
    logger.log(error, { type: 'uncaughtException' });
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.log(reason instanceof Error ? reason : String(reason), { type: 'unhandledRejection' });
  });
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const logger = SecureLogger.getInstance();
      logger.log(error instanceof Error ? error : String(error), context);
      
      // Re-throw the sanitized error
      const sanitized = createErrorResponse(error, context?.requestId);
      throw new Error(sanitized.message);
    }
  };
}
