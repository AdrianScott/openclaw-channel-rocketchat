/**
 * Security configuration for the Rocket.Chat channel plugin
 * These settings can be adjusted to match your specific requirements
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface WebSocketSecurityConfig {
  allowedOrigins: string[];
  enableOriginValidation: boolean;
  maxMessageSize: number;
  enableRateLimiting: boolean;
  maxConnectionAttempts: number;
  blockDurationMs: number;
}

export interface FileUploadConfig {
  maxFileSize: number; // in bytes
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  enableMagicNumberValidation: boolean;
  enableMimeTypeValidation: boolean; // New setting - disabled by default since Rocket.Chat handles this
}

export interface SecurityConfig {
  // Rate limiting settings
  apiRateLimit: RateLimitConfig;
  websocketRateLimit: RateLimitConfig;

  // WebSocket security
  websocketSecurity: WebSocketSecurityConfig;

  // File upload security
  fileUpload: FileUploadConfig;

  // General security settings
  enableErrorSanitization: boolean;
  enableInputValidation: boolean;
  logLevel: "error" | "warn" | "info" | "debug";
  enableSecurityMonitoring: boolean;
}

/**
 * Default security configuration
 * These values are designed to be generous while still providing protection
 */
export const defaultSecurityConfig: SecurityConfig = {
  // API Rate Limiting - 1,000 requests per minute per user
  apiRateLimit: {
    maxRequests: 1000,
    windowMs: 60000, // 1 minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // WebSocket Rate Limiting - 300 messages per 10 seconds per connection
  websocketRateLimit: {
    maxRequests: 300,
    windowMs: 10000, // 10 seconds
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // WebSocket Security
  websocketSecurity: {
    allowedOrigins: [], // Configure based on your needs
    enableOriginValidation: false, // Enable in production
    maxMessageSize: 1024 * 1024, // 1MB
    enableRateLimiting: true,
    maxConnectionAttempts: 10,
    blockDurationMs: 300000, // 5 minutes
  },

  // File Upload Security
  fileUpload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp", // Images
      ".pdf",
      ".txt",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx", // Documents
      ".zip",
      ".tar",
      ".gz", // Archives
      ".csv",
      ".json",
      ".xml",
      ".yaml",
      ".yml", // Data files
    ],
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
      "application/x-tar",
      "application/gzip",
      "text/csv",
      "application/json",
      "application/xml",
      "text/yaml",
      "application/x-yaml",
    ],
    enableMagicNumberValidation: false, // Set to true for enhanced security
    enableMimeTypeValidation: false, // Disabled by default - Rocket.Chat handles this
  },

  // General Security Settings
  enableErrorSanitization: true,
  enableInputValidation: true,
  logLevel: "info",
  enableSecurityMonitoring: true,
};

/**
 * Production security configuration
 * More restrictive settings for production environments
 */
export const productionSecurityConfig: SecurityConfig = {
  ...defaultSecurityConfig,
  websocketSecurity: {
    ...defaultSecurityConfig.websocketSecurity,
    enableOriginValidation: true, // Enable origin validation in production
    allowedOrigins: [
      // Configure your production origins here
      // 'https://yourapp.com',
      // 'https://*.yourapp.com',
    ],
  },
  fileUpload: {
    ...defaultSecurityConfig.fileUpload,
    enableMagicNumberValidation: true, // Enable magic number validation in production
    enableMimeTypeValidation: false, // Still disabled - Rocket.Chat handles this
  },
  logLevel: "warn", // Less verbose logging in production
};

/**
 * Development security configuration
 * More permissive settings for development environments
 */
export const developmentSecurityConfig: SecurityConfig = {
  ...defaultSecurityConfig,
  apiRateLimit: {
    maxRequests: 2000, // Higher limits for development
    windowMs: 60000,
  },
  websocketRateLimit: {
    maxRequests: 600, // Higher limits for development
    windowMs: 10000,
  },
  logLevel: "debug", // Verbose logging for development
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const nodeEnv = process.env.NODE_ENV || "development";

  switch (nodeEnv.toLowerCase()) {
    case "production":
    case "prod":
      return productionSecurityConfig;
    case "development":
    case "dev":
      return developmentSecurityConfig;
    default:
      return defaultSecurityConfig;
  }
}

