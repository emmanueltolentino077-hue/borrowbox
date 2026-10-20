import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// In-memory fallback cache when database table is not yet created or unreachable
interface MemoryRateLimitRecord {
  count: number;
  windowStart: number;
}
const memoryRateLimits = new Map<string, MemoryRateLimitRecord>();

function checkMemoryRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = memoryRateLimits.get(key);

  if (!record || now - record.windowStart >= windowMs) {
    memoryRateLimits.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count += 1;
  return true;
}

export function clearAllRateLimits(): void {
  memoryRateLimits.clear();
}

/**
 * Atomic rate limit check.
 * Tries PostgreSQL stored procedure `check_rate_limit`, then table `rate_limits`,
 * and falls back gracefully to in-memory rate limiting.
 *
 * @param key unique identifier (e.g. `login:user:IT-2026-001` or `login:ip:127.0.0.1`)
 * @param maxAttempts maximum allowed attempts in window
 * @param windowSeconds duration of rate-limit window in seconds
 * @returns {Promise<boolean>} true if allowed, false if rate limited
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    // 1. Try atomic stored procedure check_rate_limit if available
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: key,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    });

    if (!error && typeof data === "boolean") {
      return data;
    }

    // 2. Direct table operation on rate_limits table
    const now = new Date();
    const windowMs = windowSeconds * 1000;

    const { data: record, error: selectErr } = await supabaseAdmin
      .from("rate_limits")
      .select("key, count, window_start")
      .eq("key", key)
      .maybeSingle();

    if (selectErr) {
      // Table doesn't exist in Supabase yet; fallback to in-memory store
      return checkMemoryRateLimit(key, maxAttempts, windowSeconds);
    }

    if (!record) {
      await supabaseAdmin
        .from("rate_limits")
        .insert({ key, count: 1, window_start: now.toISOString() });
      return true;
    }

    const windowStart = new Date(record.window_start).getTime();
    const isExpired = now.getTime() - windowStart >= windowMs;

    if (isExpired) {
      await supabaseAdmin
        .from("rate_limits")
        .update({ count: 1, window_start: now.toISOString() })
        .eq("key", key);
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    await supabaseAdmin
      .from("rate_limits")
      .update({ count: record.count + 1 })
      .eq("key", key);

    return true;
  } catch {
    return checkMemoryRateLimit(key, maxAttempts, windowSeconds);
  }
}
