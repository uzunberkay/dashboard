import { ActivityLogEvent } from "@prisma/client"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { deriveNextAuthUrlFromVercel } from "@/lib/env"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getClientIp, getUserAgent } from "@/lib/request"
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
        password: { label: "Sifre", type: "password" },
      },
      async authorize(credentials, req) {
        const rateLimit = consumeRateLimit("login", getClientIp({ headers: req?.headers }))

        if (!rateLimit.allowed) {
          throw new Error("Cok fazla giris denemesi. Lutfen daha sonra tekrar deneyin.")
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve sifre gereklidir")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error("Kullanici bulunamadi")
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Gecersiz sifre")
        }

        if (!user.isActive) {
          throw new Error("Hesabiniz devre disi. Lutfen yonetici ile iletisime gecin.")
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        try {
          await prisma.activityLog.create({
            data: {
              event: ActivityLogEvent.LOGIN,
              actorUserId: user.id,
              targetUserId: user.id,
              ipAddress: getClientIp({ headers: req?.headers }),
              userAgent: getUserAgent({ headers: req?.headers }),
            },
          })
        } catch (error) {
          logger.error("Login activity log write failed", error, { userId: user.id })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
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
        session.user.role = token.role ?? "USER"
        session.user.isActive = token.isActive ?? true
      }

      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
        token.isActive = user.isActive
      }

      return token
    },
  },
}
