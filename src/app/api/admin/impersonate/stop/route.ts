// POST /api/admin/impersonate/stop
// — يُنهي جلسة انتحال نشطة ويُسجِّل IMPERSONATE_END
// — الواجهة بعد الاستدعاء تنادي update({ stopImpersonate: true })
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "غير مصرّح بالوصول" },
      { status: 401 }
    );
  }

  // يجب أن تكون هناك جلسة انتحال قائمة
  if (!session.impersonator) {
    return NextResponse.json(
      { ok: false, error: "لا توجد جلسة انتحال نشطة" },
      { status: 400 }
    );
  }

  const adminId = session.impersonator.id;
  const targetId = session.user.id;

  try {
    // إيجاد آخر سجل IMPERSONATE_START مفتوح لهذا الأدمن→الهدف
    const openLog = await prisma.auditLog.findFirst({
      where: {
        action: "IMPERSONATE_START",
        actorId: adminId,
        targetId,
        endedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    if (openLog) {
      await prisma.auditLog.update({
        where: { id: openLog.id },
        data: { endedAt: now },
      });
    }

    // سجل IMPERSONATE_END مستقل لتسهيل الاستعلام
    await prisma.auditLog.create({
      data: {
        action: "IMPERSONATE_END",
        actorId: adminId,
        targetId,
        createdAt: now,
        endedAt: now,
        metadata: openLog
          ? { startLogId: openLog.id }
          : { note: "no matching start log" },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/impersonate/stop", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر إنهاء جلسة الانتحال" },
      { status: 500 }
    );
  }
}
