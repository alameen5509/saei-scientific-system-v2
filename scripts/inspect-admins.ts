// فحص شامل لحسابات ADMIN
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

(async () => {
  const url = process.env
    .DATABASE_URL!.replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/\?$/, "");
  const p = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    }),
  });

  // 1) كل ADMINs
  const admins = await p.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true, password: true, createdAt: true },
  });
  console.log("\n=== ADMIN users ===");
  for (const a of admins) {
    console.log(
      `  ${a.email} | name=${a.name} | pwd_len=${a.password?.length ?? 0} | created=${a.createdAt.toISOString().slice(0, 10)}`
    );
  }

  // 2) كل بريد يحوي "admin"
  const adminish = await p.user.findMany({
    where: { email: { contains: "admin" } },
    select: { email: true, role: true, password: true },
  });
  console.log("\n=== Emails containing 'admin' ===");
  for (const a of adminish) {
    console.log(
      `  ${a.email} | role=${a.role} | pwd_len=${a.password?.length ?? 0}`
    );
  }

  // 3) Total users
  const total = await p.user.count();
  console.log(`\n=== Total users in DB: ${total} ===`);

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
