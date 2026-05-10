"use client";

// لوحة أداء المحكمين — مقاييس استجابة وإنجاز
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Clock,
  Loader2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { useToast } from "@/components/ui/toast";
import { toArabicDigits } from "@/lib/utils";

interface PerfRow {
  id: string;
  name: string;
  email: string;
  active: boolean;
  specialties: string[];
  totalAssigned: number;
  totalSubmitted: number;
  totalDeclined: number;
  totalInProgress: number;
  avgResponseDays: number | null;
  declineRate: number;
  completionRate: number;
}

export default function ReviewerPerformancePage() {
  const toast = useToast();
  const [rows, setRows] = useState<PerfRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/reviewers/performance", {
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error);
        setRows(j.performance);
      } catch (e) {
        toast.error("فشل التحميل", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // أرقام إجمالية
  const totals = {
    avgResponse:
      rows.length > 0
        ? Math.round(
            rows
              .filter((r) => r.avgResponseDays != null)
              .reduce((s, r) => s + (r.avgResponseDays ?? 0), 0) /
              Math.max(1, rows.filter((r) => r.avgResponseDays != null).length)
          )
        : 0,
    totalSubmitted: rows.reduce((s, r) => s + r.totalSubmitted, 0),
    totalDeclined: rows.reduce((s, r) => s + r.totalDeclined, 0),
    activeReviewers: rows.filter((r) => r.active).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reviewers">
          <Button variant="ghost" size="sm">
            <ArrowRight className="h-4 w-4" />
            العودة للمحكمين
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mt-2 mb-1 flex items-center gap-2">
          <TrendingUp className="h-7 w-7" />
          أداء المحكمين
        </h1>
        <p className="text-stone-600 text-sm">
          متوسط زمن الاستجابة، معدل الإنجاز، معدل الاعتذار لكل محكم
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <div className="h-11 w-11 rounded-xl bg-saei-teal/15 grid place-items-center text-saei-teal">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>متوسط الاستجابة</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(totals.avgResponse)}{" "}
                <span className="text-sm font-normal text-stone-500">يوم</span>
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 grid place-items-center text-emerald-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>مراجعات مُسلَّمة</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(totals.totalSubmitted)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <div className="h-11 w-11 rounded-xl bg-red-100 grid place-items-center text-red-700">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>اعتذارات</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(totals.totalDeclined)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <div className="h-11 w-11 rounded-xl bg-saei-purple/10 grid place-items-center text-saei-purple-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>محكمون نشطون</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(totals.activeReviewers)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-end">
        <ExportCsvButton
          filename={`reviewer-performance-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`}
          rows={[
            [
              "المحكم",
              "البريد",
              "نشط",
              "إجمالي مُسنَد",
              "مُسلَّم",
              "اعتذر",
              "قيد العمل",
              "متوسط استجابة (يوم)",
              "معدل إنجاز %",
              "معدل اعتذار %",
            ],
            ...rows.map((r) => [
              r.name,
              r.email,
              r.active ? "نعم" : "لا",
              r.totalAssigned,
              r.totalSubmitted,
              r.totalDeclined,
              r.totalInProgress,
              r.avgResponseDays ?? "—",
              r.completionRate,
              r.declineRate,
            ]),
          ]}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          جارٍ التحميل...
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-stone-500">
            لا محكمون مسجَّلون.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-saei-purple-50 text-saei-purple-700">
                <tr className="text-right">
                  <th className="py-3 px-3 font-bold">المحكم</th>
                  <th className="py-3 px-3 font-bold">مُسنَد</th>
                  <th className="py-3 px-3 font-bold">مُسلَّم</th>
                  <th className="py-3 px-3 font-bold">اعتذر</th>
                  <th className="py-3 px-3 font-bold">قيد العمل</th>
                  <th className="py-3 px-3 font-bold">متوسط الاستجابة</th>
                  <th className="py-3 px-3 font-bold">معدل الإنجاز</th>
                  <th className="py-3 px-3 font-bold">معدل الاعتذار</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const fast =
                    r.avgResponseDays != null && r.avgResponseDays <= 7;
                  const declineHigh = r.declineRate >= 30;
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-saei-purple-50 hover:bg-saei-purple-50/30"
                    >
                      <td className="py-2 px-3">
                        <div className="font-bold text-saei-purple-700">
                          {r.name}
                        </div>
                        <div className="text-xs text-stone-500">{r.email}</div>
                        {!r.active && (
                          <Badge variant="gray" className="mt-1 text-[10px]">
                            معطّل
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {toArabicDigits(r.totalAssigned)}
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        <Badge variant="green">
                          {toArabicDigits(r.totalSubmitted)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {r.totalDeclined > 0 ? (
                          <Badge variant="red">
                            {toArabicDigits(r.totalDeclined)}
                          </Badge>
                        ) : (
                          <span className="text-stone-400">٠</span>
                        )}
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {r.totalInProgress > 0 ? (
                          <Badge variant="amber">
                            {toArabicDigits(r.totalInProgress)}
                          </Badge>
                        ) : (
                          <span className="text-stone-400">٠</span>
                        )}
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {r.avgResponseDays != null ? (
                          <Badge variant={fast ? "teal" : "amber"}>
                            {toArabicDigits(r.avgResponseDays)} يوم
                          </Badge>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {toArabicDigits(r.completionRate)}٪
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        <Badge variant={declineHigh ? "red" : "outline"}>
                          {toArabicDigits(r.declineRate)}٪
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
