// تحديث/حذف قاعدة تصاعد
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};
  for (const k of [
    "name",
    "kind",
    "triggerAfterHours",
    "level",
    "escalateToRoles",
    "emailEnabled",
    "smsEnabled",
    "active",
  ]) {
    if (k in body) allowed[k] = body[k];
  }
  const r = await prisma.escalationRule.update({
    where: { id: params.id },
    data: allowed,
  });
  return NextResponse.json({ ok: true, rule: r });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  await prisma.escalationRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
