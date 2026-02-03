# OpenClaw Rocket.Chat Channel Plugin

[![npm](https://img.shields.io/npm/v/@cloudrise/openclaw-channel-rocketchat)](https://www.npmjs.com/package/@cloudrise/openclaw-channel-rocketchat)
[![license](https://img.shields.io/npm/l/@cloudrise/openclaw-channel-rocketchat)](LICENSE)

Neutral, self-host friendly Rocket.Chat channel plugin for **OpenClaw** (Cloudrise-maintained).

- **Inbound:** Rocket.Chat Realtime (DDP/WebSocket) subscribe to `stream-room-messages`
- **Outbound:** Rocket.Chat REST `chat.postMessage`
- **Security:** Comprehensive security features including rate limiting, input validation, and error sanitization

## 🚨 Rate Limiting & Monitoring

This plugin includes generous rate limiting with detailed logging to help you monitor usage:

### Default Rate Limits

- **API Requests**: 1,000 requests per minute per user
- **WebSocket Messages**: 300 messages per 10 seconds per connection

### Rate Limit Logging

When rate limits are approached or exceeded, you'll see clear log messages:

```bash
# When approaching limits (90% usage)
[RATE_LIMIT] High usage detected: 900/1000 requests (90.0%)

# When limits are exceeded
[RATE_LIMIT] user-123: BLOCKED - 1000/1000 requests used. Retry after 45s

# WebSocket rate limiting
[WS_RATE_LIMIT] conn-abc123: BLOCKED - 300/300 messages used. Retry after 8s

# Detailed status monitoring
[RATE_LIMIT] user-123: 850/1000 requests used (150 remaining)
[WS_RATE_LIMIT] conn-abc123: 250/300 messages used (50 remaining)
```

### Monitoring Rate Limits

To check current rate limit status programmatically:

```typescript
import {
  apiRateLimiter,
  websocketRateLimiter,
} from "./security/rate-limiting.js";

// Check API rate limit status
const apiStatus = apiRateLimiter.getStatus("user-123");
console.log(`API: ${apiStatus.current}/${apiStatus.max} requests used`);

// Check WebSocket rate limit status
const wsStatus = websocketRateLimiter.getStatus("conn-abc123");
console.log(`WebSocket: ${wsStatus.current}/${wsStatus.max} messages used`);
```

### Adjusting Rate Limits

You can easily adjust rate limits through environment variables or configuration:

#### Method 1: Environment Variables (Recommended)

```bash
# Set environment variables in your .env file
SECURITY_API_RATE_LIMIT=2000        # API requests per minute
SECURITY_API_RATE_WINDOW_MS=60000    # API window in milliseconds
SECURITY_WS_RATE_LIMIT=500           # WebSocket messages per 10 seconds
SECURITY_WS_RATE_WINDOW_MS=10000     # WebSocket window in milliseconds
```

#### Method 2: Programmatic Configuration

```typescript
// For high-traffic applications
import {
  apiRateLimiter,
  websocketRateLimiter,
} from "./security/rate-limiting.js";

apiRateLimiter.updateConfig({
  maxRequests: 2000, // Increase to 2000 requests/minute
  windowMs: 60000, // Keep 1-minute window
});

websocketRateLimiter.updateConfig({
  maxRequests: 500, // Increase to 500 messages/10 seconds
  windowMs: 10000, // Keep 10-second window
});
```

#### Method 3: Configuration File

Create a custom security configuration by modifying `src/security/config.ts`:

```typescript
export const customSecurityConfig: SecurityConfig = {
  apiRateLimit: {
    maxRequests: 2000, // Custom API limit
    windowMs: 60000, // 1 minute window
  },
  websocketRateLimit: {
    maxRequests: 500, // Custom WebSocket limit
    windowMs: 10000, // 10 second window
  },
  // ... other security settings
};
```

### Environment-Based Configuration

The plugin automatically adjusts settings based on `NODE_ENV`:

- **Development**: More generous limits and verbose logging
- **Production**: Stricter security with origin validation enabled
- **Default**: Balanced settings for general use

```bash
# Set environment
NODE_ENV=production

# Production will automatically:
# - Enable WebSocket origin validation
# - Use stricter file upload validation
# - Reduce log verbosity
# - Maintain rate limits (can be overridden by env vars)
```

### File Upload Validation

By default, MIME type validation is **disabled** since Rocket.Chat already handles media type validation on the server side. This prevents duplicate validation and potential conflicts.

#### Enabling MIME Type Validation (Optional)

If you want to enable client-side MIME type validation:

```bash
# Enable MIME type validation (disabled by default)
SECURITY_ENABLE_MIME_TYPE_VALIDATION=true

# Enable magic number validation (disabled by default)
SECURITY_ENABLE_MAGIC_NUMBER_VALIDATION=true
```

**Note**: Enabling these may cause files that are valid on Rocket.Chat to be rejected by the client if they don't match our MIME type lists.

### Log Levels

- **ERROR**: Rate limit exceeded (blocked requests)
- **WARN**: High usage detected (90%+ usage)
- **INFO**: New rate limiter created
- **DEBUG**: Detailed status updates

## 🔒 Security Features

This plugin includes comprehensive security protections:

- ✅ **Input Validation**: All inputs are validated and sanitized
- ✅ **File Upload Security**: Size limits, type validation, and secure boundaries
- ✅ **Rate Limiting**: Protection against DoS attacks
- ✅ **Error Sanitization**: No sensitive information leaked in errors
- ✅ **WebSocket Security**: Origin validation and message filtering
- ✅ **HTTPS Enforcement**: Strong HTTPS recommendations

See [Security Documentation](docs/security.md) for detailed security information.

## Upgrade / rename notice

If you were using the old Clawdbot-era package:

- Old: `@cloudrise/clawdbot-channel-rocketchat`
- New: `@cloudrise/openclaw-channel-rocketchat`

## Authors

- Chad (AI assistant running in OpenClaw) — primary implementer
- Marshal Morse — project owner, requirements, infrastructure, and testing

## Quickstart (5–10 minutes)

### Prerequisites

- **OpenClaw** installed and running
- **Rocket.Chat** server (v6.0+ recommended)
- **Node.js** 18+ (for development/local testing)
- **Bot user account** in Rocket.Chat

### Installation

#### Method 1: NPM Package (Recommended for Production)

```bash
# Install the plugin
npm install @cloudrise/openclaw-channel-rocketchat

# Or using yarn
yarn add @cloudrise/openclaw-channel-rocketchat
```

#### Method 2: Development Installation

```bash
# Clone the repository
git clone https://github.com/cloudrise-network/openclaw-channel-rocketchat.git
cd openclaw-channel-rocketchat

# Install dependencies
npm install

# Build the plugin (if needed)
npm run build
```

### Configuration

1. **Create a Rocket.Chat bot user** (or a dedicated user account) and obtain:
   - `userId`
   - `authToken` (treat like a password)

2. **Add the bot user to the rooms** you want it to monitor (channels/private groups). For DMs, ensure users can message the bot.

3. **Configure OpenClaw** with your Rocket.Chat credentials:

#### Option A: Environment Variables (Recommended)

Create a `.env` file in your OpenClaw directory:

```bash
# Rocket.Chat Configuration
ROCKETCHAT_BASE_URL=https://your-rocketchat-instance.com
ROCKETCHAT_AUTH_TOKEN=your_personal_access_token_here
ROCKETCHAT_USER_ID=your_user_id_here

# Security Configuration (Optional)
NODE_ENV=production
SECURITY_API_RATE_LIMIT=1000
SECURITY_WS_RATE_LIMIT=300
SECURITY_LOG_LEVEL=info
```

#### Option B: OpenClaw Configuration File

Add to your OpenClaw `config.yaml`:

```yaml
plugins:
  installs:
    rocketchat:
      source: npm
      spec: "@cloudrise/openclaw-channel-rocketchat"
  entries:
    rocketchat:
      enabled: true

channels:
  rocketchat:
    baseUrl: "https://your-rocketchat-instance.com"
    userId: "<ROCKETCHAT_USER_ID>"
    authToken: "<ROCKETCHAT_AUTH_TOKEN>"

    # Optional security settings
    security:
      apiRateLimit: 1000
      websocketRateLimit: 300
      logLevel: "info"
```

### Server Deployment

#### Production Deployment Steps

1. **Install the plugin** on your server:

```bash
cd /path/to/openclaw
npm install @cloudrise/openclaw-channel-rocketchat
```

2. **Configure environment variables**:

```bash
# Create production .env file
cp .env.example .env.local

# Edit with your production values
nano .env.local
```

3. **Set production environment**:

```bash
export NODE_ENV=production
```

4. **Restart OpenClaw**:

```bash
# If using systemd
sudo systemctl restart openclaw

# Or if using PM2
pm2 restart openclaw

# Or if running directly
npm restart
```

#### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm install @cloudrise/openclaw-channel-rocketchat

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  openclaw:
    build: .
    environment:
      - NODE_ENV=production
      - ROCKETCHAT_BASE_URL=https://your-rocketchat.com
      - ROCKETCHAT_AUTH_TOKEN=${ROCKETCHAT_AUTH_TOKEN}
      - ROCKETCHAT_USER_ID=${ROCKETCHAT_USER_ID}
      - SECURITY_API_RATE_LIMIT=1000
      - SECURITY_LOG_LEVEL=warn
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

### Verification

1. **Check plugin installation**:

```bash
# In OpenClaw logs, look for:
# [INFO] Rocket.Chat plugin loaded successfully
```

2. **Test connectivity**:

```bash
# Test API connection
curl -H "X-Auth-Token: $ROCKETCHAT_AUTH_TOKEN" \
     -H "X-User-Id: $ROCKETCHAT_USER_ID" \
     "$ROCKETCHAT_URL/api/v1/me"
```

3. **Monitor rate limiting**:

```bash
# Watch for rate limit logs
tail -f logs/app.log | grep "RATE_LIMIT"
```

### Security Configuration for Production

For production deployment, configure these security settings:

```bash
# Production security settings
NODE_ENV=production
SECURITY_API_RATE_LIMIT=1000
SECURITY_WS_RATE_LIMIT=300
SECURITY_ALLOWED_ORIGINS=https://yourapp.com,https://*.yourapp.com
SECURITY_LOG_LEVEL=warn
SECURITY_MAX_FILE_SIZE=10485760
SECURITY_ENABLE_MIME_TYPE_VALIDATION=false
SECURITY_ENABLE_MAGIC_NUMBER_VALIDATION=false
```

### Troubleshooting Installation

#### Common Issues

1. **Authentication Errors**:

```bash
# Verify token format
echo $ROCKETCHAT_AUTH_TOKEN | wc -c  # Should be 24-64 chars

# Test connection
curl -H "X-Auth-Token: $ROCKETCHAT_AUTH_TOKEN" \
     -H "X-User-Id: $ROCKETCHAT_USER_ID" \
     "$ROCKETCHAT_URL/api/v1/me"
```

2. **Rate Limit Issues**:

```bash
# Check rate limit logs
grep "RATE_LIMIT.*BLOCKED" logs/app.log

# Increase limits if needed
SECURITY_API_RATE_LIMIT=2000
```

3. **WebSocket Connection Issues**:

```bash
# Check WebSocket logs
grep "WebSocket.*closed\|disconnected" logs/app.log

# Verify origin configuration
echo $SECURITY_ALLOWED_ORIGINS
```

#### Getting Help

- **Check logs**: `tail -f logs/app.log`
- **Verify configuration**: Ensure all environment variables are set
- **Test connectivity**: Use curl to test API access
- **Security docs**: See [docs/security.md](docs/security.md)

### Upgrading from Previous Versions

If upgrading from an older version:

1. **Backup configuration**:

```bash
cp .env .env.backup
cp config.yaml config.yaml.backup
```

2. **Install new version**:

```bash
npm update @cloudrise/openclaw-channel-rocketchat
```

3. **Review new security settings**:

```bash
# Add new environment variables to .env
SECURITY_API_RATE_LIMIT=1000
SECURITY_WS_RATE_LIMIT=300
```

4. **Check for security vulnerabilities**:

```bash
# CRITICAL: Always run security audit after updates
npm audit

# Fix any found vulnerabilities
npm audit fix

# Verify fixes
npm audit
```

5. **Restart OpenClaw**:

```bash
systemctl restart openclaw
```

6. **Verify functionality**:

```bash
# Check that everything works
curl -H "X-Auth-Token: $ROCKETCHAT_AUTH_TOKEN" \
     -H "X-User-Id: $ROCKETCHAT_USER_ID" \
     "$ROCKETCHAT_URL/api/v1/me"
```

## 🚨 Security Vulnerability Information

### Current Security Status

This plugin depends on the OpenClaw ecosystem. **Always run security audits** after installation or updates:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force update if needed (use with caution)
npm audit fix --force
```

### Known Vulnerabilities

Recent security audits have identified vulnerabilities in transitive dependencies:

- **tar package**: Arbitrary file overwrite vulnerabilities (HIGH severity)
- **fast-xml-parser**: DoS vulnerabilities (HIGH severity)
- **hono**: XSS and data exposure vulnerabilities (MODERATE severity)

### Security Best Practices

1. **Before Deployment**:
   - Always run `npm audit` before deploying
   - Fix all HIGH and CRITICAL vulnerabilities
   - Review MODERATE vulnerabilities

2. **Regular Maintenance**:
   - Run `npm audit` weekly
   - Keep npm CLI updated: `npm install -g npm@latest`
   - Monitor security advisories

3. **Production Safety**:
   - **DO NOT DEPLOY** with unpatched HIGH/CRITICAL vulnerabilities
   - Implement automated security scanning in CI/CD
   - Use dependency monitoring tools

For detailed vulnerability information, see [SECURITY_VULNERABILITY_ALERT.md](SECURITY_VULNERABILITY_ALERT.md).

## Configuration

> Use the room **rid** (e.g. `GENERAL`) for per-room settings.

### Minimal (single account)

```yaml
plugins:
  installs:
    rocketchat:
      source: npm
      spec: "@cloudrise/openclaw-channel-rocketchat"
  entries:
    rocketchat:
      enabled: true

channels:
  rocketchat:
    baseUrl: "https://chat.example.com"
    userId: "<ROCKETCHAT_USER_ID>"
    authToken: "<ROCKETCHAT_AUTH_TOKEN>"

    # Optional: keep noise down
    replyMode: auto
    rooms:
      GENERAL:
        requireMention: true
```

4. **Restart the gateway**.

5. **Test** by @mentioning the bot in a room it’s a member of.

### Example chat commands (reply to a room + model switching)

In Rocket.Chat you can send a normal message, or you can switch the session’s model first.

**Switch model, then ask a question**:

Rocket.Chat treats messages starting with `/` as Rocket.Chat slash-commands.
So for model switching, either:

- put the directive _after_ an @mention (works on most servers/clients), or
- use the plugin’s alternate `--model` / `--<alias>` syntax.

```text
# Option A: use /model after an @mention
@Chad /model qwen3
@Chad write a 5-line summary of our incident in plain English

# Option B: alternate syntax (avoids Rocket.Chat /commands)
@Chad --model qwen3
@Chad write a 5-line summary of our incident in plain English

# Option C: shorthand alias form
@Chad --qwen3
@Chad write a 5-line summary of our incident in plain English
```

**Example output** (with `messages.responsePrefix: "({model}) "` enabled):

```text
(mlx-qwen/mlx-community/Qwen3-14B-4bit) Here’s a 5-line summary...
...
```

**Send a one-off message to a specific Rocket.Chat room** (from the gateway host):

```bash
openclaw message send --channel rocketchat --to room:GENERAL --message "Hello from OpenClaw"
```

**Send using a specific model for that one message**:

```bash
openclaw message send --channel rocketchat --to room:GENERAL --message "/model qwen3 Hello from Qwen3"
```

---

## Install

### Install from npm

```bash
npm install @cloudrise/openclaw-channel-rocketchat
```

### Configure OpenClaw to load the plugin

You need to tell OpenClaw to load the installed plugin.

**Option A (recommended): install via `plugins.installs` (npm source)**

```yaml
plugins:
  installs:
    rocketchat:
      source: npm
      spec: "@cloudrise/openclaw-channel-rocketchat"
  entries:
    rocketchat:
      enabled: true
```

**Option B: load from a local path**

```yaml
plugins:
  load:
    paths:
      - /absolute/path/to/node_modules/@cloudrise/openclaw-channel-rocketchat
  entries:
    rocketchat:
      enabled: true
```

Then restart the gateway.

## Features

- **Inbound attachments**: receives images, PDFs/documents, and audio; forwards them to OpenClaw for vision/document understanding and transcription.
- **Outbound attachments**: can send local file paths as real Rocket.Chat uploads (inline previews when supported).
- **Reactions**: can react to messages with emoji (via `chat.react`).

- **File attachments**: receives images, PDFs, documents, audio uploaded to Rocket.Chat and passes them to the vision model.
- **Model prefix**: honors `messages.responsePrefix` (e.g. `({model}) `) so replies can include the model name.

## Model switching

There are two parts:

1. **Switching models in chat** (temporary, per-session) via `/model ...`
2. **Defining short aliases** like `qwen3` so you don’t have to type the full `provider/model`

### Switching models in chat (`/model`)

In any chat where OpenClaw slash-commands are enabled, you can switch the current session’s model:

```text
/model
/model list
/model status
/model openai/gpt-5.2
/model qwen3
```

Tip: on Rocket.Chat you’ll often be writing something like:

```text
@Chad /model qwen3
@Chad what do you think about ...
```

### Model aliases (shortcuts like `qwen3`)

OpenClaw supports **model aliases** so you can type a short name (like `qwen3`) instead of a full `provider/model` ref.

**Option A: define aliases in config**

Aliases come from `agents.defaults.models.<modelId>.alias`.

```yaml
agents:
  defaults:
    models:
      "mlx-qwen/mlx-community/qwen3-14b-4bit":
        alias: qwen3
```

**Option B: use the CLI**

```bash
openclaw models aliases add qwen3 mlx-qwen/mlx-community/Qwen3-14B-4bit
openclaw models aliases list
```

Notes:

- Model refs are normalized to lowercase.
- If you define the same alias in config and via CLI, your config value wins.

## Configuration

> Use the room **rid** (e.g. `GENERAL`) for per-room settings.

### Minimal (single account)

```yaml
channels:
  rocketchat:
    baseUrl: "https://chat.example.com"
    userId: "<ROCKETCHAT_USER_ID>"
    authToken: "<ROCKETCHAT_AUTH_TOKEN>"
```

### Multiple accounts / multiple Rocket.Chat servers

You can configure multiple Rocket.Chat “accounts” under `channels.rocketchat.accounts` and choose which one to use via `accountId` when sending.

```yaml
channels:
  rocketchat:
    accounts:
      prod:
        name: "Prod RC"
        baseUrl: "https://chat.example.com"
        userId: "<PROD_USER_ID>"
        authToken: "<PROD_AUTH_TOKEN>"

      staging:
        name: "Staging RC"
        baseUrl: "https://chat-staging.example.com"
        userId: "<STAGING_USER_ID>"
        authToken: "<STAGING_AUTH_TOKEN>"
```

Notes:

- The legacy single-account format (top-level `baseUrl/userId/authToken`) still works and is treated as `accountId: default`.
- Per-room settings live under each account (e.g. `channels.rocketchat.accounts.prod.rooms`).

### Reply routing (thread vs channel)

```yaml
channels:
  rocketchat:
    # thread | channel | auto
    replyMode: auto

    rooms:
      GENERAL:
        requireMention: false
        # Optional per-room override
        # replyMode: channel
```

**Auto rules** (deterministic):

- If the inbound message is already in a thread (`tmid` exists) → reply in that thread
- Else if the inbound message is “long” (≥280 chars or contains a newline) → reply in a thread
- Else → reply in channel

### Per-message overrides

Prefix your message:

- `!thread ...` → force the reply to be posted as a thread reply
- `!channel ...` → force the reply to be posted in the channel

(The prefix is stripped before the message is sent to the agent.)

### Typing indicator

```yaml
channels:
  rocketchat:
    # Delay (ms) before emitting typing indicator
    typingDelayMs: 500
```

(When using multiple accounts, this can also be set per account at `channels.rocketchat.accounts.<accountId>.typingDelayMs`.)

Typing indicators are emitted via DDP `stream-notify-room` using `<RID>/user-activity`.

- Channel replies emit typing without `tmid` → shows under channel composer
- Thread replies include `{ tmid: ... }` → shows under thread composer

## 🔧 Troubleshooting

### Rate Limit Issues

If you're seeing rate limit errors in your logs:

```bash
# Check for rate limit errors
grep "RATE_LIMIT.*BLOCKED" logs/app.log

# Monitor high usage warnings
grep "RATE_LIMIT.*High usage" logs/app.log

# Check WebSocket rate limiting
grep "WS_RATE_LIMIT.*BLOCKED" logs/app.log
```

**Common Solutions:**

1. **Increase Rate Limits** (if legitimate traffic):

   ```yaml
   # In your OpenClaw config
   channels:
     rocketchat:
       # Custom rate limits (if supported)
       rateLimits:
         api: 2000 # requests per minute
         websocket: 500 # messages per 10 seconds
   ```

2. **Monitor Traffic Patterns**:

   ```bash
   # Check which users are hitting limits
   grep "RATE_LIMIT.*BLOCKED" logs/app.log | awk '{print $3}' | sort | uniq -c | sort -nr

   # Monitor WebSocket connection patterns
   grep "WS_RATE_LIMIT" logs/app.log | tail -20
   ```

3. **Adjust Application Behavior**:
   - Implement client-side caching to reduce API calls
   - Batch multiple operations into single requests
   - Use WebSocket subscriptions instead of polling

### Authentication Issues

```bash
# Check for authentication errors
grep "auth.*failed\|unauthorized\|forbidden" logs/app.log

# Verify token format
echo $ROCKETCHAT_AUTH_TOKEN | wc -c  # Should be 24-64 chars
```

### Connection Issues

```bash
# Check WebSocket connection issues
grep "WebSocket.*closed\|disconnected\|error" logs/app.log

# Check API connectivity
curl -H "X-Auth-Token: $ROCKETCHAT_AUTH_TOKEN" \
     -H "X-User-Id: $ROCKETCHAT_USER_ID" \
     "$ROCKETCHAT_URL/api/v1/me"
```

### File Upload Issues

```bash
# Check file upload errors
grep "upload.*error\|file.*size\|type.*allowed" logs/app.log

# Verify file size limits
# Default: 10MB max file size
```

## Development

```bash
git clone git@github.com:cloudrise-network/openclaw-channel-rocketchat.git
cd openclaw-channel-rocketchat
npm install
```

Local smoke tests (uses env vars; see `.env.example`):

```bash
# REST send
node test-chad.mjs

# Realtime receive
node test-realtime.mjs
```

## Packaging + publishing (no secrets)

Before publishing:

1. Run a quick secret scan (at minimum):

```bash
grep -RIn --exclude-dir=node_modules --exclude=package-lock.json -E "npm_[A-Za-z0-9]+|ghp_[A-Za-z0-9]+|xox[baprs]-|authToken\s*[:=]\s*\"" .
```

2. Bump version in `package.json`.

3. Verify the tarball:

```bash
npm pack
```

4. Publish:

```bash
npm publish
```

(There is also a GitHub Actions workflow in `.github/workflows/publish.yml`.)

## Security

Treat Rocket.Chat `authToken` like a password.

This repository is intended to be publishable (no secrets committed).

## License

MIT
