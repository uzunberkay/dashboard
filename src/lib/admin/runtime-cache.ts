type RuntimeCacheEntry = {
  value: unknown
  expiresAt: number
}

const runtimeCache = new Map<string, RuntimeCacheEntry>()

export async function getOrSetAdminRuntimeCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const existing = runtimeCache.get(key)

  if (existing && existing.expiresAt > now) {
    return existing.value as T
  }

  const value = await loader()
  runtimeCache.set(key, {
    value,
    expiresAt: now + ttlSeconds * 1000,
  })

  return value
}

export function clearAdminRuntimeCache(prefix?: string) {
  if (!prefix) {
    runtimeCache.clear()
    return
  }

  for (const key of runtimeCache.keys()) {
    if (key.startsWith(prefix)) {
      runtimeCache.delete(key)
    }
  }
}
