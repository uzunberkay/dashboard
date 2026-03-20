import { NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"
import { getClientIp } from "@/lib/request"

type BucketName =
  | "login"
  | "register"
  | "transactions"
  | "categories"
  | "goals"
  | "recurring-rules"
  | "scheduled-payments"

type Entry = {
  count: number
  resetAt: number
}

const globalForRateLimit = globalThis as typeof globalThis & {
  rateLimitStore?: Map<string, Entry>
}

const store = globalForRateLimit.rateLimitStore ?? new Map<string, Entry>()

if (!globalForRateLimit.rateLimitStore) {
  globalForRateLimit.rateLimitStore = store
}

function getBucketConfig(bucket: BucketName) {
  const env = getServerEnv()

  if (bucket === "login") {
    return {
      limit: env.RATE_LIMIT_LOGIN_MAX,
      windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
    }
  }

  if (bucket === "register") {
    return {
      limit: Math.min(env.RATE_LIMIT_LOGIN_MAX, 3),
      windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
    }
  }

  return {
    limit: env.RATE_LIMIT_MUTATION_MAX,
    windowMs: env.RATE_LIMIT_MUTATION_WINDOW_MS,
  }
}

export function consumeRateLimit(bucket: BucketName, key: string) {
  const { limit, windowMs } = getBucketConfig(bucket)
  const now = Date.now()
  const storeKey = `${bucket}:${key}`
  const existing = store.get(storeKey)

  if (!existing || existing.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + windowMs }
    store.set(storeKey, nextEntry)

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - nextEntry.count),
      retryAfterMs: windowMs,
    }
  }

  existing.count += 1
  store.set(storeKey, existing)

  return {
    allowed: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: Math.max(existing.resetAt - now, 0),
  }
}

export function getRateLimitResponse(
  request: Request,
  bucket: BucketName,
  extraKey?: string
) {
  const ip = getClientIp(request)
  const key = extraKey ? `${ip}:${extraKey}` : ip
  const result = consumeRateLimit(bucket, key)

  if (result.allowed) {
    return null
  }

  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(result.retryAfterMs / 1000).toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
      },
    }
  )
}
