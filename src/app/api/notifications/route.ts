// GET /api/notifications — آخر ٢٠ إشعار للمستخدم الحالي + عدد غير المقروء
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 20;

export async function GET() {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.notification.count({
      where: { userId: me.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ ok: true, items, unread });
}
