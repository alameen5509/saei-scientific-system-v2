// تجميع المهام الشخصية لكل مستخدم — لا جدول جديد، يقرأ من الـmodels الموجودة
// — للباحث: تسليمات معلَّقة + مراجعات تحتاج رد
// — للمحكم: مراجعات مُسنَدة لم تُسلَّم
// — للمنسق/المدير: إسنادات معلَّقة، تسليمات جديدة، أعمال متأخرة
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";
import { STAGE_LABEL, type WorkStage } from "@/types/works";

export type TaskKind =
  | "PENDING_SUBMISSION"      // باحث: عمل في WRITING يحتاج تسليم أوّلي
  | "PENDING_REVISION"         // باحث: عمل في REVISION_REQUESTED يحتاج تسليم منقّح
  | "PENDING_REVIEW"           // محكم: مراجعة مُسنَدة لم تُسلَّم
  | "NEEDS_REVIEWER_ASSIGN"    // منسق: عمل في FIRST_SUBMISSION لا يحوي محكم بعد
  | "NEEDS_DECISION"           // منسق: كل المراجعات وصلت، يحتاج قرار
  | "OVERDUE_WORK"             // منسق: عمل متأخر تجاوز deadline
  | "NEW_SUBMISSION";          // منسق: تسليم جديد لم يُراجع بعد

export interface PersonalTask {
  id: string;
  kind: TaskKind;
  title: string;
  workTitle: string;
  workCode: string;
  workId: string;
  deadline?: string;
  daysLeft?: number;
  link: string;
  priority: "high" | "medium" | "low";
  metadata?: Record<string, string | number>;
}

const ACTIVE_STAGES: WorkStage[] = [
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

function days(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86400_000);
}

function priorityFromDays(d: number | undefined): "high" | "medium" | "low" {
  if (d === undefined) return "medium";
  if (d < 0) return "high";
  if (d <= 3) return "high";
  if (d <= 7) return "medium";
  return "low";
}

