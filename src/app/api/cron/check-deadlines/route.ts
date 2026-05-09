// GET /api/cron/check-deadlines
// — يُشغَّل بـVercel Cron (انظر vercel.json)
// — يولّد إشعارات للمواعيد المقتربة (≤ ٧ أيام) والمتأخرة
// — مصادقة عبر Bearer CRON_SECRET (Vercel يضيف الهيدر تلقائياً)
// — placeholder للبريد عبر emailPlaceholder (يُستبدل بـResend لاحقاً)
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { templates } from "@/lib/email";

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

    const tpl = templates.deadlineOverdue({
      workTitle: w.title,
      workId: w.id,
      deadline: w.deadline.toISOString().slice(0, 10),
    });
    await notify({
      userId: w.researcher.userId,
      kind: "DEADLINE_OVERDUE",
      title: tpl.subject,
      body: `الموعد كان ${w.deadline.toISOString().slice(0, 10)} — يُرجى التحديث.`,
      link: `/projects?work=${w.id}`,
      metadata: { workId: w.id },
      email: tpl,
    });
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
    const tpl = templates.deadlineApproaching({
      workTitle: w.title,
      workId: w.id,
      daysLeft: days,
      deadline: w.deadline.toISOString().slice(0, 10),
    });
    await notify({
      userId: w.researcher.userId,
      kind: "DEADLINE_APPROACHING",
      title: tpl.subject,
      body: `يتبقّى ${days} يوم/أيام (ينتهي ${w.deadline.toISOString().slice(0, 10)}).`,
      link: `/projects?work=${w.id}`,
      metadata: { workId: w.id, daysLeft: days },
      email: tpl,
    });
    notified++;
  }

  // ——— Phase D: تطبيق قواعد التصاعد ———
  const escalations = await applyEscalationRules(now);

  return NextResponse.json({
    ok: true,
    overdue: overdue.length,
    approaching: approaching.length,
    notified,
    escalations,
    runAt: now.toISOString(),
  });
}

// ============================================================
// تطبيق قواعد التصاعد على الإشعارات غير المقروءة
// — لكل قاعدة نشطة: ابحث عن إشعارات من نفس النوع لم تُقرأ منذ triggerAfterHours
// — للمستلمين الأصليين، أعد إرسال الإشعار للأدوار المُحدَّدة في القاعدة
// ============================================================
async function applyEscalationRules(now: Date): Promise<{
  rulesApplied: number;
  notificationsEscalated: number;
}> {
  const rules = await prisma.escalationRule.findMany({
    where: { active: true },
  });
  let notificationsEscalated = 0;

  for (const rule of rules) {
    const cutoff = new Date(
      now.getTime() - rule.triggerAfterHours * 3600_000
    );
    // إشعارات من النوع نفسه، غير مقروءة، وأقدم من cutoff
    const stale = await prisma.notification.findMany({
      where: {
        kind: rule.kind,
        readAt: null,
        createdAt: { lt: cutoff },
        // metadata لا يحوي escalatedAt بعد
      },
      take: 100,
    });
    if (stale.length === 0) continue;

    // مَن نُخطر: المستخدمون بالأدوار الموجودة في القاعدة
    if (rule.escalateToRoles.length === 0) continue;
    const recipients = await prisma.user.findMany({
      where: { role: { in: rule.escalateToRoles as never } },
      select: { id: true, email: true },
    });
    if (recipients.length === 0) continue;

    for (const n of stale) {
      // dedup: نتجنّب التصاعد إن كان metadata يحوي escalatedLevel >= rule.level
      const meta = (n.metadata ?? {}) as Record<string, unknown>;
      const prevLevel = (meta.escalatedLevel as number | undefined) ?? 0;
      if (prevLevel >= rule.level) continue;

      // أنشئ إشعار تصاعد لكل مستلم
      for (const u of recipients) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            kind: rule.kind,
            title: `[تصاعد L${rule.level}] ${n.title}`,
            body: `لم يُقرأ هذا الإشعار منذ ${rule.triggerAfterHours} ساعة. ${n.body ?? ""}`,
            link: n.link ?? null,
            metadata: {
              escalatedFrom: n.id,
              escalatedLevel: rule.level,
              ruleId: rule.id,
            },
          },
        });
      }

      // تحديث الإشعار الأصلي بالـlevel للوقاية من التصاعد المتكرّر
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          metadata: {
            ...meta,
            escalatedLevel: rule.level,
            escalatedAt: now.toISOString(),
          },
        },
      });

      // AuditLog
      await prisma.auditLog.create({
        data: {
          action: "ESCALATION_TRIGGERED",
          actorId: "system",
          metadata: {
            notificationId: n.id,
            ruleId: rule.id,
            level: rule.level,
            kind: rule.kind,
            recipientCount: recipients.length,
          },
        },
      });

      notificationsEscalated++;
    }
  }

  return {
    rulesApplied: rules.length,
    notificationsEscalated,
  };
}
