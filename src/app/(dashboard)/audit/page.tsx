"use client";

// سجل التدقيق — Timeline + filters + CSV export — للمدير فقط
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Filter,
  Loader2,
  Search,
  Shield,
  User as UserIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { useToast } from "@/components/ui/toast";
import { formatDate, toArabicDigits } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  IMPERSONATE_START: "بدء انتحال",
  IMPERSONATE_END: "إنهاء انتحال",
  ANNOUNCEMENT_CREATE: "إنشاء إعلان",
  ANNOUNCEMENT_UPDATE: "تحديث إعلان",
  ANNOUNCEMENT_ARCHIVE: "أرشفة إعلان",
  APPLICANT_CLASSIFY: "تصنيف متقدم",
  PUBLISHER_CREATE: "إضافة ناشر",
  PUBLISHER_UPDATE: "تحديث ناشر",
  PRINTING_STAGE_ADVANCE: "نقل مرحلة طباعة",
  SETTINGS_UPDATE: "تحديث إعدادات",
  REPORT_EXPORT: "تصدير تقرير",
  ESCALATION_TRIGGERED: "تصاعد إشعار",
  BRAND_UPDATE: "تحديث الهوية",
  SMS_SENT: "إرسال SMS",
  CUSTOM_REPORT_CREATE: "تقرير مخصص جديد",
  CUSTOM_REPORT_UPDATE: "تحديث تقرير",
  CUSTOM_REPORT_DELETE: "حذف تقرير",
};

const ACTION_TONE: Record<string, "purple" | "amber" | "teal" | "red" | "green" | "gray" | "gold"> =
  {
    IMPERSONATE_START: "amber",
    IMPERSONATE_END: "gray",
    ANNOUNCEMENT_CREATE: "teal",
    ANNOUNCEMENT_UPDATE: "purple",
    ANNOUNCEMENT_ARCHIVE: "gray",
    APPLICANT_CLASSIFY: "purple",
    PUBLISHER_CREATE: "teal",
    PUBLISHER_UPDATE: "purple",
    PRINTING_STAGE_ADVANCE: "teal",
    SETTINGS_UPDATE: "amber",
    REPORT_EXPORT: "gold",
    ESCALATION_TRIGGERED: "red",
    BRAND_UPDATE: "purple",
    SMS_SENT: "teal",
    CUSTOM_REPORT_CREATE: "green",
    CUSTOM_REPORT_UPDATE: "purple",
    CUSTOM_REPORT_DELETE: "red",
  };

interface Log {
  id: string;
  action: string;
  actorId: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; name: string | null; email: string; role: string } | null;
  target?: { id: string; name: string | null; email: string } | null;
}

export default function AuditPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      if (search) params.set("search", search);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await fetch(`/api/audit?${params}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      setLogs(j.logs);
    } catch (e) {
      toast.error("فشل التحميل", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [filterAction, search, from, to, toast]);

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إحصاءات سريعة
  const stats = useMemo(() => {
    const byAction = new Map<string, number>();
    for (const l of logs) {
      byAction.set(l.action, (byAction.get(l.action) ?? 0) + 1);
    }
    return {
      total: logs.length,
      uniqueActors: new Set(logs.map((l) => l.actorId)).size,
      topAction:
        Array.from(byAction.entries()).sort((a, b) => b[1] - a[1])[0] ??
        null,
    };
  }, [logs]);

  const csvRows = [
    ["التاريخ", "الإجراء", "المنفّذ", "البريد", "المستهدف", "البيانات"],
    ...logs.map((l) => [
      l.createdAt,
      ACTION_LABEL[l.action] ?? l.action,
      l.actor?.name ?? "—",
      l.actor?.email ?? "—",
      l.target?.name ?? l.targetId ?? "—",
      JSON.stringify(l.metadata ?? {}),
    ]),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
            <Shield className="h-7 w-7" />
            سجل التدقيق
          </h1>
          <p className="text-stone-600 text-sm">
            تتبّع كامل لكل عملية حساسة في النظام — متاح للمدير فقط
          </p>
        </div>
        <ExportCsvButton
          filename={`audit-${new Date().toISOString().slice(0, 10)}.csv`}
          rows={csvRows}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>إجمالي السجلات</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {toArabicDigits(stats.total)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>المستخدمون الفريدون</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {toArabicDigits(stats.uniqueActors)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>أكثر إجراء</CardDescription>
            <CardTitle className="text-base">
              {stats.topAction ? (
                <>
                  {ACTION_LABEL[stats.topAction[0]] ?? stats.topAction[0]} (
                  {toArabicDigits(stats.topAction[1])})
                </>
              ) : (
                "—"
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">بحث</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم، بريد، إجراء..."
                className="ps-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">الإجراء</Label>
            <select
              className="w-full rounded-xl border border-saei-purple-100 bg-white px-3 py-2 text-sm"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="">الكل</option>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-5 flex justify-end">
            <Button variant="primary" onClick={() => void refetch()}>
              <Filter className="h-4 w-4" />
              تطبيق
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-stone-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          جارٍ التحميل...
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-stone-500">
            لا سجلات تطابق هذه التصفية.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              النشاط (آخر {toArabicDigits(logs.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 relative ps-8 before:absolute before:inset-y-0 before:right-3 before:w-px before:bg-saei-purple-100">
              {logs.map((l) => (
                <li key={l.id} className="relative">
                  <div className="absolute -right-[26px] top-2 h-3 w-3 rounded-full bg-saei-hero ring-4 ring-white" />
                  <div className="rounded-xl border border-saei-purple-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={ACTION_TONE[l.action] ?? "gray"}>
                          {ACTION_LABEL[l.action] ?? l.action}
                        </Badge>
                        <span className="text-xs text-stone-500">
                          {formatDate(l.createdAt)} ·{" "}
                          {new Date(l.createdAt).toLocaleTimeString("ar-SA")}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm mt-2 flex items-center gap-2 text-stone-700">
                      <UserIcon className="h-3.5 w-3.5 text-saei-purple-500" />
                      <strong>{l.actor?.name ?? l.actorId.slice(0, 8)}</strong>
                      {l.actor?.email && (
                        <span className="text-xs text-stone-500 ltr">
                          {l.actor.email}
                        </span>
                      )}
                    </div>
                    {l.target && (
                      <div className="text-xs text-stone-600 mt-1">
                        ↳ المستهدف: <strong>{l.target.name ?? l.target.email}</strong>
                      </div>
                    )}
                    {l.metadata && Object.keys(l.metadata).length > 0 && (
                      <pre className="text-xs bg-saei-purple-50/50 rounded-lg p-2 mt-2 ltr text-left overflow-x-auto">
                        {JSON.stringify(l.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
