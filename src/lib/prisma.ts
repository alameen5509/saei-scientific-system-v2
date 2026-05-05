// مفرد PrismaClient — Prisma 7 يتطلب driver adapter (@prisma/adapter-pg)
//
// ملاحظتان مهمّتان عن Supabase + pg:
// 1) Supabase يقدّم certificate من سلسلة Amazon RDS — pg الافتراضي
//    يرفضه كـself-signed. لذا نمرّر { ssl: { rejectUnauthorized: false } }.
// 2) إن احتوت DATABASE_URL على ?sslmode=require, فإن pg-connection-string
//    يعتبرها alias لـverify-full ويتجاوز ssl options المُمرَّرة. نزيلها
//    من URL قبل التمرير لأن الـadapter يدير SSL مباشرةً.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildClient(): PrismaClient {
  let connectionString = process.env.DATABASE_URL ?? "";
  // إزالة sslmode/uselibpqcompat — نتحكّم بـSSL عبر adapter صراحةً
  connectionString = connectionString
    .replace(/[?&](sslmode|uselibpqcompat)=[^&]*/g, "")
    .replace(/\?$/, "");

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
