// قراءة سجل التدقيق — للمدير فقط
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") ?? undefined;
  const actorId = sp.get("actorId") ?? undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  const search = sp.get("search") ?? undefined;
  const limit = Math.min(Number(sp.get("limit") ?? 100), 500);

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (actorId) where.actorId = actorId;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.createdAt = range;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // تخصيب: جلب أسماء المستخدمين
  const userIds = Array.from(
    new Set(logs.flatMap((l) => [l.actorId, l.targetId].filter(Boolean) as string[]))
  );
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, role: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  let enriched = logs.map((l) => ({
    ...l,
    actor: userMap.get(l.actorId) ?? null,
    target: l.targetId ? userMap.get(l.targetId) ?? null : null,
  }));

  // Search filter (بسيط، client-side قبل الإرسال)
  if (search) {
    const q = search.toLowerCase();
    enriched = enriched.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.actor?.name ?? "").toLowerCase().includes(q) ||
        (l.actor?.email ?? "").toLowerCase().includes(q) ||
        JSON.stringify(l.metadata ?? {}).toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ ok: true, logs: enriched });
}
