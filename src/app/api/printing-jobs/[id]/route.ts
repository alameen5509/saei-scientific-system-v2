// تحديث أمر طباعة + نقل المرحلة + إخطار
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { notifyRole } from "@/lib/notify";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

const STAGE_LABEL: Record<string, string> = {
  FILE_RECEIVED: "استلام الملف",
  DESIGN_REVIEW: "مراجعة التصميم",
  PRINTING: "قيد الطباعة",
  FINAL_DELIVERY: "تسليم نهائي",
};
const STAGE_TIMESTAMP: Record<string, string> = {
  FILE_RECEIVED: "receivedAt",
  DESIGN_REVIEW: "designReviewAt",
  PRINTING: "printingAt",
  FINAL_DELIVERY: "deliveredAt",
};

export async function PUT(req: NextRequest, { params }: Params) {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "PRINTING_MANAGER"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const k of [
    "stage",
    "copies",
    "cost",
    "expectedDeliveryAt",
    "notes",
  ]) {
    if (k in body) allowed[k] = body[k];
  }
  if ("expectedDeliveryAt" in allowed) {
    allowed.expectedDeliveryAt =
      typeof allowed.expectedDeliveryAt === "string"
        ? new Date(allowed.expectedDeliveryAt as string)
        : null;
  }
  if ("cost" in allowed && typeof allowed.cost === "number") {
    allowed.cost = (allowed.cost as number).toString();
  }
  // عند تغيير المرحلة ضع timestamp المناسب
  if (typeof allowed.stage === "string") {
    const tsField = STAGE_TIMESTAMP[allowed.stage];
    if (tsField) {
      allowed[tsField] = new Date();
    }
  }

  const updated = await prisma.printingJob.update({
    where: { id: params.id },
    data: allowed,
  });

  if (typeof allowed.stage === "string") {
    await prisma.auditLog.create({
      data: {
        action: "PRINTING_STAGE_ADVANCE",
        actorId: me.id,
        targetId: updated.id,
        metadata: { stage: updated.stage, workId: updated.workId },
      },
    });
    // إخطار المنسقين بنقل مرحلة الطباعة
    const work = await prisma.scientificWork.findUnique({
      where: { id: updated.workId },
      select: { title: true },
    });
    if (work) {
      await notifyRole("RESEARCH_COORDINATOR", {
        kind: "PRINTING_STAGE_CHANGED",
        title: `الطباعة: ${work.title}`,
        body: `انتقلت إلى مرحلة "${
          STAGE_LABEL[updated.stage] ?? updated.stage
        }"`,
        link: `/publishing`,
      });
    }
    // إن وصلت إلى FINAL_DELIVERY ندفع العمل العلمي إلى PUBLISHED
    if (updated.stage === "FINAL_DELIVERY") {
      await prisma.scientificWork.update({
        where: { id: updated.workId },
        data: { stageCode: "PUBLISHED", progress: 100 },
      });
    }
  }

  return NextResponse.json({ ok: true, job: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  await prisma.printingJob.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
