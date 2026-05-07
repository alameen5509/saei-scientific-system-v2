// POST /api/notifications/read-all — تأشير كل إشعارات المستخدم كمقروءة
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST() {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const r = await prisma.notification.updateMany({
    where: { userId: me.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true, count: r.count });
}
