// POST /api/admin/impersonate/[userId]
// — يبدأ جلسة انتحال للأدمن الحالي على المستخدم المستهدف
// — لا يكتب في الـtoken مباشرة؛ يُسجِّل فقط في AuditLog ويرجع نجاح
//   ثم تستدعي الواجهة update({ impersonate }) لتحديث الجلسة
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: { userId: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);

  // يجب أن يكون مسجَّلاً
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "غير مصرّح بالوصول" },
      { status: 401 }
    );
  }

  // فقط ADMIN — والأهم: ليس انتحالاً قائماً (منع تصعيد الصلاحيات)
  if (session.user.role !== "ADMIN" || session.impersonator) {
    return NextResponse.json(
      { ok: false, error: "غير مسموح — يلزم صلاحية مدير النظام الحقيقية" },
      { status: 403 }
    );
  }

  const targetId = params.userId;
  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json(
      { ok: false, error: "معرّف المستخدم غير صالح" },
      { status: 400 }
    );
  }

  if (targetId === session.user.id) {
    return NextResponse.json(
      { ok: false, error: "لا يمكن انتحال نفسك" },
      { status: 400 }
    );
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { ok: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // منع انتحال أدمن آخر — لا تصعيد ولا انتحال متبادل
    if (target.role === "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "لا يمكن انتحال حساب مدير آخر" },
        { status: 403 }
      );
    }

    // التقاط IP و User-Agent للتدقيق
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    await prisma.auditLog.create({
      data: {
        action: "IMPERSONATE_START",
        actorId: session.user.id,
        targetId: target.id,
        ip,
        userAgent,
        metadata: {
          targetEmail: target.email,
          targetName: target.name,
          targetRole: target.role,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      target: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
      },
    });
  } catch (err) {
    console.error("POST /api/admin/impersonate/[userId]", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر بدء جلسة الانتحال" },
      { status: 500 }
    );
  }
}
