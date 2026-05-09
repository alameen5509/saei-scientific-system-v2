// إنشاء/تحديث حساب admin@saie.app
// — لا يحوي أي كلمة مرور في الكود
// — يقرأ من SEED_ADMIN_PASSWORD، أو يولّد كلمة قوية ويطبعها مرة واحدة
import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateStrongPassword } from "../src/lib/password-gen";

dotenvConfig({ path: ".env.local", override: true });

async function main() {
  const url = (process.env.DATABASE_URL ?? "")
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/\?$/, "");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    }),
  });

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@saie.app";

  // — كلمة المرور: من البيئة أو مولَّدة عشوائياً —
  let password = process.env.SEED_ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = generateStrongPassword(20);
    generated = true;
  }

  console.log(`🔐 توليد bcrypt hash لـ${email}...`);
  const hashed = await bcrypt.hash(password, 10);

  console.log("📥 إدخال/تحديث المستخدم...");
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "مدير النظام",
      password: hashed,
      role: "ADMIN",
    },
    create: {
      email,
      name: "مدير النظام",
      password: hashed,
      role: "ADMIN",
    },
  });

  // تحقّق فوري
  const verify = await bcrypt.compare(password, user.password ?? "");

  console.log("\n" + "═".repeat(60));
  console.log("✅ تمّ تحديث الحساب:");
  console.log(`   id:     ${user.id}`);
  console.log(`   email:  ${user.email}`);
  console.log(`   role:   ${user.role}`);
  console.log(`   bcrypt: ${verify ? "✓ تطابق" : "✗ فشل"}`);
  console.log("═".repeat(60));

  if (generated) {
    console.log("\n🔑 كلمة المرور المولَّدة (تظهر مرة واحدة فقط):");
    console.log("\n   " + password + "\n");
    console.log("⚠️  احفظها فوراً في password manager — لن تُطبع مجدداً.");
    console.log(
      "    لاستخدامها في تشغيل لاحق: SEED_ADMIN_PASSWORD=... npx tsx prisma/seed-admin.ts"
    );
  } else {
    console.log("\nℹ️  استُخدمت SEED_ADMIN_PASSWORD من البيئة.");
  }
  console.log("═".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ خطأ:", e instanceof Error ? e.message : e);
  process.exit(1);
});
