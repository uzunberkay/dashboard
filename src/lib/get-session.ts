import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function getAuthSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  return session
}

export function unauthorized() {
  return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
}
