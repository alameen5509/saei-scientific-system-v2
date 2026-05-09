"use client";

// مقارنة جنباً إلى جنب لمتقدمين متعددين
// /screening/compare?ids=a,b,c
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
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
import { toArabicDigits, formatDate } from "@/lib/utils";

type Classification =
  | "PENDING"
  | "SUITABLE"
  | "PARTIALLY_SUITABLE"
  | "UNSUITABLE";

const CLASS_LABEL: Record<Classification, string> = {
  PENDING: "قيد الفرز",
  SUITABLE: "مناسب",
  PARTIALLY_SUITABLE: "مناسب جزئياً",
  UNSUITABLE: "غير مناسب",
};
const CLASS_TONE: Record<
  Classification,
  "gray" | "green" | "amber" | "red"
> = {
  PENDING: "gray",
  SUITABLE: "green",
  PARTIALLY_SUITABLE: "amber",
  UNSUITABLE: "red",
};

interface Applicant {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  qualifications?: string | null;
  cvText?: string | null;
  publicationsCount: number;
  yearsExperience: number;
  classification: Classification;
  scoreTotal?: number | null;
  scoreExpertise?: number | null;
  scorePublications?: number | null;
  scoreFit?: number | null;
  evaluatedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  announcement: { id: string; title: string };
}

