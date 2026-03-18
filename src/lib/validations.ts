import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
})

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive("Tutar pozitif olmalıdır"),
  description: z.string().optional(),
  date: z.string(),
  categoryId: z.string().optional().nullable(),
})

export const categorySchema = z.object({
  name: z.string().min(1, "Kategori adı zorunludur"),
  budgetLimit: z.number().positive("Bütçe limiti pozitif olmalıdır").optional().nullable(),
  parentId: z.string().optional().nullable(),
})

export const reorderSchema = z.object({
  categoryId: z.string(),
  newParentId: z.string(),
  newSortOrder: z.number().int().min(0),
})

export const goalSchema = z.object({
  scope: z.enum(["OVERALL", "CATEGORY"]),
  period: z.enum(["MONTHLY", "YEARLY"]),
  direction: z.enum(["SAVE", "SPEND_MAX"]),
  targetAmount: z.number().positive("Hedef tutarı pozitif olmalıdır"),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional().nullable(),
  categoryId: z.string().optional().nullable(),
})

export type GoalInput = z.infer<typeof goalSchema>

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type TransactionInput = z.infer<typeof transactionSchema>
export type CategoryInput = z.infer<typeof categorySchema>
