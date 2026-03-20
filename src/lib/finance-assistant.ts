import {
  ReminderChannel,
  ReminderStatus,
  ReminderType,
  ScheduledPaymentStatus,
  type PrismaClient,
  type RecurringRule,
  type ScheduledPayment,
} from "@prisma/client"

type NotificationPreferenceLike = {
  emailReminders: boolean
  emailMonthlyDigest: boolean
  reminderLeadDays: number
}

type ActionItemInput = {
  id: string
  title: string
  description: string
  href: string
  tone: "income" | "expense" | "warning" | "neutral"
  ctaLabel: string
  priority: number
}

type DigestPreviewInput = {
  periodLabel: string
  totalIncome: number
  totalExpense: number
  balance: number
  topCategoryName: string | null
  topCategoryShare: number
  budgetAlertCount: number
  forecastExpense: number
  forecastBalance: number
  actionItems: Array<{ title: string }>
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function getMonthWindow(year: number, monthIndex: number) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
  }
}

function getMonthDays(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function createOccurrenceFromDay(baseDate: Date, year: number, monthIndex: number, desiredDay: number) {
  const day = Math.min(desiredDay, getMonthDays(year, monthIndex))
  return new Date(
    year,
    monthIndex,
    day,
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds()
  )
}

export function getRecurringOccurrences(
  rule: Pick<
    RecurringRule,
    "frequency" | "customMonthDay" | "startsAt" | "endsAt"
  >,
  rangeStart: Date,
  rangeEnd: Date
) {
  const occurrences: Date[] = []
  const ruleStart = new Date(rule.startsAt)
  const ruleEnd = rule.endsAt ? new Date(rule.endsAt) : null
  const windowStart = new Date(Math.max(rangeStart.getTime(), ruleStart.getTime()))
  const windowEnd = ruleEnd ? new Date(Math.min(rangeEnd.getTime(), ruleEnd.getTime())) : rangeEnd

  if (windowStart >= windowEnd) {
    return occurrences
  }

  if (rule.frequency === "WEEKLY") {
    const cursor = new Date(ruleStart)

    while (cursor < windowStart) {
      cursor.setDate(cursor.getDate() + 7)
    }

    while (cursor < windowEnd) {
      occurrences.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 7)
    }

    return occurrences
  }

  const desiredDay = rule.frequency === "CUSTOM_MONTH_DAY"
    ? rule.customMonthDay ?? ruleStart.getDate()
    : ruleStart.getDate()

  let year = windowStart.getFullYear()
  let monthIndex = windowStart.getMonth()

  while (new Date(year, monthIndex, 1) < windowEnd) {
    const occurrence = createOccurrenceFromDay(ruleStart, year, monthIndex, desiredDay)
    if (occurrence >= windowStart && occurrence < windowEnd && occurrence >= ruleStart) {
      occurrences.push(occurrence)
    }

    monthIndex += 1
    if (monthIndex > 11) {
      monthIndex = 0
      year += 1
    }
  }

  return occurrences
}

export async function ensureNotificationPreference(prisma: PrismaClient, userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
    },
  })
}

