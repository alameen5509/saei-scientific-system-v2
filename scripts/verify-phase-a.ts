// تحقّق من حالة قاعدة البيانات بعد Phase A
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

(async () => {
  let url = process.env.DATABASE_URL!.replace(/[?&]sslmode=[^&]*/g, "").replace(
    /\?$/,
    ""
  );
  const p = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    }),
  });

  console.log("📊 ١) WorkflowStage:");
  const stages = await p.workflowStage.findMany({ orderBy: { order: "asc" } });
  stages.forEach((s) =>
    console.log(`   ${String(s.order).padStart(2)}. ${s.code.padEnd(22)} → ${s.label}`)
  );
  console.log(`   إجمالي: ${stages.length}\n`);

  console.log("📊 ٢) WorkSubmission count:", await p.workSubmission.count());
  console.log("📊 ٣) Notification count:", await p.notification.count());
  console.log("📊 ٤) Contract count:", await p.contract.count());

  console.log("\n📊 ٥) آخر ٣ إشعارات:");
  const ns = await p.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  ns.forEach((n) =>
    console.log(`   [${n.kind}] ${n.title} (read=${!!n.readAt})`)
  );

  console.log("\n📊 ٦) أعمال متأخرة (للـcron):");
  const overdue = await p.scientificWork.count({
    where: {
      stageCode: { notIn: ["PUBLISHED", "ARCHIVED"] },
      deadline: { lt: new Date() },
    },
  });
  console.log(`   ${overdue} عمل`);

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
