import 'dotenv/config'
import path from 'node:path'
import type { PrismaConfig } from 'prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Connection pool for Prisma
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)

export default {
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    // Use DIRECT_URL for migrations (non-pooler connection)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  }
} satisfies PrismaConfig