export async function syncRecurringSchedulesForUser(
  prisma: PrismaClient,
  userId: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  const rules = await prisma.recurringRule.findMany({
    where: {
      userId,
      isActive: true,
      startsAt: { lt: rangeEnd },
      OR: [{ endsAt: null }, { endsAt: { gte: rangeStart } }],
    },
    orderBy: { createdAt: "asc" },
  })

  if (rules.length === 0) {
    return []
  }

  const existing = await prisma.scheduledPayment.findMany({
    where: {
      userId,
      recurringRuleId: { in: rules.map((rule) => rule.id) },
      dueDate: { gte: rangeStart, lt: rangeEnd },
    },
    select: {
      recurringRuleId: true,
      dueDate: true,
    },
  })

  const existingKeys = new Set(
    existing.map((item) => `${item.recurringRuleId}:${toDateKey(new Date(item.dueDate))}`)
  )

  const creates = rules.flatMap((rule) =>
    getRecurringOccurrences(rule, rangeStart, rangeEnd)
      .filter((occurrence) => !existingKeys.has(`${rule.id}:${toDateKey(occurrence)}`))
      .map((occurrence) => ({
        userId,
        recurringRuleId: rule.id,
        name: rule.name,
        type: rule.type,
        amount: rule.amount,
        description: rule.description,
        dueDate: occurrence,
        categoryId: rule.categoryId,
        source: "RECURRING",
      }))
  )

  if (creates.length > 0) {
    await prisma.scheduledPayment.createMany({
      data: creates,
      skipDuplicates: true,
    })
  }

  return prisma.scheduledPayment.findMany({
    where: {
      userId,
      dueDate: { gte: rangeStart, lt: rangeEnd },
    },
    include: {
      category: { select: { id: true, name: true } },
      recurringRule: {
        select: {
          id: true,
          name: true,
          isSubscription: true,
          reminderDaysBefore: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  })
}

export async function ensurePaymentRemindersForUser(
  prisma: PrismaClient,
  userId: string,
  scheduledPayments: Array<
    Pick<ScheduledPayment, "id" | "dueDate" | "status"> &
    { recurringRule?: Pick<RecurringRule, "reminderDaysBefore"> | null }
  >,
  preference: NotificationPreferenceLike
) {
  const eligiblePayments = scheduledPayments.filter((payment) => payment.status === ScheduledPaymentStatus.PENDING)
  if (eligiblePayments.length === 0) {
    return []
  }

  const existing = await prisma.reminder.findMany({
    where: {
      userId,
      scheduledPaymentId: { in: eligiblePayments.map((payment) => payment.id) },
      type: ReminderType.PAYMENT_UPCOMING,
      channel: { in: [ReminderChannel.IN_APP, ReminderChannel.EMAIL] },
    },
  })

  const existingKeys = new Set(
    existing.map((item) => `${item.scheduledPaymentId}:${item.channel}:${item.type}`)
  )

  const toCreate = eligiblePayments.flatMap((payment) => {
    const leadDays = payment.recurringRule?.reminderDaysBefore ?? preference.reminderLeadDays
    const sendAt = new Date(payment.dueDate)
    sendAt.setDate(sendAt.getDate() - leadDays)

    const createItems = []
    const inAppKey = `${payment.id}:${ReminderChannel.IN_APP}:${ReminderType.PAYMENT_UPCOMING}`
    if (!existingKeys.has(inAppKey)) {
      createItems.push({
        userId,
        scheduledPaymentId: payment.id,
        type: ReminderType.PAYMENT_UPCOMING,
        channel: ReminderChannel.IN_APP,
        status: ReminderStatus.PENDING,
        sendAt,
      })
    }

    const emailKey = `${payment.id}:${ReminderChannel.EMAIL}:${ReminderType.PAYMENT_UPCOMING}`
    if (preference.emailReminders && !existingKeys.has(emailKey)) {
      createItems.push({
        userId,
        scheduledPaymentId: payment.id,
        type: ReminderType.PAYMENT_UPCOMING,
        channel: ReminderChannel.EMAIL,
        status: ReminderStatus.PENDING,
        sendAt,
      })
    }

    return createItems
  })

  if (toCreate.length > 0) {
    await prisma.reminder.createMany({
      data: toCreate,
    })
  }

  return prisma.reminder.findMany({
    where: {
      userId,
      scheduledPaymentId: { in: eligiblePayments.map((payment) => payment.id) },
      type: ReminderType.PAYMENT_UPCOMING,
    },
    include: {
      scheduledPayment: {
        select: {
          id: true,
          name: true,
          dueDate: true,
          amount: true,
          status: true,
        },
      },
    },
    orderBy: { sendAt: "asc" },
  })
}

export function calculateHealthScore(input: {
  savingsRate: number
  balance: number
  overBudgetCount: number
  budgetAlertCount: number
  goalStatus: "safe" | "warning" | "danger" | "none"
  averageVarianceRatio: number
}) {
  let score = 58

  score += clampNumber(input.savingsRate, -20, 20)
  score += input.balance >= 0 ? 10 : -12
  score -= input.overBudgetCount * 10
  score -= Math.max(input.budgetAlertCount - input.overBudgetCount, 0) * 4
  score -= Math.round(input.averageVarianceRatio * 14)

  if (input.goalStatus === "safe") {
    score += 8
  } else if (input.goalStatus === "warning") {
    score -= 4
  } else if (input.goalStatus === "danger") {
    score -= 10
  }

  const finalScore = clampNumber(Math.round(score), 0, 100)
  const label =
    finalScore >= 75
      ? "Guclu"
      : finalScore >= 55
        ? "Dengeli"
        : finalScore >= 35
          ? "Riskli"
          : "Kritik"

  const summary =
    finalScore >= 75
      ? "Bu donemde genel finansal ritim saglikli gorunuyor."
      : finalScore >= 55
        ? "Temel denge korunuyor, ancak izlenmesi gereken noktalar var."
        : finalScore >= 35
          ? "Butce ve harcama trendlerinde belirgin baski olusmus durumda."
          : "Acil aksiyon gerektiren bir finansal baski gorunuyor."

  return {
    score: finalScore,
    label,
    summary,
    drivers: [
      {
        label: "Tasarruf orani",
        value: `%${Math.round(input.savingsRate)}`,
        tone: input.savingsRate >= 15
          ? ("positive" as const)
          : input.savingsRate >= 0
            ? ("neutral" as const)
            : ("danger" as const),
      },
      {
        label: "Butce alarmlari",
        value: `${input.budgetAlertCount}`,
        tone: input.budgetAlertCount === 0
          ? ("positive" as const)
          : input.overBudgetCount > 0
            ? ("danger" as const)
            : ("warning" as const),
      },
      {
        label: "Hedef durumu",
        value: input.goalStatus === "none" ? "Tanimsiz" : input.goalStatus,
        tone:
          input.goalStatus === "safe"
            ? ("positive" as const)
            : input.goalStatus === "warning"
              ? ("warning" as const)
              : input.goalStatus === "danger"
                ? ("danger" as const)
                : ("neutral" as const),
      },
    ],
  }
}

export function buildActionCenter(items: ActionItemInput[]) {
  return items
    .sort((first, second) => second.priority - first.priority)
    .slice(0, 5)
    .map(({ priority: _priority, ...item }) => item)
}

export function buildForecast(input: {
  totalIncome: number
  totalExpense: number
  dailyAverageExpense: number
  year: number
  monthIndex: number
  isCurrentMonth: boolean
  goalStatus?: "safe" | "warning" | "danger" | null
}) {
  const totalDays = getMonthDays(input.year, input.monthIndex)
  const elapsedDays = input.isCurrentMonth ? new Date().getDate() : totalDays
  const remainingDays = Math.max(totalDays - elapsedDays, 0)
  const expectedExpense = input.isCurrentMonth
    ? input.totalExpense + input.dailyAverageExpense * remainingDays
    : input.totalExpense
  const expectedBalance = input.totalIncome - expectedExpense
  const expectedSavingsRate = input.totalIncome > 0 ? (expectedBalance / input.totalIncome) * 100 : 0

  return {
    expectedExpense,
    expectedBalance,
    expectedSavingsRate,
    projectedGoalStatus: (input.goalStatus ?? "none") as "safe" | "warning" | "danger" | "none",
    remainingDays,
  }
}

export function buildMonthlyDigestPreview(input: DigestPreviewInput) {
  const highlights = [
    `${input.periodLabel} boyunca toplam gelir ${input.totalIncome.toFixed(2)} TL, toplam gider ${input.totalExpense.toFixed(2)} TL oldu.`,
    input.topCategoryName
      ? `En baskin harcama alani ${input.topCategoryName}; toplam giderin %${Math.round(input.topCategoryShare)}ini olusturdu.`
      : "Belirgin bir kategori baskisi olusmadi.",
    input.budgetAlertCount > 0
      ? `${input.budgetAlertCount} butce sinyali oncelikli izleme gerektiriyor.`
      : "Butce cephesinde kritik bir alarm gorunmuyor.",
    input.actionItems[0]
      ? `En onemli sonraki adim: ${input.actionItems[0].title}.`
      : "Bu ay icin ek aksiyon baskisi gorunmuyor.",
  ]

  return {
    title: `${input.periodLabel} finans ozeti`,
    summary: `Donem sonu tahminine gore giderler ${input.forecastExpense.toFixed(2)} TL seviyesinde kapanabilir ve beklenen bakiye ${input.forecastBalance.toFixed(2)} TL olabilir.`,
    highlights,
  }
}

export function buildPriorityList(items: Array<{ id: string; label: string; reason: string; priority: number }>) {
  return items
    .sort((first, second) => second.priority - first.priority)
    .slice(0, 4)
    .map(({ priority: _priority, ...item }) => item)
}