/**
 * Override security configuration with environment variables
 * This allows runtime configuration without code changes
 */
export function getEnvironmentSecurityConfig(): SecurityConfig {
  const config = getSecurityConfig();

  // Override API rate limiting
  if (process.env.SECURITY_API_RATE_LIMIT) {
    const limit = parseInt(process.env.SECURITY_API_RATE_LIMIT, 10);
    if (!isNaN(limit) && limit > 0) {
      config.apiRateLimit.maxRequests = limit;
    }
  }

  if (process.env.SECURITY_API_RATE_WINDOW_MS) {
    const windowMs = parseInt(process.env.SECURITY_API_RATE_WINDOW_MS, 10);
    if (!isNaN(windowMs) && windowMs > 0) {
      config.apiRateLimit.windowMs = windowMs;
    }
  }

  // Override WebSocket rate limiting
  if (process.env.SECURITY_WS_RATE_LIMIT) {
    const limit = parseInt(process.env.SECURITY_WS_RATE_LIMIT, 10);
    if (!isNaN(limit) && limit > 0) {
      config.websocketRateLimit.maxRequests = limit;
    }
  }

  if (process.env.SECURITY_WS_RATE_WINDOW_MS) {
    const windowMs = parseInt(process.env.SECURITY_WS_RATE_WINDOW_MS, 10);
    if (!isNaN(windowMs) && windowMs > 0) {
      config.websocketRateLimit.windowMs = windowMs;
    }
  }

  // Override file upload settings
  if (process.env.SECURITY_MAX_FILE_SIZE) {
    const maxSize = parseInt(process.env.SECURITY_MAX_FILE_SIZE, 10);
    if (!isNaN(maxSize) && maxSize > 0) {
      config.fileUpload.maxFileSize = maxSize;
    }
  }

  if (process.env.SECURITY_ENABLE_MIME_TYPE_VALIDATION) {
    const enableValidation =
      process.env.SECURITY_ENABLE_MIME_TYPE_VALIDATION.toLowerCase();
    config.fileUpload.enableMimeTypeValidation = enableValidation === "true";
  }

  if (process.env.SECURITY_ENABLE_MAGIC_NUMBER_VALIDATION) {
    const enableValidation =
      process.env.SECURITY_ENABLE_MAGIC_NUMBER_VALIDATION.toLowerCase();
    config.fileUpload.enableMagicNumberValidation = enableValidation === "true";
  }

  // Override WebSocket origins
  if (process.env.SECURITY_ALLOWED_ORIGINS) {
    config.websocketSecurity.allowedOrigins =
      process.env.SECURITY_ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
  }

  // Override log level
  if (process.env.SECURITY_LOG_LEVEL) {
    const logLevel = process.env.SECURITY_LOG_LEVEL.toLowerCase();
    if (["error", "warn", "info", "debug"].includes(logLevel)) {
      config.logLevel = logLevel as "error" | "warn" | "info" | "debug";
    }
  }

  return config;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate rate limiting
  if (config.apiRateLimit.maxRequests <= 0) {
    errors.push("API rate limit maxRequests must be greater than 0");
  }

  if (config.apiRateLimit.windowMs <= 0) {
    errors.push("API rate limit windowMs must be greater than 0");
  }

  if (config.websocketRateLimit.maxRequests <= 0) {
    errors.push("WebSocket rate limit maxRequests must be greater than 0");
  }

  if (config.websocketRateLimit.windowMs <= 0) {
    errors.push("WebSocket rate limit windowMs must be greater than 0");
  }

  // Validate file upload
  if (config.fileUpload.maxFileSize <= 0) {
    errors.push("File upload maxFileSize must be greater than 0");
  }

  if (config.fileUpload.allowedExtensions.length === 0) {
    errors.push("File upload allowedExtensions cannot be empty");
  }

  // Validate WebSocket security
  if (config.websocketSecurity.maxMessageSize <= 0) {
    errors.push("WebSocket maxMessageSize must be greater than 0");
  }

  if (config.websocketSecurity.maxConnectionAttempts <= 0) {
    errors.push("WebSocket maxConnectionAttempts must be greater than 0");
  }

  if (config.websocketSecurity.blockDurationMs <= 0) {
    errors.push("WebSocket blockDurationMs must be greater than 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
