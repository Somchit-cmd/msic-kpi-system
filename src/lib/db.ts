import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase pooler URL for runtime connections (port 6543 with pgbouncer)
// Override any system-level DATABASE_URL that might point to old SQLite.
// In production (Netlify), set DATABASE_URL env var in the dashboard.
const SUPABASE_POOLER_URL = 'postgresql://postgres.wtogscfvsjcvtxhwgudw:QlSB4eRHspVsHFKF@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

// Fix: system env DATABASE_URL may point to old SQLite; force it to PostgreSQL
if (!process.env.DATABASE_URL?.startsWith('postgresql://') && !process.env.DATABASE_URL?.startsWith('postgres://')) {
  process.env.DATABASE_URL = SUPABASE_POOLER_URL
}

export const db = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: SUPABASE_POOLER_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
