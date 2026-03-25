import { ActivityLogEvent } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getServerEnv } from "@/lib/env"
import { buildMonthlyDigestPreview } from "@/lib/finance-assistant"
import { sendTransactionalEmail } from "@/lib/finance-email"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

function buildPaymentReminderHtml(input: {
  userName: string
  paymentName: string
  dueDate: string
  amount: number
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Odeme hatirlatmasi</h2>
      <p>Merhaba ${input.userName},</p>
      <p><strong>${input.paymentName}</strong> odemeniz ${input.dueDate} tarihinde planli.</p>
      <p>Tutar: <strong>${input.amount.toFixed(2)} TL</strong></p>
    </div>
  `
}

async function authorizeFinanceJob(request: NextRequest) {
  const env = getServerEnv()
  const providedSecret = request.headers.get("x-cron-secret")

  if (env.CRON_SECRET && providedSecret === env.CRON_SECRET) {
    return {
      actorUserId: null,
      source: "cron" as const,
    }
  }

  const adminSession = await requireAdminApiSession("system:jobs:run")
  if ("response" in adminSession) {
    return {
      response: env.CRON_SECRET
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : adminSession.response,
    }
  }

  return {
    actorUserId: adminSession.admin.id,
    source: "admin" as const,
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeFinanceJob(req)
  if ("response" in auth) {
    return auth.response
  }

  const now = new Date()

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        notificationPreference: true,
      },
    })

    for (const user of users) {
      const reportMonth = now.getMonth() + 1
      const reportYear = now.getFullYear()
      const monthStart = new Date(reportYear, now.getMonth(), 1)
      const monthEnd = new Date(reportYear, now.getMonth() + 1, 1)

      const [incomeAgg, expenseAgg, topCategory, budgetAlerts] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: "INCOME",
            date: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: "EXPENSE",
            date: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
          by: ["categoryId"],
          where: {
            userId: user.id,
            type: "EXPENSE",
            date: { gte: monthStart, lt: monthEnd },
            categoryId: { not: null },
          },
          _sum: { amount: true },
          orderBy: {
            _sum: {
              amount: "desc",
            },
          },
          take: 1,
        }),
        prisma.category.findMany({
          where: {
            userId: user.id,
            budgetLimit: { not: null },
          },
          select: {
            budgetLimit: true,
            transactions: {
              where: {
                type: "EXPENSE",
                date: { gte: monthStart, lt: monthEnd },
              },
              select: { amount: true },
            },
          },
        }),
      ])

      const totalIncome = incomeAgg._sum.amount || 0
      const totalExpense = expenseAgg._sum.amount || 0
      const balance = totalIncome - totalExpense
      const topCategoryAmount = topCategory[0]?._sum.amount || 0
      const budgetAlertCount = budgetAlerts.filter((category) => {
        const spent = category.transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
        return category.budgetLimit ? spent / category.budgetLimit >= 0.8 : false
      }).length

      const digest = buildMonthlyDigestPreview({
        periodLabel: monthStart.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        totalIncome,
        totalExpense,
        balance,
        topCategoryName: topCategoryAmount > 0 ? "Kategori baskisi" : null,
        topCategoryShare: totalExpense > 0 ? (topCategoryAmount / totalExpense) * 100 : 0,
        budgetAlertCount,
        forecastExpense: totalExpense,
        forecastBalance: balance,
        actionItems: [],
      })

      const report = await prisma.monthlyReport.upsert({
        where: {
          userId_year_month: {
            userId: user.id,
            year: reportYear,
            month: reportMonth,
          },
        },
        update: {
          title: digest.title,
          summaryText: digest.summary,
          metricsJson: {
            totalIncome,
            totalExpense,
            balance,
            budgetAlertCount,
          },
          highlightsJson: digest.highlights,
        },
        create: {
          userId: user.id,
          year: reportYear,
          month: reportMonth,
          title: digest.title,
          summaryText: digest.summary,
          metricsJson: {
            totalIncome,
            totalExpense,
            balance,
            budgetAlertCount,
          },
          highlightsJson: digest.highlights,
        },
      })

      if (user.notificationPreference?.emailMonthlyDigest) {
        const existingDigestReminder = await prisma.reminder.findFirst({
          where: {
            userId: user.id,
            monthlyReportId: report.id,
            channel: "EMAIL",
            type: "MONTHLY_DIGEST",
          },
        })

        if (!existingDigestReminder) {
          await prisma.reminder.create({
            data: {
              userId: user.id,
              monthlyReportId: report.id,
              channel: "EMAIL",
              type: "MONTHLY_DIGEST",
              status: "PENDING",
              sendAt: now,
            },
          })
        }
      }
    }

    const dueReminders = await prisma.reminder.findMany({
      where: {
        channel: "EMAIL",
        status: "PENDING",
        sendAt: { lte: now },
      },
      include: {
        user: { select: { email: true, name: true } },
        scheduledPayment: true,
        monthlyReport: true,
      },
      orderBy: { sendAt: "asc" },
      take: 50,
    })

    let processed = 0
    for (const reminder of dueReminders) {
      if (!reminder.user.email) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: "FAILED",
            lastError: "Missing recipient email",
          },
        })
        continue
      }

      let sendResult

      if (reminder.scheduledPayment) {
        sendResult = await sendTransactionalEmail({
          to: reminder.user.email,
          subject: `${reminder.scheduledPayment.name} odeme hatirlatmasi`,
          html: buildPaymentReminderHtml({
            userName: reminder.user.name,
            paymentName: reminder.scheduledPayment.name,
            dueDate: new Date(reminder.scheduledPayment.dueDate).toLocaleDateString("tr-TR"),
            amount: reminder.scheduledPayment.amount,
          }),
        })
      } else if (reminder.monthlyReport) {
        sendResult = await sendTransactionalEmail({
          to: reminder.user.email,
          subject: reminder.monthlyReport.title,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
              <h2>${reminder.monthlyReport.title}</h2>
              <p>${reminder.monthlyReport.summaryText}</p>
            </div>
          `,
        })
      } else {
        sendResult = { ok: false as const, skipped: false as const }
      }

      if (sendResult.ok || sendResult.skipped) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: sendResult.ok ? "SENT" : "SKIPPED",
            sentAt: new Date(),
            lastError: null,
          },
        })
        processed += 1
      } else {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: "FAILED",
            lastError: "Provider request failed",
          },
        })
      }
    }

    await prisma.activityLog.create({
      data: {
        event: ActivityLogEvent.FINANCE_REMINDER_JOB_SUCCEEDED,
        actorUserId: auth.actorUserId,
        metadata: {
          source: auth.source,
          processed,
          dueReminderCount: dueReminders.length,
        },
      },
    })

    logger.info("Finance reminder job completed", {
      processed,
      source: auth.source,
    })

    return NextResponse.json({ processed })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown finance reminder job error"

    logger.error("Finance reminder job failed", error, {
      source: auth.source,
    })

    await prisma.activityLog.create({
      data: {
        event: ActivityLogEvent.FINANCE_REMINDER_JOB_FAILED,
        actorUserId: auth.actorUserId,
        metadata: {
          source: auth.source,
          errorMessage,
        },
      },
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