export async function loadPersonalTasks(args: {
  userId: string;
  role: UserRole;
}): Promise<PersonalTask[]> {
  const now = new Date();
  const tasks: PersonalTask[] = [];

  if (args.role === "RESEARCHER") {
    const r = await prisma.researcher.findUnique({
      where: { userId: args.userId },
      select: { id: true },
    });
    if (!r) return tasks;

    const myWorks = await prisma.scientificWork.findMany({
      where: {
        researcherId: r.id,
        stageCode: { in: ACTIVE_STAGES as never },
      },
      select: {
        id: true,
        code: true,
        title: true,
        stageCode: true,
        deadline: true,
      },
    });

    for (const w of myWorks) {
      const dLeft = days(now, new Date(w.deadline));
      if (w.stageCode === "WRITING") {
        tasks.push({
          id: `submit-${w.id}`,
          kind: "PENDING_SUBMISSION",
          title: "تسليم أوّلي مطلوب",
          workTitle: w.title,
          workCode: w.code,
          workId: w.id,
          deadline: w.deadline.toISOString(),
          daysLeft: dLeft,
          priority: priorityFromDays(dLeft),
          link: `/projects?work=${w.id}`,
        });
      } else if (w.stageCode === "REVISION_REQUESTED") {
        tasks.push({
          id: `revise-${w.id}`,
          kind: "PENDING_REVISION",
          title: "تسليم منقّح مطلوب (بعد ملاحظات)",
          workTitle: w.title,
          workCode: w.code,
          workId: w.id,
          deadline: w.deadline.toISOString(),
          daysLeft: dLeft,
          priority: priorityFromDays(dLeft),
          link: `/projects?work=${w.id}`,
        });
      }
    }
  }

  if (args.role === "REVIEWER") {
    const reviewer = await prisma.reviewer.findUnique({
      where: { userId: args.userId },
      select: { id: true },
    });
    if (!reviewer) return tasks;

    const reviews = await prisma.review.findMany({
      where: {
        reviewerId: reviewer.id,
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      },
      include: {
        work: { select: { id: true, code: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    for (const rv of reviews) {
      const dLeft = rv.dueDate ? days(now, new Date(rv.dueDate)) : undefined;
      tasks.push({
        id: `review-${rv.id}`,
        kind: "PENDING_REVIEW",
        title:
          rv.status === "IN_PROGRESS"
            ? "مراجعة قيد التحرير"
            : "مراجعة جديدة في انتظارك",
        workTitle: rv.work.title,
        workCode: rv.work.code,
        workId: rv.work.id,
        deadline: rv.dueDate?.toISOString(),
        daysLeft: dLeft,
        priority: priorityFromDays(dLeft),
        link: `/reviews/${rv.id}`,
      });
    }
  }

  if (
    args.role === "ADMIN" ||
    args.role === "RESEARCH_COORDINATOR" ||
    args.role === "JOURNAL_COORDINATOR"
  ) {
    // 1) أعمال تحتاج إسناد محكم (FIRST_SUBMISSION أو REVISED_SUBMISSION، بدون reviews ASSIGNED/IN_PROGRESS)
    const needsAssign = await prisma.scientificWork.findMany({
      where: {
        stageCode: { in: ["FIRST_SUBMISSION", "REVISED_SUBMISSION"] },
      },
      include: {
        reviews: { select: { id: true, status: true } },
      },
    });
    for (const w of needsAssign) {
      const activeReviews = w.reviews.filter(
        (r) => r.status === "ASSIGNED" || r.status === "IN_PROGRESS"
      );
      if (activeReviews.length === 0) {
        const dLeft = days(now, new Date(w.deadline));
        tasks.push({
          id: `assign-${w.id}`,
          kind: "NEEDS_REVIEWER_ASSIGN",
          title: "يحتاج إسناد محكم",
          workTitle: w.title,
          workCode: w.code,
          workId: w.id,
          deadline: w.deadline.toISOString(),
          daysLeft: dLeft,
          priority: priorityFromDays(dLeft),
          link: `/projects?work=${w.id}`,
        });
      }
    }

    // 2) أعمال جاهزة للقرار (UNDER_REVIEW وكل المراجعات SUBMITTED)
    const inReview = await prisma.scientificWork.findMany({
      where: { stageCode: "UNDER_REVIEW" },
      include: { reviews: { select: { status: true } } },
    });
    for (const w of inReview) {
      if (
        w.reviews.length > 0 &&
        w.reviews.every((r) => r.status === "SUBMITTED")
      ) {
        tasks.push({
          id: `decide-${w.id}`,
          kind: "NEEDS_DECISION",
          title: "كل المراجعات وصلت — يحتاج قراراً",
          workTitle: w.title,
          workCode: w.code,
          workId: w.id,
          deadline: w.deadline.toISOString(),
          daysLeft: days(now, new Date(w.deadline)),
          priority: "high",
          link: `/projects?work=${w.id}`,
          metadata: { reviewCount: w.reviews.length },
        });
      }
    }

    // 3) أعمال متأخرة (deadline مرّ ولم تُنشر)
    const overdue = await prisma.scientificWork.findMany({
      where: {
        stageCode: { in: ACTIVE_STAGES as never },
        deadline: { lt: now },
      },
      select: {
        id: true,
        code: true,
        title: true,
        stageCode: true,
        deadline: true,
      },
      take: 25,
      orderBy: { deadline: "asc" },
    });
    for (const w of overdue) {
      tasks.push({
        id: `overdue-${w.id}`,
        kind: "OVERDUE_WORK",
        title: `متأخر منذ ${Math.abs(days(now, new Date(w.deadline)))} يوم — ${
          STAGE_LABEL[w.stageCode as WorkStage] ?? w.stageCode
        }`,
        workTitle: w.title,
        workCode: w.code,
        workId: w.id,
        deadline: w.deadline.toISOString(),
        daysLeft: days(now, new Date(w.deadline)),
        priority: "high",
        link: `/projects?work=${w.id}`,
      });
    }

    // 4) تسليمات جديدة (آخر submission خلال 7 أيام، work في FIRST_SUBMISSION/REVISED_SUBMISSION)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000);
    const recentSubs = await prisma.workSubmission.findMany({
      where: { uploadedAt: { gte: sevenDaysAgo } },
      orderBy: { uploadedAt: "desc" },
      take: 30,
      include: {
        work: {
          select: { id: true, code: true, title: true, stageCode: true },
        },
      },
    });
    const seenWorks = new Set<string>();
    for (const s of recentSubs) {
      if (seenWorks.has(s.workId)) continue; // أحدث submission فقط لكل عمل
      seenWorks.add(s.workId);
      if (
        s.work.stageCode === "FIRST_SUBMISSION" ||
        s.work.stageCode === "REVISED_SUBMISSION"
      ) {
        tasks.push({
          id: `new-sub-${s.id}`,
          kind: "NEW_SUBMISSION",
          title: `تسليم جديد (إصدار ${s.version}) — ${s.fileName}`,
          workTitle: s.work.title,
          workCode: s.work.code,
          workId: s.work.id,
          priority: "medium",
          link: `/projects?work=${s.work.id}`,
          metadata: { version: s.version, kind: s.kind },
        });
      }
    }
  }

  // ترتيب نهائي: الأعلى أولوية أولاً، ثم الأقرب deadline
  return tasks.sort((a, b) => {
    const pri = { high: 0, medium: 1, low: 2 };
    if (pri[a.priority] !== pri[b.priority])
      return pri[a.priority] - pri[b.priority];
    if ((a.daysLeft ?? Infinity) !== (b.daysLeft ?? Infinity))
      return (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);
    return 0;
  });
}
