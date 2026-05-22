import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

declare module 'next-auth' {
  interface User {
    orgId:      string
    role:       string
    mustChange: boolean
  }
  interface Session {
    user: {
      id:         string
      name:       string
      email:      string
      orgId:      string
      role:       string
      mustChange: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    orgId:      string
    role:       string
    mustChange: boolean
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages:   { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
        if (!user || !user.active) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id:         user.id,
          name:       user.name,
          email:      user.email,
          orgId:      user.orgId,
          role:       user.role,
          mustChange: user.mustChange,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id         = user.id
        token.orgId      = user.orgId
        token.role       = user.role
        token.mustChange = user.mustChange
      }
      return token
    },
    session({ session, token }) {
      session.user.id         = token.id as string
      session.user.orgId      = token.orgId
      session.user.role       = token.role
      session.user.mustChange = token.mustChange
      return session
    },
  },
}
