"use client";

// إدارة الطباعة والنشر — تبويبان: الناشرون + أوامر الطباعة
import { useCallback, useEffect, useState } from "react";
import {
  Printer,
  Plus,
  Loader2,
  Building2,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PublisherDialog } from "@/components/publishing/PublisherDialog";
import { PrintingJobDialog } from "@/components/publishing/PrintingJobDialog";
import { toArabicDigits, formatDate } from "@/lib/utils";

type Stage = "FILE_RECEIVED" | "DESIGN_REVIEW" | "PRINTING" | "FINAL_DELIVERY";
const STAGE_LABEL: Record<Stage, string> = {
  FILE_RECEIVED: "استلام الملف",
  DESIGN_REVIEW: "مراجعة التصميم",
  PRINTING: "قيد الطباعة",
  FINAL_DELIVERY: "تسليم نهائي",
};
const STAGE_ORDER: Stage[] = [
  "FILE_RECEIVED",
  "DESIGN_REVIEW",
  "PRINTING",
  "FINAL_DELIVERY",
];
const STAGE_TONE: Record<Stage, "purple" | "amber" | "teal" | "green"> = {
  FILE_RECEIVED: "purple",
  DESIGN_REVIEW: "amber",
  PRINTING: "teal",
  FINAL_DELIVERY: "green",
};

interface Publisher {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  rating?: number | null;
  totalJobs: number;
  active: boolean;
  notes?: string | null;
  _count: { printingJobs: number };
}

interface PrintingJob {
  id: string;
  stage: Stage;
  copies: number;
  cost?: string | null;
  expectedDeliveryAt?: string | null;
  receivedAt?: string | null;
  deliveredAt?: string | null;
  publisher: { id: string; name: string };
  work: { id: string; code: string; title: string } | null;
}

function nextStage(s: Stage): Stage | null {
  const i = STAGE_ORDER.indexOf(s);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}

export default function PublishingPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"jobs" | "publishers">("jobs");
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [jobs, setJobs] = useState<PrintingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [pubDialogOpen, setPubDialogOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<Publisher | null>(null);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, jRes] = await Promise.all([
        fetch("/api/publishers", { cache: "no-store" }),
        fetch("/api/printing-jobs", { cache: "no-store" }),
      ]);
      const pJ = await pRes.json();
      const jJ = await jRes.json();
      if (!pRes.ok || !pJ.ok) throw new Error(pJ.error);
      if (!jRes.ok || !jJ.ok) throw new Error(jJ.error);
      setPublishers(pJ.publishers);
      setJobs(jJ.jobs);
    } catch (e) {
      toast.error("فشل التحميل", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function advanceJob(j: PrintingJob) {
    const next = nextStage(j.stage);
    if (!next) return;
    const proceed = confirm(
      `سيُنقَل إلى مرحلة "${STAGE_LABEL[next]}". هل تريد المتابعة؟`
    );
    if (!proceed) return;
    try {
      const r = await fetch(`/api/printing-jobs/${j.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      const jj = await r.json();
      if (!r.ok || !jj.ok) throw new Error(jj.error);
      toast.success(
        next === "FINAL_DELIVERY"
          ? "تم التسليم — العمل أصبح منشوراً"
          : `انتقل إلى ${STAGE_LABEL[next]}`
      );
      await refetch();
    } catch (e) {
      toast.error("فشل النقل", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
            <Printer className="h-7 w-7" />
            الطباعة والنشر
          </h1>
          <p className="text-stone-600 text-sm">
            إدارة الناشرين ومتابعة مراحل الطباعة (المراحل ١١-١٢ من سير العمل)
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "publishers" ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditingPub(null);
                setPubDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              ناشر جديد
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setJobDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              أمر طباعة جديد
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-saei-purple-100">
        <button
          onClick={() => setTab("jobs")}
          className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
            tab === "jobs"
              ? "border-saei-purple text-saei-purple-700"
              : "border-transparent text-stone-500"
          }`}
        >
          أوامر الطباعة
        </button>
        <button
          onClick={() => setTab("publishers")}
          className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
            tab === "publishers"
              ? "border-saei-purple text-saei-purple-700"
              : "border-transparent text-stone-500"
          }`}
        >
          الناشرون
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          جارٍ التحميل...
        </div>
      ) : tab === "jobs" ? (
        jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-stone-500">
              لا أوامر طباعة بعد.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-saei-purple-50 text-saei-purple-700">
                  <tr className="text-right">
                    <th className="py-3 px-3 font-bold">العمل</th>
                    <th className="py-3 px-3 font-bold">الناشر</th>
                    <th className="py-3 px-3 font-bold">المرحلة</th>
                    <th className="py-3 px-3 font-bold">النسخ</th>
                    <th className="py-3 px-3 font-bold">التكلفة</th>
                    <th className="py-3 px-3 font-bold">التسليم المتوقع</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const next = nextStage(j.stage);
                    const overdue =
                      j.expectedDeliveryAt &&
                      j.stage !== "FINAL_DELIVERY" &&
                      new Date(j.expectedDeliveryAt) < new Date();
                    return (
                      <tr
                        key={j.id}
                        className="border-t border-saei-purple-50 hover:bg-saei-purple-50/30"
                      >
                        <td className="py-2 px-3">
                          {j.work ? (
                            <>
                              <div className="font-bold text-saei-purple-700">
                                {j.work.code}
                              </div>
                              <div className="text-xs text-stone-600 truncate max-w-xs">
                                {j.work.title}
                              </div>
                            </>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">{j.publisher.name}</td>
                        <td className="py-2 px-3">
                          <Badge variant={STAGE_TONE[j.stage]}>
                            {STAGE_LABEL[j.stage]}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 tabular-nums">
                          {toArabicDigits(j.copies)}
                        </td>
                        <td className="py-2 px-3 tabular-nums">
                          {j.cost ? `${j.cost} ر.س` : "—"}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {j.expectedDeliveryAt ? (
                            <span className={overdue ? "text-red-700 font-bold" : ""}>
                              {formatDate(j.expectedDeliveryAt)}
                              {overdue && " (متأخر)"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {next && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => advanceJob(j)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              {STAGE_LABEL[next]}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      ) : publishers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-stone-500">
            لا ناشرون مسجلون بعد.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publishers.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-saei-purple-500" />
                    {p.name}
                  </CardTitle>
                  {!p.active && <Badge variant="gray">معطّل</Badge>}
                </div>
                <CardDescription>
                  {[p.city, p.country].filter(Boolean).join("، ") || "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.contactName && (
                  <div className="text-stone-700">
                    جهة الاتصال: <strong>{p.contactName}</strong>
                  </div>
                )}
                {p.contactPhone && <div>📞 {p.contactPhone}</div>}
                {p.contactEmail && <div>✉️ {p.contactEmail}</div>}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-saei-purple-50">
                  {p.rating != null && (
                    <Badge variant="gold">
                      <Star className="h-3 w-3" />
                      {toArabicDigits(p.rating)}/{toArabicDigits(5)}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    أوامر: {toArabicDigits(p._count.printingJobs)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ms-auto"
                    onClick={() => {
                      setEditingPub(p);
                      setPubDialogOpen(true);
                    }}
                  >
                    تحرير
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PublisherDialog
        open={pubDialogOpen}
        onOpenChange={setPubDialogOpen}
        initial={editingPub}
        onSaved={() => void refetch()}
      />
      <PrintingJobDialog
        open={jobDialogOpen}
        onOpenChange={setJobDialogOpen}
        publishers={publishers}
        onSaved={() => void refetch()}
      />
    </div>
  );
}
