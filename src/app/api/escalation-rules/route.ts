// قواعد التصاعد — CRUD
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const rules = await prisma.escalationRule.findMany({
    orderBy: [{ kind: "asc" }, { level: "asc" }],
  });
  return NextResponse.json({ ok: true, rules });
}

export async function POST(req: NextRequest) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const created = await prisma.escalationRule.create({
    data: {
      name: (body.name as string) ?? "قاعدة بدون اسم",
      kind: body.kind as never,
      triggerAfterHours:
        typeof body.triggerAfterHours === "number"
          ? (body.triggerAfterHours as number)
          : 24,
      level: typeof body.level === "number" ? (body.level as number) : 1,
      escalateToRoles: Array.isArray(body.escalateToRoles)
        ? (body.escalateToRoles as string[])
        : [],
      emailEnabled: body.emailEnabled !== false,
      smsEnabled: body.smsEnabled === true,
      active: body.active !== false,
    },
  });
  return NextResponse.json({ ok: true, rule: created }, { status: 201 });
}
