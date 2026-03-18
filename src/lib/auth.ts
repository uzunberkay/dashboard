import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { deriveNextAuthUrlFromVercel } from "@/lib/env"
import { getClientIp } from "@/lib/request"
import { consumeRateLimit } from "@/lib/rate-limit"

const derivedNextAuthUrl = deriveNextAuthUrlFromVercel()
if (!process.env.NEXTAUTH_URL && derivedNextAuthUrl) {
  process.env.NEXTAUTH_URL = derivedNextAuthUrl
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials, req) {
        const rateLimit = consumeRateLimit("login", getClientIp({ headers: req?.headers }))

        if (!rateLimit.allowed) {
          throw new Error("Cok fazla giris denemesi. Lutfen daha sonra tekrar deneyin.")
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve şifre gereklidir")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error("Kullanıcı bulunamadı")
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Geçersiz şifre")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token.id) {
        session.user.id = token.id
        session.user.name = token.name ?? null
        session.user.email = token.email ?? null
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        })
        if (!dbUser) {
          delete token.id
        }
      }

      return token
    },
  },
}
