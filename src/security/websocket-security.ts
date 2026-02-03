/**
 * WebSocket security utilities
 */

export interface WebSocketSecurityConfig {
  allowedOrigins: string[];
  enableOriginValidation: boolean;
  maxMessageSize: number;
  enableRateLimiting: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates WebSocket origin header
 */
export function validateWebSocketOrigin(
  origin: string | undefined,
  allowedOrigins: string[]
): ValidationResult {
  // If origin validation is disabled or no origin provided, allow
  if (!origin || allowedOrigins.length === 0) {
    return { valid: true };
  }

  // Normalize origin for comparison
  const normalizedOrigin = origin.toLowerCase().trim();
  
  // Check against allowed origins
  for (const allowedOrigin of allowedOrigins) {
    const normalizedAllowed = allowedOrigin.toLowerCase().trim();
    
    // Exact match
    if (normalizedOrigin === normalizedAllowed) {
      return { valid: true };
    }
    
    // Wildcard subdomain matching (*.example.com)
    if (normalizedAllowed.startsWith("*.")) {
      const domain = normalizedAllowed.slice(2);
      if (normalizedOrigin.endsWith(domain) || normalizedOrigin === domain) {
        return { valid: true };
      }
    }
    
    // Wildcard matching (exact wildcard)
    if (normalizedAllowed === "*") {
      return { valid: true };
    }
  }

  return { 
    valid: false, 
    error: `Origin '${origin}' is not allowed. Allowed origins: ${allowedOrigins.join(", ")}` 
  };
}

/**
 * Validates WebSocket message size
 */
export function validateWebSocketMessageSize(
  message: string | Buffer | ArrayBuffer,
  maxSize: number
): ValidationResult {
  const size = typeof message === 'string' 
    ? message.length 
    : message.byteLength;
  
  if (size > maxSize) {
    return { 
      valid: false, 
      error: `Message size ${size} exceeds maximum allowed size ${maxSize}` 
    };
  }
  
  return { valid: true };
}

/**
 * Validates WebSocket message format
 */
export function validateWebSocketMessage(message: string): ValidationResult {
  try {
    // Try to parse as JSON to ensure it's valid
    JSON.parse(message);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Invalid JSON message format: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Sanitizes WebSocket message content
 */
export function sanitizeWebSocketMessage(message: string): string {
  try {
    const parsed = JSON.parse(message);
    
    // Recursively sanitize object
    const sanitized = sanitizeObject(parsed);
    
    return JSON.stringify(sanitized);
  } catch {
    // If not JSON, return as-is but limit length
    return message.slice(0, 1000);
  }
}

/**
 * Recursively sanitizes object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip potentially sensitive keys
    if (isSensitiveKey(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      // Sanitize string values
      sanitized[key] = sanitizeStringValue(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Checks if a key is potentially sensitive
 */
function isSensitiveKey(key: string): boolean {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'private', 'confidential', 'sensitive', 'hash', 'signature'
  ];
  
  return sensitiveKeys.some(sensitive => 
    key.toLowerCase().includes(sensitive)
  );
}

/**
 * Sanitizes string values
 */
function sanitizeStringValue(value: string): string {
  // Remove potential script injections
  let sanitized = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[SCRIPT_REMOVED]")
    .replace(/javascript:/gi, "[JS_REMOVED]")
    .replace(/on\w+\s*=/gi, "[EVENT_REMOVED]");
  
  // Limit length to prevent DoS
  if (sanitized.length > 1000) {
    sanitized = sanitized.slice(0, 1000) + "... [TRUNCATED]";
  }
  
  return sanitized;
}

/**
 * WebSocket security manager
 */
export class WebSocketSecurityManager {
  private config: WebSocketSecurityConfig;
  private connectionAttempts = new Map<string, number>();
  private blockedIPs = new Set<string>();
  private readonly maxAttempts = 10;
  private readonly blockDuration = 300000; // 5 minutes

  constructor(config: Partial<WebSocketSecurityConfig> = {}) {
    this.config = {
      allowedOrigins: [], // Default to no origin restrictions
      enableOriginValidation: false,
      maxMessageSize: 1024 * 1024, // 1MB
      enableRateLimiting: true,
      ...config
    };
  }

  /**
   * Validates incoming WebSocket connection
   */
  validateConnection(origin: string | undefined, ip: string): ValidationResult {
    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      return { 
        valid: false, 
        error: "Connection blocked due to suspicious activity" 
      };
    }

    // Check connection attempts
    const attempts = this.connectionAttempts.get(ip) || 0;
    if (attempts > this.maxAttempts) {
      this.blockedIPs.add(ip);
      setTimeout(() => this.blockedIPs.delete(ip), this.blockDuration);
      return { 
        valid: false, 
        error: "Too many connection attempts" 
      };
    }

    // Validate origin if enabled
    if (this.config.enableOriginValidation) {
      const originResult = validateWebSocketOrigin(origin, this.config.allowedOrigins);
      if (!originResult.valid) {
        this.connectionAttempts.set(ip, attempts + 1);
        return originResult;
      }
    }

    // Reset attempts on successful validation
    this.connectionAttempts.delete(ip);
    return { valid: true };
  }

  /**
   * Validates incoming WebSocket message
   */
  validateMessage(message: string | Buffer | ArrayBuffer): ValidationResult {
    // Check message size
    const sizeResult = validateWebSocketMessageSize(message, this.config.maxMessageSize);
    if (!sizeResult.valid) {
      return sizeResult;
    }

    // If message is a string, validate format
    if (typeof message === 'string') {
      const formatResult = validateWebSocketMessage(message);
      if (!formatResult.valid) {
        return formatResult;
      }
    }

    return { valid: true };
  }

  /**
   * Sanitizes WebSocket message
   */
  sanitizeMessage(message: string): string {
    return sanitizeWebSocketMessage(message);
  }

  /**
   * Updates security configuration
   */
  updateConfig(newConfig: Partial<WebSocketSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current security status
   */
  getSecurityStatus(): {
    blockedIPs: number;
    connectionAttempts: number;
    config: WebSocketSecurityConfig;
  } {
    return {
      blockedIPs: this.blockedIPs.size,
      connectionAttempts: this.connectionAttempts.size,
      config: { ...this.config }
    };
  }

  /**
   * Clears blocked IPs and connection attempts
   */
  clearSecurityState(): void {
    this.blockedIPs.clear();
    this.connectionAttempts.clear();
  }
}

/**
 * Default WebSocket security manager instance
 */
export const webSocketSecurityManager = new WebSocketSecurityManager({
  allowedOrigins: [], // Configure based on your needs
  enableOriginValidation: false, // Enable in production
  maxMessageSize: 1024 * 1024, // 1MB
  enableRateLimiting: true
});
