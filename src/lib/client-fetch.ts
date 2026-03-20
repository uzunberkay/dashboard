type CacheRecord<T> = {
  data: T
  expiresAt: number
}

type FetchJsonOptions = {
  ttlMs?: number
  force?: boolean
  signal?: AbortSignal
}

const responseCache = new Map<string, CacheRecord<unknown>>()
const inflightRequests = new Map<string, Promise<unknown>>()

function isValidCacheRecord(record: CacheRecord<unknown> | undefined) {
  if (!record) {
    return false
  }

  return record.expiresAt > Date.now()
}

function createAbortError() {
  return new DOMException("The operation was aborted.", "AbortError")
}

function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) {
    return promise
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError())
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(createAbortError())

    signal.addEventListener("abort", abort, { once: true })

    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener("abort", abort)
        reject(error)
      }
    )
  })
}

export async function fetchJsonWithCache<T>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const { ttlMs = 10000, force = false, signal } = options

  if (!force) {
    const cached = responseCache.get(url)
    if (cached && isValidCacheRecord(cached)) {
      return cached.data as T
    }
  } else {
    responseCache.delete(url)
  }

  const activeRequest = inflightRequests.get(url)
  if (activeRequest) {
    return withAbortSignal(activeRequest as Promise<T>, signal)
  }

  const requestPromise = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }

      return (await response.json()) as T
    })
    .then((data) => {
      responseCache.set(url, {
        data,
        expiresAt: Date.now() + ttlMs,
      })
      return data
    })
    .finally(() => {
      inflightRequests.delete(url)
    })

  inflightRequests.set(url, requestPromise)
  return withAbortSignal(requestPromise, signal)
}

export function invalidateClientFetchCache(prefixes?: string | string[]) {
  if (!prefixes) {
    responseCache.clear()
    return
  }

  const normalizedPrefixes = Array.isArray(prefixes) ? prefixes : [prefixes]
  for (const key of responseCache.keys()) {
    if (normalizedPrefixes.some((prefix) => key.startsWith(prefix))) {
      responseCache.delete(key)
    }
  }
}
