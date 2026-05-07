// GET    /api/contracts/[id] — عقد محدد
// PATCH  /api/contracts/[id] — تحديث الحقول الأساسية
// DELETE /api/contracts/[id] — حذف عقد (DRAFT/CANCELLED فقط)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { serializeContract } from "@/lib/contracts-service";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function GET(_: Request, { params }: Params) {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "JOURNAL_COORDINATOR"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const c = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { work: { select: { id: true, code: true, title: true } } },
  });
  if (!c) {
    return NextResponse.json(
      { ok: false, error: "العقد غير موجود" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    contract: { ...serializeContract(c), work: c.work },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "JOURNAL_COORDINATOR"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const existing = await prisma.contract.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "العقد غير موجود" },
      { status: 404 }
    );
  }

  // العقد الموقَّع لا يُعدَّل في حقول جوهرية
  if (existing.status === "SIGNED" || existing.status === "EXPIRED") {
    return NextResponse.json(
      { ok: false, error: "لا يمكن تعديل عقد منتهي/موقَّع" },
      { status: 400 }
    );
  }

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const k of ["title", "body", "partyName", "partyEmail", "currency"] as const) {
    if (typeof body[k] === "string") data[k] = body[k];
  }
  if (typeof body.value === "number" && body.value >= 0) data.value = body.value;
  if (typeof body.startsAt === "string")
    data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (typeof body.endsAt === "string")
    data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (Array.isArray(body.milestones)) data.milestones = body.milestones;

  const updated = await prisma.contract.update({
    where: { id: params.id },
    data,
    include: { work: { select: { id: true, code: true, title: true } } },
  });
  return NextResponse.json({
    ok: true,
    contract: { ...serializeContract(updated), work: updated.work },
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const c = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!c) {
    return NextResponse.json(
      { ok: false, error: "العقد غير موجود" },
      { status: 404 }
    );
  }
  if (c.status !== "DRAFT" && c.status !== "CANCELLED") {
    return NextResponse.json(
      { ok: false, error: "يمكن حذف عقود المسودة الملغاة فقط" },
      { status: 400 }
    );
  }
  await prisma.contract.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
