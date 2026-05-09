// تحديث/حذف ناعم لناشر
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const k of [
    "name",
    "city",
    "country",
    "contactName",
    "contactPhone",
    "contactEmail",
    "rating",
    "notes",
    "active",
  ]) {
    if (k in body) allowed[k] = body[k];
  }
  const updated = await prisma.publisher.update({
    where: { id: params.id },
    data: allowed,
  });
  await prisma.auditLog.create({
    data: {
      action: "PUBLISHER_UPDATE",
      actorId: me.id,
      targetId: updated.id,
    },
  });
  return NextResponse.json({ ok: true, publisher: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  await prisma.publisher.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), active: false },
  });
  return NextResponse.json({ ok: true });
}
