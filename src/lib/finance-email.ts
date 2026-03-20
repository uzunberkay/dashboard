import { canSendEmail, getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendTransactionalEmail({ to, subject, html }: SendEmailInput) {
  if (!canSendEmail()) {
    logger.warn("Email send skipped because provider configuration is missing", { to, subject })
    return { ok: false as const, skipped: true as const }
  }

  const env = getServerEnv()

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      logger.error("Email provider request failed", undefined, {
        to,
        subject,
        status: response.status,
        body,
      })
      return { ok: false as const, skipped: false as const }
    }

    return { ok: true as const, skipped: false as const }
  } catch (error) {
    logger.error("Email send failed", error, { to, subject })
    return { ok: false as const, skipped: false as const }
  }
}
