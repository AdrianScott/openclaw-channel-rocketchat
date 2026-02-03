# Security Documentation

## Overview

This document outlines the security features, configurations, and best practices for the Rocket.Chat channel plugin. The plugin implements multiple layers of security to protect against common vulnerabilities and attacks.

## 🔐 Security Features

### Authentication & Authorization

#### Token Validation
- **JWT Token Support**: Validates JWT format and structure
- **Personal Access Tokens**: Supports Rocket.Chat personal access tokens (24-64 characters)
- **Environment Variable Sanitization**: Removes shell metacharacters and normalizes values
- **Format Validation**: Regex-based validation for all credential formats

#### URL Security
- **HTTPS Enforcement**: Strongly recommends HTTPS for all connections
- **Hostname Validation**: Validates URL structure and hostname format
- **Localhost Protection**: Warns about localhost usage in production environments

### Input Validation & Sanitization

#### API Input Validation
- **Room ID Validation**: Validates Rocket.Chat room ID formats (17-64 alphanumeric characters)
- **Username Validation**: Enforces 3-50 character alphanumeric usernames with underscores/hyphens
- **User ID Validation**: Validates MongoDB ObjectId format (24 hex characters)
- **Length Limits**: Prevents excessively long inputs that could cause issues

#### File Upload Security
- **Size Limits**: Default 10MB maximum file size (configurable)
- **Type Whitelist**: Only allows specific file extensions (.jpg, .jpeg, .png, .gif, .pdf, .txt, .doc, .docx)
- **MIME Type Validation**: Validates actual file MIME type against allowed types
- **Path Traversal Prevention**: Sanitizes filenames to prevent directory traversal attacks
- **Secure Boundaries**: Uses cryptographically secure random multipart boundaries

### Rate Limiting & DoS Protection

#### API Rate Limiting
- **Default Limits**: 100 requests per minute per user
- **Per-User Tracking**: Limits are enforced per user ID and base URL combination
- **Graceful Handling**: Returns clear retry-after headers when limits are exceeded
- **Memory Management**: Automatic cleanup of old rate limit data

#### WebSocket Rate Limiting
- **Message Limits**: 30 messages per 10 seconds per connection
- **Connection Tracking**: Unique connection IDs for accurate rate limiting
- **Automatic Cleanup**: Removes rate limiters when connections close

#### Rate Limiting Configuration
```typescript
// API Rate Limiting (configurable)
const apiRateLimiter = new ApiRateLimiter({
  maxRequests: 100,        // Default: 100 requests per minute
  windowMs: 60000,         // Default: 1 minute window
});

// WebSocket Rate Limiting (configurable)
const websocketRateLimiter = new WebSocketRateLimiter({
  maxRequests: 30,         // Default: 30 messages per 10 seconds
  windowMs: 10000,         // Default: 10 second window
});
```

### Error Handling & Information Disclosure

#### Error Classification
- **Severity Levels**: LOW, MEDIUM, HIGH, CRITICAL
- **Categories**: VALIDATION, AUTHENTICATION, NETWORK, RATE_LIMIT, SYSTEM, UNKNOWN
- **Sanitization**: Removes sensitive data (tokens, passwords, emails, IPs)
- **User-Friendly Messages**: Provides generic error messages to users

#### Secure Logging
- **Sensitive Data Redaction**: Automatically redacts passwords, tokens, and personal data
- **Context Preservation**: Maintains error context without exposing sensitive information
- **Log Levels**: Appropriate logging levels based on error severity

### WebSocket Security

#### Origin Validation
- **Configurable Whitelist**: Supports exact domains, wildcards, and subdomains
- **Connection Tracking**: Monitors connection attempts and blocks suspicious IPs
- **IP Blocking**: Automatic IP blocking after excessive failed attempts
- **Message Sanitization**: Filters and sanitizes WebSocket message content

#### Message Security
- **Size Limits**: 1MB maximum message size (configurable)
- **Format Validation**: JSON format validation before parsing
- **Content Filtering**: Removes potentially malicious content (scripts, JavaScript)
- **Injection Prevention**: Sanitizes message content to prevent XSS attacks

## 🚨 Rate Limiting Logs

### When Rate Limits Are Hit

When rate limits are exceeded, the plugin logs clear messages that help you identify and adjust limits:

#### API Rate Limit Logs
```
[ERROR] Rate limit exceeded. Try again in 45 seconds.
[INFO] Rate limit status for user-123: 95/100 requests used, 15 seconds remaining
```

#### WebSocket Rate Limit Logs
```
[DEBUG] WebSocket rate limit exceeded. Skipping message. Retry in 8s
[INFO] WebSocket rate limit for conn-abc123: 28/30 messages used, 2 seconds remaining
```

#### Rate Limit Status Monitoring
You can check current rate limit status programmatically:

```typescript
// Check API rate limit status
const apiStatus = apiRateLimiter.getStatus('user-123');
console.log(`API: ${apiStatus.current}/${apiStatus.max} requests used`);

// Check WebSocket rate limit status  
const wsStatus = websocketRateLimiter.getStatus('conn-abc123');
console.log(`WebSocket: ${wsStatus.current}/${wsStatus.max} messages used`);
```

### Log Levels and Messages

| Level | Message | When It Appears |
|-------|----------|-----------------|
| ERROR | "Rate limit exceeded. Try again in X seconds." | When a request is blocked |
| INFO | "Rate limit status: X/Y requests used" | Periodic status updates |
| DEBUG | "WebSocket rate limit exceeded. Skipping message." | When WebSocket message is blocked |
| WARN | "Rate limit cleanup: removed X old limiters" | During automatic cleanup |

