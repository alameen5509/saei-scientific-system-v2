// نشر إعلان: ينقله من DRAFT إلى PUBLISHED + يحدث publishedAt
// + يُشعر منسقي الأبحاث (إعلان منشور)
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { notifyRole } from "@/lib/notify";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function POST(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const a = await prisma.announcement.findFirst({
    where: { id: params.id, deletedAt: null },
  });
  if (!a) {
    return NextResponse.json(
      { ok: false, error: "غير موجود" },
      { status: 404 }
    );
  }
  if (a.status !== "DRAFT") {
    return NextResponse.json(
      { ok: false, error: "الإعلان ليس في حالة المسودة" },
      { status: 400 }
    );
  }

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: "ANNOUNCEMENT_UPDATE",
      actorId: me.id,
      targetId: updated.id,
      metadata: { event: "publish" },
    },
  });

  // إخطار منسقي الأبحاث وغيرهم بأن إعلاناً جديداً نُشر
  await notifyRole("RESEARCH_COORDINATOR", {
    kind: "ANNOUNCEMENT_PUBLISHED",
    title: `إعلان جديد: ${updated.title}`,
    body: a.body.slice(0, 240),
    link: `/announcements`,
  });

  return NextResponse.json({ ok: true, announcement: updated });
}
