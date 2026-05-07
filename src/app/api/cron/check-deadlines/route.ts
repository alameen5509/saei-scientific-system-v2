// GET /api/cron/check-deadlines
// — يُشغَّل بـVercel Cron (انظر vercel.json)
// — يولّد إشعارات للمواعيد المقتربة (≤ ٧ أيام) والمتأخرة
// — مصادقة عبر Bearer CRON_SECRET (Vercel يضيف الهيدر تلقائياً)
// — placeholder للبريد عبر emailPlaceholder (يُستبدل بـResend لاحقاً)
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify, emailPlaceholder } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Active stages — لا نُذكِّر بأعمال منشورة/مؤرشفة
const ACTIVE_STAGES = [
  "PROPOSED",
  "RESEARCH",
  "WRITING",
  "FIRST_SUBMISSION",
  "UNDER_REVIEW",
  "REVIEW_FEEDBACK",
  "REVISION_REQUESTED",
  "REVISED_SUBMISSION",
  "APPROVED",
  "IN_PRODUCTION",
];

const APPROACH_DAYS = 7;

export async function GET(req: NextRequest) {
  // — مصادقة Vercel Cron —
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  if (expected && auth !== expected) {
    return NextResponse.json(
      { ok: false, error: "غير مصرّح" },
      { status: 401 }
    );
  }

  const now = new Date();
  const inWeek = new Date(now.getTime() + APPROACH_DAYS * 86400_000);

  // — أعمال متأخرة —
  const overdue = await prisma.scientificWork.findMany({
    where: {
      stageCode: { in: ACTIVE_STAGES },
      deadline: { lt: now },
    },
    include: {
      researcher: {
        select: {
          userId: true,
          displayName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  // — أعمال موعدها بعد ≤ ٧ أيام (وليست متأخرة) —
  const approaching = await prisma.scientificWork.findMany({
    where: {
      stageCode: { in: ACTIVE_STAGES },
      deadline: { gte: now, lte: inWeek },
    },
    include: {
      researcher: {
        select: {
          userId: true,
          displayName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  let notified = 0;

  // dedup: لا نولّد نفس الإشعار في آخر ٢٤ ساعة
  const yesterday = new Date(now.getTime() - 86400_000);

  for (const w of overdue) {
    const exists = await prisma.notification.findFirst({
      where: {
        userId: w.researcher.userId,
        kind: "DEADLINE_OVERDUE",
        createdAt: { gte: yesterday },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: { path: ["workId"], equals: w.id } as any,
      },
    });
    if (exists) continue;

    await notify({
      userId: w.researcher.userId,
      kind: "DEADLINE_OVERDUE",
      title: `تجاوز الموعد النهائي: "${w.title}"`,
      body: `الموعد كان ${w.deadline.toISOString().slice(0, 10)} — يُرجى التحديث.`,
      link: `/projects?work=${w.id}`,
      metadata: { workId: w.id },
    });
    if (w.researcher.user.email) {
      emailPlaceholder(
        w.researcher.user.email,
        `تجاوز الموعد النهائي للعمل: ${w.title}`,
        `الموعد كان ${w.deadline.toISOString().slice(0, 10)}.`
      );
    }
    notified++;
  }

  for (const w of approaching) {
    const exists = await prisma.notification.findFirst({
      where: {
        userId: w.researcher.userId,
        kind: "DEADLINE_APPROACHING",
        createdAt: { gte: yesterday },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: { path: ["workId"], equals: w.id } as any,
      },
    });
    if (exists) continue;

    const days = Math.max(
      1,
      Math.ceil((w.deadline.getTime() - now.getTime()) / 86400_000)
    );
    await notify({
      userId: w.researcher.userId,
      kind: "DEADLINE_APPROACHING",
      title: `الموعد النهائي قارب: "${w.title}"`,
      body: `يتبقّى ${days} يوم/أيام (ينتهي ${w.deadline.toISOString().slice(0, 10)}).`,
      link: `/projects?work=${w.id}`,
      metadata: { workId: w.id, daysLeft: days },
    });
    if (w.researcher.user.email) {
      emailPlaceholder(
        w.researcher.user.email,
        `تذكير بموعد العمل: ${w.title}`,
        `يتبقّى ${days} يوم/أيام للموعد النهائي.`
      );
    }
    notified++;
  }

  return NextResponse.json({
    ok: true,
    overdue: overdue.length,
    approaching: approaching.length,
    notified,
    runAt: now.toISOString(),
  });
}
