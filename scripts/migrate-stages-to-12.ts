// Migration: 7 → 12 stages
// — يضيف الـrows الجديدة في WorkflowStage
// — يحدّث ScientificWork.stageCode من الرموز القديمة إلى الجديدة
// — idempotent: يمكن تشغيله مرات متتالية بأمان
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { STAGE_LABEL, STAGE_ORDER } from "../src/types/works";

const LEGACY_MAP: Record<string, string> = {
  REVIEW: "UNDER_REVIEW",
  EDITING: "IN_PRODUCTION",
};

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

  console.log("🔄 Migration: 7 → 12 stages\n");

  // ————— 1. تحديث الأعمال التي تستخدم رموزاً قديمة قبل تغيير المراجع —————
  console.log("1️⃣ تحديث الأعمال من الرموز القديمة:");
  for (const [oldCode, newCode] of Object.entries(LEGACY_MAP)) {
    const oldStageExists = await p.workflowStage.findUnique({
      where: { code: oldCode },
    });
    if (!oldStageExists) {
      console.log(`   لا يوجد ${oldCode} في WorkflowStage — يُتجاهل.`);
      continue;
    }
    // قبل تحديث الأعمال، نحتاج للتأكد أنّ المرحلة الجديدة موجودة
    let newStageExists = await p.workflowStage.findUnique({
      where: { code: newCode },
    });
    if (!newStageExists) {
      // إدراج موقت ليكون المرجع متاحاً
      const tmpOrder = (
        await p.workflowStage.aggregate({ _max: { order: true } })
      )._max.order;
      newStageExists = await p.workflowStage.create({
        data: {
          code: newCode,
          label: STAGE_LABEL[newCode as keyof typeof STAGE_LABEL] ?? newCode,
          order: (tmpOrder ?? 0) + 100,
        },
      });
      console.log(`   أُضيف ${newCode} مؤقتاً للسماح بنقل الأعمال.`);
    }
    const r = await p.scientificWork.updateMany({
      where: { stageCode: oldCode },
      data: { stageCode: newCode },
    });
    console.log(`   ${oldCode} → ${newCode}: حُدِّث ${r.count} عمل.`);
  }

  // ————— 2. حذف المراحل القديمة —————
  console.log("\n2️⃣ حذف المراحل القديمة:");
  for (const oldCode of Object.keys(LEGACY_MAP)) {
    const inUse = await p.scientificWork.count({
      where: { stageCode: oldCode },
    });
    if (inUse > 0) {
      console.log(`   ${oldCode}: لا يزال مستخدماً (${inUse}) — تخطّي`);
      continue;
    }
    try {
      await p.workflowStage.delete({ where: { code: oldCode } });
      console.log(`   حُذف ${oldCode}.`);
    } catch {
      console.log(`   ${oldCode}: غير موجود — تخطّي.`);
    }
  }

  // ————— 3. ضمان وجود كل المراحل الـ١٢ بأرقام order صحيحة —————
  console.log("\n3️⃣ مزامنة المراحل الـ١٢:");
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const code = STAGE_ORDER[i];
    const order = i + 1;
    const label = STAGE_LABEL[code];
    await p.workflowStage.upsert({
      where: { code },
      update: { label, order },
      create: { code, label, order },
    });
    console.log(`   ${String(order).padStart(2)}. ${code.padEnd(22)} → ${label}`);
  }

  // ————— 4. التحقق النهائي —————
  console.log("\n4️⃣ التحقق:");
  const all = await p.workflowStage.findMany({ orderBy: { order: "asc" } });
  console.log(`   عدد المراحل: ${all.length} (المتوقّع: ${STAGE_ORDER.length})`);
  const orphans = await p.scientificWork.findMany({
    where: { stageCode: { notIn: STAGE_ORDER } },
    select: { id: true, code: true, stageCode: true },
  });
  console.log(`   أعمال بمراحل يتيمة: ${orphans.length}`);
  if (orphans.length > 0) console.table(orphans);

  await p.$disconnect();
  console.log("\n✅ اكتملت الهجرة.");
})().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
