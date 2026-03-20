import "next-auth"

declare module "next-auth" {
  interface User {
    role: "USER" | "ADMIN"
    isActive: boolean
  }

  interface Session {
    user: {
      id: string
      name: string | null
      email: string | null
      role: "USER" | "ADMIN"
      isActive: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "USER" | "ADMIN"
    isActive?: boolean
  }
}
