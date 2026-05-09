// إعدادات النظام — قراءة/كتابة JSON أزواج key/value
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
  const all = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ ok: true, settings: all });
}

export async function PUT(req: NextRequest) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = (await req.json()) as {
    items: { key: string; value: unknown; description?: string }[];
  };
  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { ok: false, error: "format invalid" },
      { status: 400 }
    );
  }
  const written: string[] = [];
  for (const it of body.items) {
    if (!it.key || typeof it.key !== "string") continue;
    await prisma.systemSetting.upsert({
      where: { key: it.key },
      create: {
        key: it.key,
        value: it.value as never,
        description: it.description ?? null,
        updatedById: me.id,
      },
      update: {
        value: it.value as never,
        description: it.description ?? null,
        updatedById: me.id,
      },
    });
    written.push(it.key);
  }
  await prisma.auditLog.create({
    data: {
      action: "SETTINGS_UPDATE",
      actorId: me.id,
      metadata: { keys: written },
    },
  });
  return NextResponse.json({ ok: true, count: written.length });
}
