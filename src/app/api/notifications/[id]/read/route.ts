// POST /api/notifications/[id]/read — تأشير إشعار كمقروء
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function POST(_: Request, { params }: Params) {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  // لا يستطيع المستخدم تأشير إشعار غيره
  const n = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!n || n.userId !== me.id) {
    return NextResponse.json(
      { ok: false, error: "الإشعار غير موجود" },
      { status: 404 }
    );
  }

  if (!n.readAt) {
    await prisma.notification.update({
      where: { id: params.id },
      data: { readAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
