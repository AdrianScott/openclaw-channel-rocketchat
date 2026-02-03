/**
 * Security utilities for credential validation and handling
 */

import * as crypto from "node:crypto";

/**
 * Validates Rocket.Chat authentication token format
 */
export function validateAuthToken(token: string): {
  valid: boolean;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token must be a non-empty string" };
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return { valid: false, error: "Token cannot be empty" };
  }

  // Rocket.Chat personal access tokens are typically 24-64 characters
  // JWT tokens are typically 3 parts separated by dots
  const tokenPatterns = [
    /^[A-Za-z0-9]{24,64}$/, // Personal access token pattern
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // JWT pattern
  ];

  const isValidPattern = tokenPatterns.some((pattern) => pattern.test(trimmed));
  if (!isValidPattern) {
    return { valid: false, error: "Token format is invalid" };
  }

  return { valid: true };
}

/**
 * Validates Rocket.Chat user ID format
 */
export function validateUserId(userId: string): {
  valid: boolean;
  error?: string;
} {
  if (!userId || typeof userId !== "string") {
    return { valid: false, error: "User ID must be a non-empty string" };
  }

  const trimmed = userId.trim();
  if (!trimmed) {
    return { valid: false, error: "User ID cannot be empty" };
  }

  // Rocket.Chat user IDs are typically MongoDB ObjectIds (24 hex chars)
  // or sometimes custom strings
  if (!/^[A-Za-z0-9]{1,64}$/.test(trimmed)) {
    return { valid: false, error: "User ID format is invalid" };
  }

  return { valid: true };
}

/**
 * Validates Rocket.Chat base URL format
 */
export function validateBaseUrl(url: string): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Base URL must be a non-empty string" };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: "Base URL cannot be empty" };
  }

  try {
    const normalized = trimmed.startsWith("http")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(normalized);

    // Ensure HTTPS is strongly recommended
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "HTTPS is strongly recommended" };
    }

    // Validate hostname
    if (!parsed.hostname) {
      return { valid: false, error: "Invalid hostname" };
    }

    // Warn about localhost usage
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      // Allow localhost but this should be monitored in production
    }

    const normalizedUrl = `${parsed.protocol}//${parsed.host}`;
    return { valid: true, normalized: normalizedUrl };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Sanitizes environment variable values
 */
export function sanitizeEnvValue(
  value: string | undefined,
): string | undefined {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  // Remove potential command injection characters
  const sanitized = trimmed
    .replace(/[;&|`$(){}[\]]/g, "") // Remove shell metacharacters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  return sanitized || undefined;
}

/**
 * Creates a cryptographically secure random string
 */
export function createSecureRandomString(length: number = 32): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

/**
 * Creates a secure multipart boundary for file uploads
 */
export function createSecureBoundary(): string {
  const timestamp = Date.now().toString(16);
  const random = crypto.randomBytes(16).toString("hex");
  return `----OpenClawBoundary${timestamp}${random}`;
}

/**
 * Validates file upload parameters
 */
export function validateFileUpload(
  params: {
    fileName: string;
    mimeType?: string;
    fileSize?: number;
  },
  config?: {
    maxFileSize?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
    enableMimeTypeValidation?: boolean;
  },
): { valid: boolean; error?: string } {
  const { fileName, mimeType, fileSize } = params;
  const securityConfig = config || {
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".pdf",
      ".txt",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".zip",
      ".tar",
      ".gz",
      ".csv",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
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
    enableMimeTypeValidation: false, // Disabled by default - Rocket.Chat handles this
  };

  if (!fileName || typeof fileName !== "string") {
    return { valid: false, error: "File name is required" };
  }

  const trimmedFileName = fileName.trim();
  if (!trimmedFileName) {
    return { valid: false, error: "File name cannot be empty" };
  }

  // Prevent path traversal
  if (trimmedFileName.includes("..") || trimmedFileName.includes("/")) {
    return { valid: false, error: "Invalid file name" };
  }

  // Check file extension
  const extension = trimmedFileName
    .toLowerCase()
    .slice(trimmedFileName.lastIndexOf("."));
  if (!securityConfig.allowedExtensions.includes(extension)) {
    return { valid: false, error: "File type not allowed" };
  }

  // Validate MIME type if enabled and provided
  if (securityConfig.enableMimeTypeValidation && mimeType) {
    if (!securityConfig.allowedMimeTypes.includes(mimeType)) {
      return { valid: false, error: "MIME type not allowed" };
    }
  }

  // Validate file size if provided
  if (fileSize && fileSize > (securityConfig.maxFileSize || 10 * 1024 * 1024)) {
    return { valid: false, error: "File size exceeds maximum limit" };
  }

  return { valid: true };
}

/**
 * Sanitizes error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message;

  // Remove potentially sensitive information
  const sanitized = message
    .replace(/[A-Za-z0-9_-]{20,}/g, "[REDACTED]") // Redact long tokens/IDs
    .replace(/password/i, "[REDACTED]")
    .replace(/token/i, "[REDACTED]")
    .replace(/secret/i, "[REDACTED]")
    .replace(/key/i, "[REDACTED]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]") // Redact emails
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP]"); // Redact IPs

  return sanitized || "An error occurred";
}

/**
 * Validates room ID format
 */
export function validateRoomId(roomId: string): {
  valid: boolean;
  error?: string;
} {
  if (!roomId || typeof roomId !== "string") {
    return { valid: false, error: "Room ID must be a non-empty string" };
  }

  const trimmed = roomId.trim();
  if (!trimmed) {
    return { valid: false, error: "Room ID cannot be empty" };
  }

  // Rocket.Chat room IDs are typically MongoDB ObjectIds or custom strings
  if (!/^[A-Za-z0-9]{1,64}$/.test(trimmed)) {
    return { valid: false, error: "Room ID format is invalid" };
  }

  return { valid: true };
}

/**
 * Validates username format
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username must be a non-empty string" };
  }

  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: "Username cannot be empty" };
  }

  // Rocket.Chat usernames: alphanumeric, underscores, hyphens, 3-50 chars
  if (!/^[a-zA-Z0-9_-]{3,50}$/.test(trimmed)) {
    return { valid: false, error: "Username format is invalid" };
  }

  return { valid: true };
}
