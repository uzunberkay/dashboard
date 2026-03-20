import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

export async function getAuthSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  return session
}

export function unauthorized() {
  return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: "Bu islem icin yetkiniz yok" }, { status: 403 })
}
