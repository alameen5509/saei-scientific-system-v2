// إدارة الهوية البصرية — singleton (صف واحد per tenant)
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT = "saei";

// GET — متاح لكل المسجَّلين (يحتاج التطبيق قراءة الألوان)
export async function GET() {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const setting = await prisma.brandSetting.findUnique({
    where: { tenantId: TENANT },
  });
  return NextResponse.json({
    ok: true,
    branding: setting ?? {
      primaryColor: "#5E5495",
      secondaryColor: "#00D4DD",
      accentColor: "#C9A84C",
      fontFamily: "Cairo",
      logoUrl: null,
    },
  });
}

export async function PUT(req: NextRequest) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};
  for (const k of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "logoUrl",
    "fontFamily",
  ]) {
    if (k in body) allowed[k] = body[k];
  }
  // تحقق بسيط من صيغة الألوان
  for (const k of ["primaryColor", "secondaryColor", "accentColor"]) {
    if (k in allowed) {
      const v = allowed[k] as string;
      if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) {
        return NextResponse.json(
          { ok: false, error: `لون غير صالح في ${k}` },
          { status: 400 }
        );
      }
    }
  }

  const updated = await prisma.brandSetting.upsert({
    where: { tenantId: TENANT },
    create: {
      tenantId: TENANT,
      primaryColor: (allowed.primaryColor as string) ?? "#5E5495",
      secondaryColor: (allowed.secondaryColor as string) ?? "#00D4DD",
      accentColor: (allowed.accentColor as string) ?? "#C9A84C",
      logoUrl: (allowed.logoUrl as string | null) ?? null,
      fontFamily: (allowed.fontFamily as string) ?? "Cairo",
      updatedById: me.id,
    },
    update: { ...allowed, updatedById: me.id },
  });
  await prisma.auditLog.create({
    data: {
      action: "BRAND_UPDATE",
      actorId: me.id,
      metadata: allowed as never,
    },
  });
  return NextResponse.json({ ok: true, branding: updated });
}

export async function DELETE() {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  await prisma.brandSetting.deleteMany({ where: { tenantId: TENANT } });
  return NextResponse.json({ ok: true });
}
