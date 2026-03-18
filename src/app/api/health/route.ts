import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET() {
  const env = getServerEnv()

  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: "ok",
      environment: env.APP_ENV,
      timestamp: new Date().toISOString(),
      database: "reachable",
    })
  } catch (error) {
    logger.error("Health check failed", error, { environment: env.APP_ENV })

    return NextResponse.json(
      {
        status: "error",
        environment: env.APP_ENV,
        timestamp: new Date().toISOString(),
        database: "unreachable",
      },
      { status: 503 }
    )
  }
}
