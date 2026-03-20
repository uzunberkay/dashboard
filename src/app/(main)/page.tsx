import { redirect } from "next/navigation"
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client"
import { getDashboardData, getDefaultDashboardMonth } from "@/lib/dashboard-data"
import { getAuthSession } from "@/lib/get-session"

export default async function DashboardPage() {
  const session = await getAuthSession()

  if (!session) {
    redirect("/login")
  }

  const initialMonth = getDefaultDashboardMonth()
  const initialData = await getDashboardData({
    userId: session.user.id,
    monthParam: initialMonth,
  })

  return <DashboardPageClient initialData={initialData} initialMonth={initialMonth} />
}
