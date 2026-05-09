// تجميع بيانات اللوحة التنفيذية — يقرأ من DB فعلياً
import { prisma } from "@/lib/prisma";
import { STAGE_LABEL, STAGE_ORDER, type WorkStage } from "@/types/works";

export interface StageCount {
  code: WorkStage;
  label: string;
  count: number;
}

export interface ExecutiveKPIs {
  totalActive: number;
  totalCompleted: number;
  totalArchived: number;
  totalOverdue: number;
  totalApproaching: number; // ≤7 days
  completionRate: number; // %
  averageProgress: number; // %
}

export interface DeadlineAlert {
  id: string;
  code: string;
  title: string;
  researcher: string;
  deadline: string;
  daysLeft: number; // negative if overdue
  stage: WorkStage;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  created: number;
  completed: number;
}

export async function loadExecutiveData(): Promise<{
  kpis: ExecutiveKPIs;
  stages: StageCount[];
  alerts: DeadlineAlert[];
  trends: MonthlyTrend[];
}> {
  const now = new Date();
  const inWeek = new Date(now.getTime() + 7 * 86400_000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400_000);

  // عدّ المراحل دفعة واحدة
  const stageGroups = await prisma.scientificWork.groupBy({
    by: ["stageCode"],
    _count: { _all: true },
  });
  const stageMap = new Map(
    stageGroups.map((g) => [g.stageCode as WorkStage, g._count._all])
  );

  const stages: StageCount[] = STAGE_ORDER.map((code) => ({
    code,
    label: STAGE_LABEL[code],
    count: stageMap.get(code) ?? 0,
  }));

  const total = stages.reduce((s, x) => s + x.count, 0);
  const totalCompleted = stageMap.get("PUBLISHED") ?? 0;
  const totalArchived = stageMap.get("ARCHIVED") ?? 0;
  const totalActive =
    total - totalCompleted - totalArchived; // كل ما ليس منشوراً/مؤرشفاً

  // متأخر/مقترب
  const activeStageCodes = STAGE_ORDER.slice(0, -2); // كل ما عدا PUBLISHED, ARCHIVED
  const [overdue, approaching, avgProgress] = await Promise.all([
    prisma.scientificWork.count({
      where: { stageCode: { in: activeStageCodes }, deadline: { lt: now } },
    }),
    prisma.scientificWork.count({
      where: {
        stageCode: { in: activeStageCodes },
        deadline: { gte: now, lte: inWeek },
      },
    }),
    prisma.scientificWork.aggregate({
      _avg: { progress: true },
      where: { stageCode: { in: activeStageCodes } },
    }),
  ]);

  // قائمة التنبيهات (أعلى أولوية: متأخر، ثم قارب)
  const upcomingWorks = await prisma.scientificWork.findMany({
    where: {
      stageCode: { in: activeStageCodes },
      deadline: { lte: inWeek },
    },
    include: { researcher: { select: { displayName: true } } },
    orderBy: { deadline: "asc" },
    take: 25,
  });

  const alerts: DeadlineAlert[] = upcomingWorks.map((w) => ({
    id: w.id,
    code: w.code,
    title: w.title,
    researcher: w.researcher.displayName,
    deadline: w.deadline.toISOString(),
    daysLeft: Math.ceil(
      (w.deadline.getTime() - now.getTime()) / 86400_000
    ),
    stage: w.stageCode as WorkStage,
  }));

  // اتجاه شهري آخر ٦ شهور
  const recentWorks = await prisma.scientificWork.findMany({
    where: { OR: [{ createdAt: { gte: sixMonthsAgo } }, { stageCode: "PUBLISHED" }] },
    select: { createdAt: true, stageCode: true, updatedAt: true },
  });

  const trendMap = new Map<string, { created: number; completed: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trendMap.set(key, { created: 0, completed: 0 });
  }
  for (const w of recentWorks) {
    const created = new Date(w.createdAt);
    const cKey = `${created.getFullYear()}-${String(
      created.getMonth() + 1
    ).padStart(2, "0")}`;
    if (trendMap.has(cKey)) trendMap.get(cKey)!.created++;
    if (w.stageCode === "PUBLISHED") {
      const u = new Date(w.updatedAt);
      const uKey = `${u.getFullYear()}-${String(u.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (trendMap.has(uKey)) trendMap.get(uKey)!.completed++;
    }
  }
  const trends: MonthlyTrend[] = Array.from(trendMap.entries()).map(
    ([month, v]) => ({ month, ...v })
  );

  return {
    kpis: {
      totalActive,
      totalCompleted,
      totalArchived,
      totalOverdue: overdue,
      totalApproaching: approaching,
      completionRate:
        total > 0 ? Math.round((totalCompleted / total) * 100) : 0,
      averageProgress: Math.round(avgProgress._avg.progress ?? 0),
    },
    stages,
    alerts,
    trends,
  };
}
