// لوحة تنفيذية شاملة — KPIs + توزيع المراحل + التنبيهات + الاتجاه الشهري
// Access: ADMIN, RESEARCH_COORDINATOR (يُفرض في middleware عبر PATH_ROLE_MAP)
import { Suspense } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderKanban,
  TrendingUp,
  Archive,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectsBarChart } from "@/components/charts/ProjectsBarChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { loadExecutiveData } from "@/lib/executive-data";
import { toArabicDigits, formatDate } from "@/lib/utils";
import { stageTone, STAGE_LABEL } from "@/types/works";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExecutivePage() {
  const { kpis, stages, alerts, trends } = await loadExecutiveData();

  const kpiCards = [
    {
      label: "أعمال نشطة",
      value: kpis.totalActive,
      icon: FolderKanban,
      bg: "bg-saei-purple/10",
      color: "text-saei-purple-700",
    },
    {
      label: "منشورة",
      value: kpis.totalCompleted,
      icon: CheckCircle2,
      bg: "bg-emerald-100",
      color: "text-emerald-700",
    },
    {
      label: "متأخّرة",
      value: kpis.totalOverdue,
      icon: AlertTriangle,
      bg: "bg-red-100",
      color: "text-red-700",
    },
    {
      label: "تقترب من الموعد",
      value: kpis.totalApproaching,
      icon: Clock,
      bg: "bg-amber-100",
      color: "text-amber-700",
    },
    {
      label: "نسبة الإنجاز",
      value: `${kpis.completionRate}%`,
      icon: TrendingUp,
      bg: "bg-saei-teal/10",
      color: "text-saei-teal",
      raw: true,
    },
    {
      label: "مؤرشفة",
      value: kpis.totalArchived,
      icon: Archive,
      bg: "bg-stone-100",
      color: "text-stone-700",
    },
  ];

  const csvRows = [
    ["المرحلة", "عدد الأعمال"],
    ...stages.map((s) => [s.label, String(s.count)]),
    [],
    ["مؤشر", "قيمة"],
    ["نشطة", String(kpis.totalActive)],
    ["منشورة", String(kpis.totalCompleted)],
    ["متأخّرة", String(kpis.totalOverdue)],
    ["تقترب", String(kpis.totalApproaching)],
    ["نسبة الإنجاز %", String(kpis.completionRate)],
    ["متوسط التقدم %", String(kpis.averageProgress)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1">
            اللوحة التنفيذية
          </h1>
          <p className="text-stone-600 text-sm">
            نظرة شاملة في الوقت الحقيقي على كل مراحل الأعمال العلمية
          </p>
        </div>
        <Suspense fallback={null}>
          <div className="flex gap-2">
            <ExportCsvButton
              filename={`executive-${new Date().toISOString().slice(0, 10)}.csv`}
              rows={csvRows}
            />
            <ExportPdfButton
              filename={`executive-${new Date().toISOString().slice(0, 10)}.pdf`}
              title="Saei Foundation - Executive Summary"
              subtitle={`Generated ${new Date().toLocaleDateString("en-US")}`}
              rows={[
                ["Active Works", kpis.totalActive],
                ["Published", kpis.totalCompleted],
                ["Overdue", kpis.totalOverdue],
                ["Approaching", kpis.totalApproaching],
                ["Archived", kpis.totalArchived],
                ["Completion Rate %", kpis.completionRate],
                ["Avg Progress %", kpis.averageProgress],
                ...stages.map(
                  (s) =>
                    [`Stage: ${s.code}`, s.count] as [string, number]
                ),
              ]}
            />
          </div>
        </Suspense>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                    {k.raw
                      ? toArabicDigits(String(k.value))
                      : toArabicDigits(k.value as number)}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>توزيع الأعمال على المراحل الـ١٢</CardTitle>
            <CardDescription>عدد الأعمال في كل مرحلة من سير العمل</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectsBarChart
              data={stages.map((s) => ({ label: s.label, value: s.count }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الاتجاه الشهري — آخر ٦ أشهر</CardTitle>
            <CardDescription>الأعمال المُنشأة مقابل المكتملة شهرياً</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={trends} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تنبيهات المواعيد ({toArabicDigits(alerts.length)})</CardTitle>
          <CardDescription>
            الأعمال المتأخرة (أحمر) والتي تقترب نهايتها خلال ٧ أيام (برتقالي)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-stone-500 text-sm py-6 text-center">
              لا تنبيهات حالياً — كل المواعيد في الوقت ✨
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-saei-purple-700 text-right">
                    <th className="py-2 px-2 font-bold">الكود</th>
                    <th className="py-2 px-2 font-bold">العنوان</th>
                    <th className="py-2 px-2 font-bold">الباحث</th>
                    <th className="py-2 px-2 font-bold">المرحلة</th>
                    <th className="py-2 px-2 font-bold">الموعد</th>
                    <th className="py-2 px-2 font-bold">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => {
                    const overdue = a.daysLeft < 0;
                    return (
                      <tr
                        key={a.id}
                        className="border-t border-saei-purple-50 hover:bg-saei-purple-50/40"
                      >
                        <td className="py-2 px-2 font-bold text-saei-purple-700">
                          <Link
                            href={`/projects?work=${a.id}`}
                            className="hover:underline"
                          >
                            {a.code}
                          </Link>
                        </td>
                        <td className="py-2 px-2 max-w-xs truncate">{a.title}</td>
                        <td className="py-2 px-2">{a.researcher}</td>
                        <td className="py-2 px-2">
                          <Badge variant={stageTone(a.stage)}>
                            {STAGE_LABEL[a.stage]}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 tabular-nums">
                          {formatDate(a.deadline)}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant={overdue ? "red" : "amber"}>
                            {overdue
                              ? `متأخر ${toArabicDigits(Math.abs(a.daysLeft))} يوم`
                              : `${toArabicDigits(a.daysLeft)} يوم`}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
