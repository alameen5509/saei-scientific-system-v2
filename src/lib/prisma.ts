// مفرد PrismaClient — Prisma 7 يتطلب driver adapter (@prisma/adapter-pg)
// ملاحظة: Supabase يفرض TLS — pg لا يفعّله تلقائياً في كل البيئات،
// لذا نمرّر ssl صراحةً كحماية إضافية بجانب ?sslmode=require في URL
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? "";
  const adapter = new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
