type HeadersLike =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined

function readHeader(headers: HeadersLike, name: string) {
  if (!headers) return undefined

  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined
  }

  const value = headers[name] ?? headers[name.toLowerCase()]

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export function getHeaderValue(headers: HeadersLike, name: string) {
  return readHeader(headers, name)
}

export function getClientIp(input: { headers?: HeadersLike } | Request | undefined) {
  const headers = input instanceof Request ? input.headers : input?.headers
  const forwardedFor = readHeader(headers, "x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return readHeader(headers, "x-real-ip") ?? "unknown"
}

export function getUserAgent(input: { headers?: HeadersLike } | Request | undefined) {
  const headers = input instanceof Request ? input.headers : input?.headers
  return readHeader(headers, "user-agent") ?? "unknown"
}
