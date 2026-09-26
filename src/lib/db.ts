import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Singleton Prisma client over the POOLED Neon DATABASE_URL (serverless-safe).
 * Migrations use the direct URL via prisma.config.ts. Cached on globalThis in
 * dev so hot reloads don't open a new pool each time.
 */
function createClient() {
  // pg treats sslmode=require as verify-full today and warns about it; say so explicitly.
  const connectionString = process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=verify-full");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type * from "@prisma/client";
export {
  Prisma,
  Role,
  NikahStatus,
  SadakiStatus,
  PaymentProvider,
  PaymentStatus,
  DonationPurpose,
  DonationFrequency,
  DonationStatus,
} from "@prisma/client";
