// GET    /api/works/[id]  — جلب عمل محدد
// PUT    /api/works/[id]  — تحديث عمل
// DELETE /api/works/[id]  — حذف عمل
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";
import {
  findOrCreateResearcherByName,
  serializeWork,
  validateWorkInput,
} from "@/lib/works-service";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

const MANAGE_ROLES = ["ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR"] as const;

export async function GET(_: Request, { params }: Params) {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  try {
    const work = await prisma.scientificWork.findUnique({
      where: { id: params.id },
      include: { researcher: { select: { displayName: true, userId: true } } },
    });
    if (!work) {
      return NextResponse.json(
        { ok: false, error: "العمل غير موجود" },
        { status: 404 }
      );
    }
    // الباحث لا يستطيع قراءة عمل غير خاص به
    if (me.role === "RESEARCHER" && work.researcher.userId !== me.id) {
      return NextResponse.json(
        { ok: false, error: "غير مسموح بالوصول لهذا العمل" },
        { status: 403 }
      );
    }
    return NextResponse.json({ ok: true, work: serializeWork(work) });
  } catch (err) {
    console.error("GET /api/works/[id]", err);
    return NextResponse.json(
      { ok: false, error: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Params) {
  const me = await requireRole(...MANAGE_ROLES);
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  try {
    const exists = await prisma.scientificWork.findUnique({
      where: { id: params.id },
    });
    if (!exists) {
      return NextResponse.json(
        { ok: false, error: "العمل غير موجود" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const v = validateWorkInput(body);
    if (!v.ok) {
      return NextResponse.json(
        { ok: false, error: v.error },
        { status: 400 }
      );
    }
    const data = v.data;
    const researcherId = await findOrCreateResearcherByName(data.researcher);

    const updated = await prisma.scientificWork.update({
      where: { id: params.id },
      data: {
        title: data.title,
        specialty: data.specialty,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        track: data.track as any,
        researcherId,
        stageCode: data.stage,
        progress: data.progress,
        startedAt: new Date(data.startedAt),
        deadline: new Date(data.deadline),
        notes: data.notes ?? null,
        // الرمز قد يبقى أو يتغيّر إن وفّره العميل
        ...(data.code && data.code !== exists.code
          ? { code: data.code }
          : {}),
      },
      include: { researcher: { select: { displayName: true } } },
    });

    return NextResponse.json({ ok: true, work: serializeWork(updated) });
  } catch (err) {
    console.error("PUT /api/works/[id]", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر تحديث العمل" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const me = await requireRole(...MANAGE_ROLES);
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  try {
    await prisma.scientificWork.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (err as any)?.code;
    if (code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "العمل غير موجود" },
        { status: 404 }
      );
    }
    console.error("DELETE /api/works/[id]", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر حذف العمل" },
      { status: 500 }
    );
  }
}
