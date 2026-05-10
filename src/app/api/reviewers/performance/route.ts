// GET /api/reviewers/performance — مقاييس أداء كل محكم
// — متوسط زمن الاستجابة (assignedAt → submittedAt)
// — معدل القبول vs الاعتذار
// — إجمالي المُسنَد/المُكتمَل
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "JOURNAL_COORDINATOR"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const reviewers = await prisma.reviewer.findMany({
    include: {
      user: { select: { name: true, email: true } },
      reviews: {
        select: {
          status: true,
          assignedAt: true,
          submittedAt: true,
          declinedAt: true,
        },
      },
    },
  });

  const rows = reviewers.map((r) => {
    const submitted = r.reviews.filter(
      (rv) => rv.status === "SUBMITTED" && rv.submittedAt
    );
    const declined = r.reviews.filter((rv) => rv.status === "DECLINED");
    const inProgress = r.reviews.filter(
      (rv) => rv.status === "ASSIGNED" || rv.status === "IN_PROGRESS"
    );

    // متوسط زمن الاستجابة بالأيام
    let avgResponseDays: number | null = null;
    if (submitted.length > 0) {
      const total = submitted.reduce((sum, rv) => {
        const ms =
          new Date(rv.submittedAt!).getTime() -
          new Date(rv.assignedAt).getTime();
        return sum + ms;
      }, 0);
      avgResponseDays = Math.round(total / submitted.length / 86400_000);
    }

    const totalCompleted = submitted.length + declined.length;
    const declineRate =
      totalCompleted > 0
        ? Math.round((declined.length / totalCompleted) * 100)
        : 0;
    const completionRate =
      r.reviews.length > 0
        ? Math.round((submitted.length / r.reviews.length) * 100)
        : 0;

    return {
      id: r.id,
      name: r.user.name ?? r.user.email,
      email: r.user.email,
      active: r.active,
      specialties: r.specialties,
      totalAssigned: r.reviews.length,
      totalSubmitted: submitted.length,
      totalDeclined: declined.length,
      totalInProgress: inProgress.length,
      avgResponseDays,
      declineRate,
      completionRate,
    };
  });

  // ترتيب: الأكثر إنجازاً أولاً
  rows.sort((a, b) => b.totalSubmitted - a.totalSubmitted);

  return NextResponse.json({ ok: true, performance: rows });
}
