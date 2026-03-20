import { AdminSettingKey, type AdminSetting } from "@prisma/client"
import type {
  AdminSettingDefinition,
  AdminSettingKey as AdminSettingKeyString,
  AdminSettingValueMap,
} from "@/types/admin"

type AdminSettingRow = Pick<AdminSetting, "key" | "valueJson">

export const ADMIN_SETTING_DEFAULTS: AdminSettingValueMap = {
  dashboardDefaultRange: "30d",
  activityRetentionDays: 180,
  exportMaxRows: 5000,
  dbDegradedThresholdMs: 300,
  dashboardCacheTtlSec: 60,
  systemCacheTtlSec: 30,
}

export const ADMIN_SETTING_DEFINITIONS: AdminSettingDefinition[] = [
  {
    key: "dashboardDefaultRange",
    label: "Dashboard varsayilan aralik",
    description: "Admin dashboard ilk acildiginda secili gelecek zaman araligi.",
    inputType: "select",
    options: [
      { label: "Son 7 gun", value: "7d" },
      { label: "Son 30 gun", value: "30d" },
      { label: "Son 90 gun", value: "90d" },
    ],
  },
  {
    key: "activityRetentionDays",
    label: "Aktivite saklama gunu",
    description: "Audit ekraninda policy olarak gosterilen log saklama suresi.",
    inputType: "number",
    min: 30,
    max: 3650,
    step: 30,
  },
  {
    key: "exportMaxRows",
    label: "Maksimum export satiri",
    description: "Activity export istekleri icin izin verilen ust satir limiti.",
    inputType: "number",
    min: 100,
    max: 50000,
    step: 100,
  },
  {
    key: "dbDegradedThresholdMs",
    label: "DB bozulma esigi",
    description: "Bu milisaniye ustunde sistem ekrani veritabanini uyari durumuna alir.",
    inputType: "number",
    min: 50,
    max: 10000,
    step: 50,
  },
  {
    key: "dashboardCacheTtlSec",
    label: "Dashboard cache suresi",
    description: "Dashboard aggregate verisinin bellek cache suresi.",
    inputType: "number",
    min: 10,
    max: 3600,
    step: 10,
  },
  {
    key: "systemCacheTtlSec",
    label: "Sistem cache suresi",
    description: "Sistem sagligi ozetinin bellek cache suresi.",
    inputType: "number",
    min: 10,
    max: 3600,
    step: 10,
  },
]

export const ADMIN_SETTING_KEYS = Object.values(AdminSettingKey)

export function isAdminSettingKey(value: string): value is AdminSettingKey {
  return ADMIN_SETTING_KEYS.includes(value as AdminSettingKey)
}

function parseNumberSetting(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function parseDashboardRange(value: unknown, fallback: AdminSettingValueMap["dashboardDefaultRange"]) {
  return value === "7d" || value === "30d" || value === "90d" ? value : fallback
}

export function parseAdminSettingValue<Key extends AdminSettingKeyString>(
  key: Key,
  value: unknown
): AdminSettingValueMap[Key] {
  switch (key) {
    case "dashboardDefaultRange":
      return parseDashboardRange(value, ADMIN_SETTING_DEFAULTS.dashboardDefaultRange) as AdminSettingValueMap[Key]
    case "activityRetentionDays":
      return parseNumberSetting(value, ADMIN_SETTING_DEFAULTS.activityRetentionDays) as AdminSettingValueMap[Key]
    case "exportMaxRows":
      return parseNumberSetting(value, ADMIN_SETTING_DEFAULTS.exportMaxRows) as AdminSettingValueMap[Key]
    case "dbDegradedThresholdMs":
      return parseNumberSetting(value, ADMIN_SETTING_DEFAULTS.dbDegradedThresholdMs) as AdminSettingValueMap[Key]
    case "dashboardCacheTtlSec":
      return parseNumberSetting(value, ADMIN_SETTING_DEFAULTS.dashboardCacheTtlSec) as AdminSettingValueMap[Key]
    case "systemCacheTtlSec":
      return parseNumberSetting(value, ADMIN_SETTING_DEFAULTS.systemCacheTtlSec) as AdminSettingValueMap[Key]
    default:
      return ADMIN_SETTING_DEFAULTS[key] as AdminSettingValueMap[Key]
  }
}

export function mergeAdminSettingValues(rows: AdminSettingRow[]) {
  const merged: AdminSettingValueMap = {
    ...ADMIN_SETTING_DEFAULTS,
  }

  for (const row of rows) {
    const key = row.key as AdminSettingKeyString
    ;(merged as Record<AdminSettingKeyString, AdminSettingValueMap[AdminSettingKeyString]>)[key] =
      parseAdminSettingValue(key, row.valueJson)
  }

  return merged
}
