import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use environment variables — set these in Netlify dashboard
// DATABASE_URL = Supabase pooler URL (port 6543 with pgbouncer=true)
// DIRECT_URL  = Supabase direct URL (port 5432, for migrations)
const databaseUrl = process.env.DATABASE_URL || ''

export const db = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: databaseUrl || undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