### Adjusting Rate Limits

If you're seeing rate limit errors frequently, you can adjust the defaults:

```typescript
// For high-traffic applications
const apiRateLimiter = new ApiRateLimiter({
  maxRequests: 500,        // Increase to 500 requests/minute
  windowMs: 60000,         // Keep 1-minute window
});

// For applications with many WebSocket messages
const websocketRateLimiter = new WebSocketRateLimiter({
  maxRequests: 100,        // Increase to 100 messages/10 seconds
  windowMs: 10000,         // Keep 10-second window
});
```

## 🔧 Configuration

### Environment Variables

```bash
# Required for authentication
ROCKETCHAT_AUTH_TOKEN=your_personal_access_token_here
ROCKETCHAT_USER_ID=your_user_id_here
ROCKETCHAT_URL=https://your-rocketchat-instance.com

# Optional security configurations
NODE_ENV=production  # Enables stricter security settings
```

### Rate Limiting Configuration

Rate limits can be configured per deployment:

```typescript
// Custom rate limiting configuration
import { apiRateLimiter, websocketRateLimiter } from './security/rate-limiting.js';

// Configure for your specific needs
apiRateLimiter.updateConfig({
  maxRequests: 200,        // Custom API limit
  windowMs: 60000,         // 1-minute window
});

websocketRateLimiter.updateConfig({
  maxRequests: 50,         // Custom WebSocket limit
  windowMs: 10000,         // 10-second window
});
```

### WebSocket Security Configuration

```typescript
import { webSocketSecurityManager } from './security/websocket-security.js';

// Configure allowed origins
webSocketSecurityManager.updateConfig({
  allowedOrigins: [
    'https://yourapp.com',
    'https://*.yourapp.com',  // Wildcard subdomains
    'https://partner.com'
  ],
  enableOriginValidation: true,  // Enable in production
  maxMessageSize: 2 * 1024 * 1024,  // 2MB limit
});
```

## 🛡️ Security Best Practices

### Production Deployment

1. **Enable HTTPS**: Always use HTTPS in production
2. **Configure Origin Validation**: Set up proper origin whitelisting
3. **Monitor Rate Limits**: Watch for rate limit violations in logs
4. **Regular Security Updates**: Keep dependencies updated
5. **Error Monitoring**: Monitor error logs for security issues

### Development Guidelines

1. **Input Validation**: Always validate user inputs
2. **Error Handling**: Use secure error handling utilities
3. **Logging**: Never log sensitive information
4. **Rate Limiting**: Consider rate limiting for new features
5. **Testing**: Include security testing in your test suite

### Monitoring & Alerting

Set up monitoring for:

- **Rate Limit Violations**: High frequency may indicate abuse
- **Authentication Failures**: Multiple failures may indicate attacks
- **Large Message Attempts**: May indicate DoS attempts
- **Origin Validation Failures**: May indicate CSRF attempts
- **Error Rate Spikes**: May indicate security issues

## 🔍 Security Testing

### Unit Testing

Test security functions with various inputs:

```typescript
import { validateAuthToken, validateUserId } from './security/credentials.js';

// Test valid inputs
console.log(validateAuthToken('valid_token_123'));
console.log(validateUserId('507f1f77bcf86cd799439011'));

// Test invalid inputs
console.log(validateAuthToken('invalid'));
console.log(validateUserId('too-short'));
```

### Integration Testing

Test complete security workflows:

1. **Authentication Flow**: Test with valid and invalid tokens
2. **File Upload**: Test with various file types and sizes
3. **Rate Limiting**: Test limit enforcement and recovery
4. **Error Handling**: Verify error sanitization
5. **WebSocket Security**: Test origin validation and message limits

### Security Scanning

Use automated tools to scan for vulnerabilities:

```bash
# Dependency vulnerability scanning
npm audit

# Static code analysis
npm install -g eslint
eslint src/security/

# Security testing
npm install -g owasp-zap
# Run ZAP security tests
```

## 📋 Security Checklist

### Pre-Deployment Checklist

- [ ] All environment variables are set and validated
- [ ] HTTPS is enforced for all connections
- [ ] Rate limits are appropriate for expected traffic
- [ ] File upload limits are configured
- [ ] Origin validation is configured for production
- [ ] Error logging is monitored
- [ ] Security tests are passing
- [ ] Dependencies are updated and secure

### Ongoing Security Maintenance

- [ ] Regular security audits (quarterly)
- [ ] Dependency vulnerability scanning (monthly)
- [ ] Rate limit monitoring and adjustment (as needed)
- [ ] Error log review (weekly)
- [ ] Security training for team members (annual)

## 🚨 Incident Response

### Security Incident Types

1. **Rate Limit Abuse**: Excessive requests from specific users
2. **Authentication Attacks**: Repeated failed login attempts
3. **File Upload Abuse**: Malicious file upload attempts
4. **WebSocket Attacks**: Suspicious WebSocket connections
5. **Data Exposure**: Potential information disclosure

### Response Procedures

1. **Immediate Response**: Block offending IPs/users
2. **Investigation**: Review logs and identify attack vectors
3. **Mitigation**: Update security configurations
4. **Monitoring**: Increased monitoring for related activity
5. **Documentation**: Document incident and response

## 📞 Security Contact

For security-related issues:

- **Security Team**: security@cloudrise.network
- **Bug Reports**: Use private reporting channels
- **Emergencies**: Contact security team immediately

---

*Last Updated: February 3, 2026*  
*Next Review: March 3, 2026*
