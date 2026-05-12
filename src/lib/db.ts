import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase pooler URL for runtime connections (port 6543 with pgbouncer)
const SUPABASE_POOLER_URL = 'postgresql://postgres.wtogscfvsjcvtxhwgudw:QlSB4eRHspVsHFKF@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

// Fix system-level DATABASE_URL that might point to old SQLite
const envUrl = process.env.DATABASE_URL || ''
if (!envUrl.startsWith('postgresql://') && !envUrl.startsWith('postgres://')) {
  process.env.DATABASE_URL = SUPABASE_POOLER_URL
}

export const db = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: SUPABASE_POOLER_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
