// تجميع بيانات التقارير الجاهزة — يقرأ من DB
import { prisma } from "@/lib/prisma";
import { STAGE_LABEL, STAGE_ORDER, type WorkStage } from "@/types/works";

export interface MonthlyProductivityRow {
  month: string;
  created: number;
  completed: number;
}

export interface StageAnalysisRow {
  code: WorkStage;
  label: string;
  count: number;
  pctOfTotal: number;
}

export interface ResearcherPerformanceRow {
  id: string;
  name: string;
  totalWorks: number;
  published: number;
  inProgress: number;
  overdue: number;
}

export async function monthlyProductivity(
  monthsBack = 12
): Promise<MonthlyProductivityRow[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const works = await prisma.scientificWork.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, stageCode: true, updatedAt: true },
  });
  const map = new Map<string, { created: number; completed: number }>();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(k, { created: 0, completed: 0 });
  }
  for (const w of works) {
    const c = new Date(w.createdAt);
    const ck = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(ck)) map.get(ck)!.created++;
    if (w.stageCode === "PUBLISHED") {
      const u = new Date(w.updatedAt);
      const uk = `${u.getFullYear()}-${String(u.getMonth() + 1).padStart(2, "0")}`;
      if (map.has(uk)) map.get(uk)!.completed++;
    }
  }
  return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
}

export async function stageAnalysis(): Promise<StageAnalysisRow[]> {
  const groups = await prisma.scientificWork.groupBy({
    by: ["stageCode"],
    _count: { _all: true },
  });
  const m = new Map(groups.map((g) => [g.stageCode, g._count._all]));
  const total = Array.from(m.values()).reduce((s, x) => s + x, 0);
  return STAGE_ORDER.map((code) => {
    const count = m.get(code) ?? 0;
    return {
      code,
      label: STAGE_LABEL[code],
      count,
      pctOfTotal: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

export async function researcherPerformance(): Promise<
  ResearcherPerformanceRow[]
> {
  const now = new Date();
  const researchers = await prisma.researcher.findMany({
    select: {
      id: true,
      displayName: true,
      works: {
        select: {
          stageCode: true,
          deadline: true,
        },
      },
    },
    orderBy: { displayName: "asc" },
  });
  return researchers.map((r) => {
    const total = r.works.length;
    const published = r.works.filter((w) => w.stageCode === "PUBLISHED").length;
    const archived = r.works.filter((w) => w.stageCode === "ARCHIVED").length;
    const inProgress = total - published - archived;
    const overdue = r.works.filter(
      (w) =>
        w.stageCode !== "PUBLISHED" &&
        w.stageCode !== "ARCHIVED" &&
        new Date(w.deadline).getTime() < now.getTime()
    ).length;
    return {
      id: r.id,
      name: r.displayName,
      totalWorks: total,
      published,
      inProgress,
      overdue,
    };
  });
}
