// إضافة حساب admin إضافي — admin@saie.app
// لا يحذف أي بيانات موجودة. يستخدم upsert لتفادي تكرار الإنشاء.
import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

dotenvConfig({ path: ".env.local", override: true });

async function main() {
  // تنظيف sslmode من URL لتفادي self-signed cert error
  let url = process.env.DATABASE_URL ?? "";
  url = url.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "");

  const adapter = new PrismaPg({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter });

  const email = "admin@saie.app";
  const password = "Saie@2026";

  console.log(`🔐 توليد bcrypt hash لـ${email}...`);
  const hashed = await bcrypt.hash(password, 10);

  console.log("📥 إدخال/تحديث المستخدم...");
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "مدير النظام (saie.app)",
      password: hashed,
      role: "ADMIN",
    },
    create: {
      email,
      name: "مدير النظام (saie.app)",
      password: hashed,
      role: "ADMIN",
    },
  });

  console.log("\n✅ تمّ:");
  console.log(`   id:     ${user.id}`);
  console.log(`   email:  ${user.email}`);
  console.log(`   role:   ${user.role}`);
  console.log(`   pwd:    ${password} (مُشفَّرة بـbcrypt في DB)`);

  // تحقق فوري
  const verify = await bcrypt.compare(password, user.password ?? "");
  console.log(`\n🔬 تحقّق bcrypt.compare: ${verify ? "✅ تطابق" : "❌ فشل"}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ خطأ:", e instanceof Error ? e.message : e);
  process.exit(1);
});
