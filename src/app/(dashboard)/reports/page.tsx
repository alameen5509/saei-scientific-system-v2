// التقارير — KPIs + ٣ تقارير جاهزة + تصدير CSV
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { ProjectsBarChart } from "@/components/charts/ProjectsBarChart";
import { StagePieChart } from "@/components/charts/StagePieChart";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import {
  FileBarChart,
  TrendingUp,
  Layers,
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  UserCheck,
} from "lucide-react";
import {
  monthlyProductivity,
  stageAnalysis,
  researcherPerformance,
  reportsKpis,
} from "@/lib/reports-data";
import { toArabicDigits } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [kpis, monthly, stages, perf] = await Promise.all([
    reportsKpis(),
    monthlyProductivity(12),
    stageAnalysis(),
    researcherPerformance(),
  ]);

  const kpiCards = [
    {
      label: "إجمالي الأعمال",
      value: kpis.totalWorks,
      icon: FolderKanban,
      bg: "bg-saei-purple/10",
      color: "text-saei-purple-700",
    },
    {
      label: "الأعمال المنشورة",
      value: kpis.published,
      icon: CheckCircle2,
      bg: "bg-emerald-100",
      color: "text-emerald-700",
    },
    {
      label: "الأعمال الجارية",
      value: kpis.inProgress,
      icon: Clock,
      bg: "bg-saei-teal/10",
      color: "text-saei-teal",
    },
    {
      label: "الباحثون النشطون",
      value: kpis.activeResearchers,
      icon: UserCheck,
      bg: "bg-saei-gold/15",
      color: "text-saei-gold-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
          <FileBarChart className="h-7 w-7" />
          التقارير
        </h1>
        <p className="text-stone-600 text-sm">
          ملخّص KPIs و٣ تقارير جاهزة قابلة للتصدير CSV (مفتوحة في Excel/Sheets)
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex-row items-center gap-3 pb-2">
                <div
                  className={`h-11 w-11 rounded-xl grid place-items-center ${k.bg} ${k.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardDescription>{k.label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {toArabicDigits(k.value)}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* تقرير ١: الإنتاجية الشهرية */}
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-saei-teal" />
              التقرير الشهري — آخر ١٢ شهراً
            </CardTitle>
            <CardDescription>
              الأعمال المُنشأة مقابل المكتملة لكل شهر
            </CardDescription>
          </div>
          <ExportCsvButton
            filename="monthly-productivity.csv"
            rows={[
              ["الشهر", "مُنشأة", "مكتملة"],
              ...monthly.map((m) => [m.month, m.created, m.completed]),
            ]}
          />
        </CardHeader>
        <CardContent>
          <TrendLineChart data={monthly} />
        </CardContent>
      </Card>

      {/* تقرير ٢: تحليل المراحل */}
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-saei-gold" />
              تحليل المراحل
            </CardTitle>
            <CardDescription>
              توزيع كل الأعمال على المراحل الـ١٢ مع النسبة المئوية
            </CardDescription>
          </div>
          <ExportCsvButton
            filename="stage-analysis.csv"
            rows={[
              ["الكود", "المرحلة", "العدد", "النسبة %"],
              ...stages.map((s) => [s.code, s.label, s.count, s.pctOfTotal]),
            ]}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-stone-500 mb-2 text-center">
                توزيع شريطي
              </p>
              <ProjectsBarChart
                data={stages.map((s) => ({ label: s.label, value: s.count }))}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 mb-2 text-center">
                توزيع دائري
              </p>
              <StagePieChart
                data={stages
                  .filter((s) => s.count > 0)
                  .map((s) => ({ label: s.label, value: s.count }))}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-saei-purple-700 text-right">
                  <th className="py-2 px-2 font-bold">المرحلة</th>
                  <th className="py-2 px-2 font-bold">العدد</th>
                  <th className="py-2 px-2 font-bold">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.code} className="border-t border-saei-purple-50">
                    <td className="py-2 px-2">{s.label}</td>
                    <td className="py-2 px-2 tabular-nums">
                      {toArabicDigits(s.count)}
                    </td>
                    <td className="py-2 px-2 tabular-nums">
                      {toArabicDigits(s.pctOfTotal)}٪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* تقرير ٣: أداء الباحثين */}
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-saei-purple-600" />
              أداء الباحثين
            </CardTitle>
            <CardDescription>
              مجموع الأعمال، المنشورة، الجارية، المتأخرة لكل باحث
            </CardDescription>
          </div>
          <ExportCsvButton
            filename="researcher-performance.csv"
            rows={[
              ["الباحث", "إجمالي", "منشور", "جاري", "متأخر"],
              ...perf.map((r) => [
                r.name,
                r.totalWorks,
                r.published,
                r.inProgress,
                r.overdue,
              ]),
            ]}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-saei-purple-50 text-saei-purple-700">
                <tr className="text-right">
                  <th className="py-3 px-3 font-bold">الباحث</th>
                  <th className="py-3 px-3 font-bold">إجمالي</th>
                  <th className="py-3 px-3 font-bold">منشور</th>
                  <th className="py-3 px-3 font-bold">جاري</th>
                  <th className="py-3 px-3 font-bold">متأخر</th>
                </tr>
              </thead>
              <tbody>
                {perf.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-500">
                      لا بيانات بعد
                    </td>
                  </tr>
                ) : (
                  perf.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-saei-purple-50 hover:bg-saei-purple-50/30"
                    >
                      <td className="py-2 px-3 font-bold">{r.name}</td>
                      <td className="py-2 px-3 tabular-nums">
                        {toArabicDigits(r.totalWorks)}
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        <Badge variant="green">
                          {toArabicDigits(r.published)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        <Badge variant="amber">
                          {toArabicDigits(r.inProgress)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {r.overdue > 0 ? (
                          <Badge variant="red">{toArabicDigits(r.overdue)}</Badge>
                        ) : (
                          <span className="text-stone-400">٠</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
