// تفضيلات إشعارات المستخدم — GET المالك / PUT تحديث جماعي
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_KINDS = [
  "STAGE_CHANGED",
  "REVIEW_ASSIGNED",
  "REVIEW_SUBMITTED",
  "SUBMISSION_RECEIVED",
  "DEADLINE_APPROACHING",
  "DEADLINE_OVERDUE",
  "CONTRACT_SIGNED",
  "CONTRACT_SENT",
  "ANNOUNCEMENT_PUBLISHED",
  "APPLICANT_ACCEPTED",
  "APPLICANT_REJECTED",
  "PRINTING_STAGE_CHANGED",
  "REPORT_READY",
  "GENERIC",
] as const;

export async function GET() {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: me.id },
  });
  // أكمل القائمة بـdefaults للأنواع التي ليس لها سجل بعد
  const map = new Map(prefs.map((p) => [p.kind, p]));
  const all = ALL_KINDS.map((k) => {
    const existing = map.get(k as never);
    return {
      kind: k,
      inApp: existing?.inApp ?? true,
      email: existing?.email ?? true,
    };
  });
  return NextResponse.json({ ok: true, preferences: all });
}

export async function PUT(req: NextRequest) {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = (await req.json()) as {
    preferences: { kind: string; inApp: boolean; email: boolean }[];
  };
  if (!Array.isArray(body.preferences)) {
    return NextResponse.json(
      { ok: false, error: "format invalid" },
      { status: 400 }
    );
  }
  for (const p of body.preferences) {
    if (!ALL_KINDS.includes(p.kind as never)) continue;
    await prisma.notificationPreference.upsert({
      where: { userId_kind: { userId: me.id, kind: p.kind as never } },
      create: {
        userId: me.id,
        kind: p.kind as never,
        inApp: !!p.inApp,
        email: !!p.email,
      },
      update: {
        inApp: !!p.inApp,
        email: !!p.email,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
