import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

(async () => {
  let url = process.env.DATABASE_URL!.replace(/[?&]sslmode=[^&]*/g, "").replace(
    /\?$/,
    ""
  );
  const p = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } }),
  });
  const u = await p.user.findUnique({ where: { email: "admin@saie.app" } });
  console.log("found:", !!u, "id:", u?.id, "role:", u?.role);
  if (u?.password) {
    console.log(
      "bcrypt match Saei@2026:",
      await bcrypt.compare("Saei@2026", u.password)
    );
  }
  // List recent audit logs
  const logs = await p.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("\n--- AuditLog (recent 5) ---");
  console.log(JSON.stringify(logs, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
