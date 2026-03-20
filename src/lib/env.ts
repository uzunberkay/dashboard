import { z } from "zod"

const appEnvSchema = z.enum(["development", "staging", "production"])

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://", "DATABASE_URL must use postgresql://"),
  DIRECT_URL: z.string().startsWith("postgresql://", "DIRECT_URL must use postgresql://"),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET is too short"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  VERCEL_URL: z.string().trim().min(1).optional(),
  VERCEL_BRANCH_URL: z.string().trim().min(1).optional(),
  APP_ENV: appEnvSchema.default("development"),
  ENABLE_DEMO_SEED: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(600000),
  RATE_LIMIT_MUTATION_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MUTATION_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email").optional(),
  CRON_SECRET: z.string().min(12, "CRON_SECRET is too short").optional(),
}).superRefine((env, ctx) => {
  if (env.NEXTAUTH_URL) {
    return
  }

  if (env.APP_ENV === "production") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NEXTAUTH_URL"],
      message: "NEXTAUTH_URL is required in production",
    })
    return
  }

  if (env.APP_ENV === "development") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NEXTAUTH_URL"],
      message: "NEXTAUTH_URL is required in development",
    })
    return
  }

  const hasVercelPreviewUrl = Boolean(env.VERCEL_BRANCH_URL || env.VERCEL_URL)
  if (!hasVercelPreviewUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NEXTAUTH_URL"],
      message: "NEXTAUTH_URL is required unless VERCEL_BRANCH_URL or VERCEL_URL is set",
    })
  }
})

let cachedEnv: z.infer<typeof serverEnvSchema> | null = null

export function getServerEnv() {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse(process.env)
  }

  return cachedEnv
}

export function isProductionApp() {
  return getServerEnv().APP_ENV === "production"
}

type VercelEnvLike = {
  VERCEL_BRANCH_URL?: string
  VERCEL_URL?: string
}

function toHttpsUrl(value: string | undefined) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  return `https://${trimmed}`
}

export function deriveNextAuthUrlFromVercel(env: VercelEnvLike = process.env as VercelEnvLike) {
  return toHttpsUrl(env.VERCEL_BRANCH_URL) ?? toHttpsUrl(env.VERCEL_URL)
}

export function getEffectiveNextAuthUrl() {
  const env = getServerEnv()

  return env.NEXTAUTH_URL ?? deriveNextAuthUrlFromVercel(env)
}

export function canSendEmail() {
  const env = getServerEnv()
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM)
}
