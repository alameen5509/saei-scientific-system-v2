// التقارير — ٣ تقارير جاهزة + تصدير CSV
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
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { FileBarChart, TrendingUp, Layers, Users } from "lucide-react";
import {
  monthlyProductivity,
  stageAnalysis,
  researcherPerformance,
} from "@/lib/reports-data";
import { toArabicDigits } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [monthly, stages, perf] = await Promise.all([
    monthlyProductivity(12),
    stageAnalysis(),
    researcherPerformance(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
          <FileBarChart className="h-7 w-7" />
          التقارير
        </h1>
        <p className="text-stone-600 text-sm">
          ٣ تقارير جاهزة قابلة للتصدير CSV (مفتوحة في Excel/Sheets)
        </p>
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
          <ProjectsBarChart
            data={stages.map((s) => ({ label: s.label, value: s.count }))}
          />
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
