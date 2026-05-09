// قائمة سجل SMS + إحصاءات تكلفة
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { isSmsConfigured } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireRole("ADMIN");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const [logs, sentCount, failedCount] = await Promise.all([
    prisma.smsLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.smsLog.count({ where: { status: "SENT" } }),
    prisma.smsLog.count({ where: { status: "FAILED" } }),
  ]);
  // مجموع التكلفة (تحويل Decimal إلى Number)
  const sumAgg = await prisma.smsLog.aggregate({
    _sum: { cost: true },
    where: { status: "SENT" },
  });
  return NextResponse.json({
    ok: true,
    configured: isSmsConfigured(),
    logs,
    stats: {
      sent: sentCount,
      failed: failedCount,
      totalCost: sumAgg._sum.cost ? Number(sumAgg._sum.cost) : 0,
    },
  });
}
