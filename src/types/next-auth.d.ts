import "next-auth"
import type { AdminUserRole } from "@/types/admin"

declare module "next-auth" {
  interface User {
    role: AdminUserRole
    isActive: boolean
    sessionVersion: number
  }

  interface Session {
    user: {
      id: string
      name: string | null
      email: string | null
      role: AdminUserRole
      isActive: boolean
      sessionVersion: number
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: AdminUserRole
    isActive?: boolean
    sessionVersion?: number
  }
}