function ScoreBar({
  label,
  value,
  weight,
  tone = "purple",
}: {
  label: string;
  value: number | null | undefined;
  weight: number;
  tone?: "purple" | "teal" | "gold";
}) {
  const v = value ?? 0;
  const colorMap = {
    purple: "bg-saei-purple",
    teal: "bg-saei-teal",
    gold: "bg-saei-gold",
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-stone-700">
          {label} <span className="text-stone-400">({toArabicDigits(weight)}٪)</span>
        </span>
        <span className="font-bold tabular-nums">
          {value != null ? toArabicDigits(v) : "—"}/{toArabicDigits(100)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full ${colorMap[tone]} transition-all`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

export default function CompareApplicantsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-stone-500 text-center py-16">جارٍ التحضير...</div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}

function CompareInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const ids = useMemo(
    () => (sp.get("ids") ?? "").split(",").filter(Boolean),
    [sp]
  );
  const toast = useToast();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActing, setBulkActing] = useState(false);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/applicants/${id}`, { cache: "no-store" }).then((r) =>
              r.json()
            )
          )
        );
        if (!alive) return;
        const ok = results.filter((r) => r.ok).map((r) => r.applicant);
        setApplicants(ok);
      } catch (e) {
        if (alive)
          toast.error("فشل التحميل", {
            description: e instanceof Error ? e.message : undefined,
          });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ids, toast]);

  async function bulkAct(c: Classification) {
    if (applicants.length === 0) return;
    if (
      !confirm(
        `سيتم تصنيف ${toArabicDigits(applicants.length)} متقدم كـ"${
          CLASS_LABEL[c]
        }". متابعة؟`
      )
    )
      return;
    setBulkActing(true);
    try {
      const r = await fetch(`/api/applicants/bulk-classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: applicants.map((a) => a.id),
          classification: c,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success(`تم التصنيف ${toArabicDigits(j.count)} متقدم`);
      router.push("/screening");
    } catch (e) {
      toast.error("فشل التصنيف", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBulkActing(false);
    }
  }

  // إيجاد القيمة الأعلى لكل مقياس لإبراز الفروقات
  const max = useMemo(() => {
    if (applicants.length === 0) return null;
    return {
      scoreTotal: Math.max(...applicants.map((a) => a.scoreTotal ?? 0)),
      publications: Math.max(...applicants.map((a) => a.publicationsCount)),
      years: Math.max(...applicants.map((a) => a.yearsExperience)),
    };
  }, [applicants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/screening")}>
          <ArrowRight className="h-4 w-4" />
          العودة للفرز
        </Button>
        <Card>
          <CardContent className="py-16 text-center text-stone-500">
            لم يُحدَّد متقدمون للمقارنة. ارجع لصفحة الفرز واختر متقدمين أولاً.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/screening")}
          >
            <ArrowRight className="h-4 w-4" />
            العودة للفرز
          </Button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mt-2 flex items-center gap-2">
            <Award className="h-7 w-7" />
            مقارنة المتقدمين ({toArabicDigits(applicants.length)})
          </h1>
          <p className="text-stone-600 text-sm">
            جنباً إلى جنب — يبرز الأرقام الأعلى تلقائياً
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => bulkAct("SUITABLE")}
            disabled={bulkActing}
          >
            <CheckCircle2 className="h-4 w-4" />
            قبول الكل
          </Button>
          <Button
            variant="ghost"
            onClick={() => bulkAct("UNSUITABLE")}
            disabled={bulkActing}
          >
            <XCircle className="h-4 w-4" />
            رفض الكل
          </Button>
        </div>
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(
            applicants.length,
            4
          )}, minmax(0, 1fr))`,
        }}
      >
        {applicants.map((a) => {
          const isTopScore =
            max && a.scoreTotal != null && a.scoreTotal === max.scoreTotal;
          return (
            <Card
              key={a.id}
              className={
                isTopScore ? "border-saei-gold-500 ring-2 ring-saei-gold-200" : ""
              }
            >
              <CardHeader>
                <CardTitle className="text-lg">{a.fullName}</CardTitle>
                <CardDescription className="text-xs">
                  {a.announcement.title}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={CLASS_TONE[a.classification]}>
                    {CLASS_LABEL[a.classification]}
                  </Badge>
                  {a.scoreTotal != null && (
                    <Badge variant={isTopScore ? "gold" : "purple"}>
                      <Star className="h-3 w-3" />
                      {toArabicDigits(a.scoreTotal)}/{toArabicDigits(100)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  {a.email && (
                    <div className="ltr text-left text-xs text-stone-500">
                      {a.email}
                    </div>
                  )}
                  {a.qualifications && (
                    <div>
                      <div className="text-xs font-bold text-stone-500 mb-0.5">
                        المؤهلات
                      </div>
                      <div>{a.qualifications}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-saei-purple-50">
                    <div>
                      <div className="text-xs text-stone-500">منشورات</div>
                      <div
                        className={`text-xl font-extrabold tabular-nums ${
                          max && a.publicationsCount === max.publications
                            ? "text-saei-gold-700"
                            : "text-saei-purple-700"
                        }`}
                      >
                        {toArabicDigits(a.publicationsCount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500">خبرة (سنوات)</div>
                      <div
                        className={`text-xl font-extrabold tabular-nums ${
                          max && a.yearsExperience === max.years
                            ? "text-saei-gold-700"
                            : "text-saei-purple-700"
                        }`}
                      >
                        {toArabicDigits(a.yearsExperience)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-saei-purple-50">
                  <div className="text-xs font-bold text-stone-500">
                    تفصيل الدرجة
                  </div>
                  <ScoreBar
                    label="الخبرة"
                    value={a.scoreExpertise}
                    weight={50}
                    tone="purple"
                  />
                  <ScoreBar
                    label="النشر"
                    value={a.scorePublications}
                    weight={30}
                    tone="teal"
                  />
                  <ScoreBar
                    label="الملاءمة"
                    value={a.scoreFit}
                    weight={20}
                    tone="gold"
                  />
                </div>

                {a.notes && (
                  <div className="pt-2 border-t border-saei-purple-50">
                    <div className="text-xs font-bold text-stone-500 mb-1">
                      ملاحظات
                    </div>
                    <p className="text-xs text-stone-600">{a.notes}</p>
                  </div>
                )}

                {a.evaluatedAt && (
                  <div className="text-xs text-stone-400">
                    قُيِّم في {formatDate(a.evaluatedAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
