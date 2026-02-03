/**
 * Rocket.Chat account resolution
 */

import type { OpenclawConfig } from "openclaw/plugin-sdk";
import {
  validateAuthToken,
  validateUserId,
  validateBaseUrl,
  sanitizeEnvValue,
} from "../security/credentials.js";

export type RocketChatReplyMode = "thread" | "channel" | "auto";

type RocketChatRoomConfig = {
  requireMention?: boolean;
  /** Optional per-room override. Use the room rid (e.g. GENERAL), not the channel name. */
  replyMode?: RocketChatReplyMode;
};

export type RocketChatAccountConfig = {
  enabled?: boolean;
  name?: string;
  baseUrl?: string;
  userId?: string;
  authToken?: string;
  authTokenFile?: string;
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled";
  allowFrom?: string[];
  groupPolicy?: "allowlist" | "open" | "disabled";
  groupAllowFrom?: string[];
  rooms?: Record<string, RocketChatRoomConfig>;

  /** Reply mode selection (thread | channel | auto). Default: thread (legacy behavior). */
  replyMode?: RocketChatReplyMode;

  /** Back-compat: if true, behave like replyMode=thread; if false, replyMode=channel. */
  replyInThread?: boolean;

  /** Typing indicator delay (ms) before emitting user-typing. Default 1000. */
  typingDelayMs?: number;
};

export type ResolvedRocketChatAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  baseUrl?: string;
  userId?: string;
  authToken?: string;
  authTokenSource: "config" | "env" | "file" | "none";
  config: RocketChatAccountConfig;
};

const DEFAULT_ACCOUNT_ID = "default";

function getRocketChatConfig(
  cfg: OpenclawConfig,
): Record<string, unknown> | undefined {
  return (cfg as Record<string, unknown>).channels?.rocketchat;
}

export function listRocketChatAccountIds(cfg: OpenclawConfig): string[] {
  const rc = getRocketChatConfig(cfg);
  if (!rc) return [];

  const accounts = rc.accounts as Record<string, unknown> | undefined;
  if (accounts && typeof accounts === "object") {
    return Object.keys(accounts);
  }

  // Check for top-level config (legacy/default account)
  if (rc.baseUrl || rc.userId || rc.authToken) {
    return [DEFAULT_ACCOUNT_ID];
  }

  return [];
}

export function resolveDefaultRocketChatAccountId(cfg: OpenclawConfig): string {
  const ids = listRocketChatAccountIds(cfg);
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}

export function resolveRocketChatAccount(opts: {
  cfg: OpenclawConfig;
  accountId?: string;
}): ResolvedRocketChatAccount {
  const { cfg, accountId: rawAccountId } = opts;
  const accountId =
    rawAccountId?.trim() || resolveDefaultRocketChatAccountId(cfg);
  const rc = getRocketChatConfig(cfg) ?? {};

  const accounts = rc.accounts as
    | Record<string, RocketChatAccountConfig>
    | undefined;
  const accountConfig = accounts?.[accountId];

  // Check for top-level config (default account)
  const isDefaultPath = accountId === DEFAULT_ACCOUNT_ID && !accountConfig;
  const config: RocketChatAccountConfig =
    accountConfig ?? (isDefaultPath ? rc : {});

  // Resolve auth token from config, env, or file with validation
  let authToken = sanitizeEnvValue(config.authToken as string);
  let authTokenSource: "config" | "env" | "file" | "none" = "none";

  if (authToken) {
    const tokenValidation = validateAuthToken(authToken);
    if (!tokenValidation.valid) {
      throw new Error(`Invalid auth token: ${tokenValidation.error}`);
    }
    authTokenSource = "config";
  } else if (accountId === DEFAULT_ACCOUNT_ID) {
    const envToken = sanitizeEnvValue(process.env?.ROCKETCHAT_AUTH_TOKEN);
    if (envToken) {
      const tokenValidation = validateAuthToken(envToken);
      if (!tokenValidation.valid) {
        throw new Error(`Invalid env auth token: ${tokenValidation.error}`);
      }
      authToken = envToken;
      authTokenSource = "env";
    }
  }

  // Resolve user ID from config or env with validation
  let userId = sanitizeEnvValue(config.userId as string);
  if (!userId && accountId === DEFAULT_ACCOUNT_ID) {
    const envUserId = sanitizeEnvValue(process.env?.ROCKETCHAT_USER_ID);
    if (envUserId) {
      const userValidation = validateUserId(envUserId);
      if (!userValidation.valid) {
        throw new Error(`Invalid env user ID: ${userValidation.error}`);
      }
      userId = envUserId;
    }
  }

  // Resolve base URL from config or env with validation
  let baseUrl = sanitizeEnvValue(config.baseUrl as string);
  if (!baseUrl && accountId === DEFAULT_ACCOUNT_ID) {
    const envUrl = sanitizeEnvValue(process.env?.ROCKETCHAT_URL);
    if (envUrl) {
      const urlValidation = validateBaseUrl(envUrl);
      if (!urlValidation.valid) {
        throw new Error(`Invalid env base URL: ${urlValidation.error}`);
      }
      baseUrl = urlValidation.normalized;
    }
  }

  // Validate final credentials
  if (authToken) {
    const tokenValidation = validateAuthToken(authToken);
    if (!tokenValidation.valid) {
      throw new Error(`Invalid auth token: ${tokenValidation.error}`);
    }
  }

  if (userId) {
    const userValidation = validateUserId(userId);
    if (!userValidation.valid) {
      throw new Error(`Invalid user ID: ${userValidation.error}`);
    }
  }

  if (baseUrl) {
    const urlValidation = validateBaseUrl(baseUrl);
    if (!urlValidation.valid) {
      throw new Error(`Invalid base URL: ${urlValidation.error}`);
    }
    baseUrl = urlValidation.normalized;
  }

  return {
    accountId,
    name: config.name,
    enabled: config.enabled !== false,
    baseUrl,
    userId,
    authToken,
    authTokenSource,
    config,
  };
}
