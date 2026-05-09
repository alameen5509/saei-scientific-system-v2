// أوامر طباعة لكل عمل علمي — list/create
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "PRINTING_MANAGER"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  // PrintingJob لا يحوي علاقة work مباشرة في schema (workId @unique)؛
  // نجلب work بـid يدوياً لتقليل تعقيد العلاقات
  const jobs = await prisma.printingJob.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { publisher: { select: { id: true, name: true } } },
  });
  const workIds = Array.from(new Set(jobs.map((j) => j.workId)));
  const works = workIds.length
    ? await prisma.scientificWork.findMany({
        where: { id: { in: workIds } },
        select: { id: true, code: true, title: true, stageCode: true },
      })
    : [];
  const workMap = new Map(works.map((w) => [w.id, w]));
  const enriched = jobs.map((j) => ({
    ...j,
    work: workMap.get(j.workId) ?? null,
  }));
  return NextResponse.json({ ok: true, jobs: enriched });
}

export async function POST(req: NextRequest) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const b = await req.json();
  const {
    workId,
    publisherId,
    copies,
    cost,
    expectedDeliveryAt,
    notes,
  } = b as Record<string, unknown>;
  if (!workId || typeof workId !== "string") {
    return NextResponse.json(
      { ok: false, error: "العمل العلمي مطلوب" },
      { status: 400 }
    );
  }
  if (!publisherId || typeof publisherId !== "string") {
    return NextResponse.json(
      { ok: false, error: "الناشر مطلوب" },
      { status: 400 }
    );
  }
  // توقّع وحدة طباعة لكل عمل (workId @unique)
  const exists = await prisma.printingJob.findUnique({ where: { workId } });
  if (exists) {
    return NextResponse.json(
      { ok: false, error: "يوجد أمر طباعة سابق لهذا العمل" },
      { status: 400 }
    );
  }
  const created = await prisma.printingJob.create({
    data: {
      workId,
      publisherId,
      copies: typeof copies === "number" ? copies : 0,
      cost: typeof cost === "number" ? cost.toString() : null,
      expectedDeliveryAt:
        typeof expectedDeliveryAt === "string"
          ? new Date(expectedDeliveryAt)
          : null,
      notes: typeof notes === "string" ? notes : null,
      receivedAt: new Date(),
    },
  });
  // رفع عداد الناشر
  await prisma.publisher.update({
    where: { id: publisherId },
    data: { totalJobs: { increment: 1 } },
  });
  return NextResponse.json({ ok: true, job: created }, { status: 201 });
}
