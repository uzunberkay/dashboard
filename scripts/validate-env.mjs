import nextEnv from "@next/env"
import { z } from "zod"

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://", "DATABASE_URL must use postgresql://"),
  DIRECT_URL: z.string().startsWith("postgresql://", "DIRECT_URL must use postgresql://"),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET is too short"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  VERCEL_URL: z.string().trim().min(1).optional(),
  VERCEL_BRANCH_URL: z.string().trim().min(1).optional(),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  ENABLE_DEMO_SEED: z.enum(["true", "false"]).optional(),
  RATE_LIMIT_LOGIN_MAX: z.string().optional(),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MUTATION_MAX: z.string().optional(),
  RATE_LIMIT_MUTATION_WINDOW_MS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email").optional(),
  CRON_SECRET: z.string().optional(),
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

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error("Environment validation failed")
  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`)
  }
  process.exit(1)
}

console.log("Environment validation passed")
