type LogLevel = "info" | "warn" | "error"
type ErrorHistoryEntry = {
  level: "error"
  message: string
  timestamp: string
  meta?: Record<string, unknown>
}

const MAX_ERROR_HISTORY = 25
const errorHistory: ErrorHistoryEntry[] = []

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return error
}

function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  }

  if (level === "error") {
    errorHistory.unshift(payload as ErrorHistoryEntry)
    if (errorHistory.length > MAX_ERROR_HISTORY) {
      errorHistory.length = MAX_ERROR_HISTORY
    }
  }

  const serialized = JSON.stringify(payload)

  if (level === "error") {
    console.error(serialized)
    return
  }

  if (level === "warn") {
    console.warn(serialized)
    return
  }

  console.log(serialized)
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    writeLog("info", message, meta)
  },
  warn(message: string, meta?: Record<string, unknown>) {
    writeLog("warn", message, meta)
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    writeLog("error", message, {
      ...(meta ?? {}),
      ...(error === undefined ? {} : { error: serializeError(error) }),
    })
  },
}

export function getRecentErrors(limit = 10) {
  return errorHistory.slice(0, limit)
}
