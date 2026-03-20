import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { ensureNotificationPreference } from "@/lib/finance-assistant"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { notificationPreferenceSchema } from "@/lib/validations"

export async function GET() {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const preferences = await ensureNotificationPreference(prisma, session.user.id)
  return NextResponse.json(preferences)
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  try {
    const body = await req.json()
    const data = notificationPreferenceSchema.parse(body)

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    })

    revalidateTag(CACHE_TAGS.notificationPreferences, "max")
    revalidateTag(CACHE_TAGS.reminders, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")

    return NextResponse.json(preferences)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
