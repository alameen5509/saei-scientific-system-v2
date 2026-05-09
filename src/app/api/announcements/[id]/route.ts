// تفاصيل + تحديث + حذف ناعم لإعلان
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { sanitizeHtml } from "@/lib/sanitize";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function GET(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const a = await prisma.announcement.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { _count: { select: { applicants: true } } },
  });
  if (!a) {
    return NextResponse.json(
      { ok: false, error: "غير موجود" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, announcement: a });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const k of [
    "title",
    "body",
    "requirements",
    "specialty",
    "targetCount",
    "applyDeadline",
    "status",
  ]) {
    if (k in body) allowed[k] = body[k];
  }
  if ("applyDeadline" in allowed && typeof allowed.applyDeadline === "string") {
    allowed.applyDeadline = new Date(allowed.applyDeadline as string);
  }
  if ("body" in allowed && typeof allowed.body === "string") {
    allowed.body = sanitizeHtml(allowed.body as string);
  }
  if (
    "requirements" in allowed &&
    typeof allowed.requirements === "string"
  ) {
    allowed.requirements = sanitizeHtml(allowed.requirements as string);
  }

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: allowed,
  });

  await prisma.auditLog.create({
    data: {
      action: "ANNOUNCEMENT_UPDATE",
      actorId: me.id,
      targetId: updated.id,
      metadata: { fields: Object.keys(allowed) },
    },
  });

  return NextResponse.json({ ok: true, announcement: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  await prisma.announcement.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await prisma.auditLog.create({
    data: {
      action: "ANNOUNCEMENT_ARCHIVE",
      actorId: me.id,
      targetId: params.id,
    },
  });
  return NextResponse.json({ ok: true });
}
