import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const monthParam = req.nextUrl.searchParams.get("month")

  if (monthParam) {
    const [year, month] = monthParam.split("-").map(Number)
    const report = await prisma.monthlyReport.findUnique({
      where: {
        userId_year_month: {
          userId: session.user.id,
          year,
          month,
        },
      },
    })

    return NextResponse.json(report)
  }

  const reports = await prisma.monthlyReport.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 6,
  })

  return NextResponse.json(reports)
}
