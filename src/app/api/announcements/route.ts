// إعلانات الأولويات البحثية — GET قائمة / POST إنشاء
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { sanitizeHtml } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status");
  const list = await prisma.announcement.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applicants: true } },
    },
  });
  return NextResponse.json({ ok: true, announcements: list });
}

export async function POST(req: NextRequest) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = await req.json();
  const {
    title,
    body: text,
    requirements,
    specialty,
    targetCount,
    applyDeadline,
  } = body as Record<string, unknown>;

  if (!title || typeof title !== "string" || title.length < 3) {
    return NextResponse.json(
      { ok: false, error: "العنوان مطلوب (٣ أحرف على الأقل)" },
      { status: 400 }
    );
  }
  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { ok: false, error: "نص الإعلان مطلوب" },
      { status: 400 }
    );
  }

  const created = await prisma.announcement.create({
    data: {
      title,
      body: sanitizeHtml(text),
      requirements:
        typeof requirements === "string" ? sanitizeHtml(requirements) : null,
      specialty: typeof specialty === "string" ? specialty : null,
      targetCount: typeof targetCount === "number" ? targetCount : 1,
      applyDeadline:
        typeof applyDeadline === "string" ? new Date(applyDeadline) : null,
      createdById: me.id,
      status: "DRAFT",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "ANNOUNCEMENT_CREATE",
      actorId: me.id,
      targetId: created.id,
      metadata: { title: created.title },
    },
  });

  return NextResponse.json({ ok: true, announcement: created }, { status: 201 });
}
