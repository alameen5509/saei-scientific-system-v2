"use client";

// فرز المتقدمين — تصفية حسب الإعلان، تصنيف، تقييم بدرجات مرجَّحة
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Loader2,
  Plus,
  Filter,
  CheckCheck,
  X,
  Star,
  Award,
  GitCompareArrows,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApplicantDialog } from "@/components/screening/ApplicantDialog";
import { ApplicantEvalDialog } from "@/components/screening/ApplicantEvalDialog";
import { ExportCsvButton } from "@/components/ExportCsvButton";
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
  publicationsCount: number;
  yearsExperience: number;
  classification: Classification;
  scoreTotal?: number | null;
  scoreExpertise?: number | null;
  scorePublications?: number | null;
  scoreFit?: number | null;
  evaluatedAt?: string | null;
  createdAt: string;
  announcement: { id: string; title: string };
}

interface AnnouncementOpt {
  id: string;
  title: string;
}

export default function ScreeningPage() {
  const toast = useToast();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementOpt[]>([]);
  const [filterAnnId, setFilterAnnId] = useState<string>("ALL");
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [evalTarget, setEvalTarget] = useState<Applicant | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, annRes] = await Promise.all([
        fetch(
          `/api/applicants${
            filterAnnId !== "ALL" ? `?announcementId=${filterAnnId}` : ""
          }`,
          { cache: "no-store" }
        ),
        fetch("/api/announcements", { cache: "no-store" }),
      ]);
      const aJ = await aRes.json();
      const annJ = await annRes.json();
      if (!aRes.ok || !aJ.ok) throw new Error(aJ.error);
      setApplicants(aJ.applicants);
      if (annJ.ok) {
        setAnnouncements(annJ.announcements);
      }
    } catch (e) {
      toast.error("فشل التحميل", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [filterAnnId, toast]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = useMemo(() => {
    if (filterClass === "ALL") return applicants;
    return applicants.filter((a) => a.classification === filterClass);
  }, [applicants, filterClass]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkClassify(c: Classification) {
    if (selected.size === 0) return;
    if (
      !confirm(
        `سيتم تصنيف ${selected.size} متقدم كـ"${CLASS_LABEL[c]}". هل تريد المتابعة؟`
      )
    )
      return;
    try {
      const r = await fetch(`/api/applicants/bulk-classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          classification: c,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success(`تم تصنيف ${toArabicDigits(j.count)} متقدم`);
      setSelected(new Set());
      await refetch();
    } catch (e) {
      toast.error("فشل التصنيف", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const csvRows = [
    [
      "الاسم",
      "البريد",
      "الإعلان",
      "نشر سابق",
      "خبرة (سنوات)",
      "التصنيف",
      "الدرجة الكلية",
    ],
    ...filtered.map((a) => [
      a.fullName,
      a.email ?? "",
      a.announcement.title,
      a.publicationsCount,
      a.yearsExperience,
      CLASS_LABEL[a.classification],
      a.scoreTotal ?? "",
    ]),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            فرز المتقدمين
          </h1>
          <p className="text-stone-600 text-sm">
            تقييم وتصنيف المتقدمين للإعلانات بمعايير مرجَّحة (الخبرة 50% / النشر 30% / الملاءمة 20%)
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            filename={`applicants-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={csvRows}
          />
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة متقدم
          </Button>
        </div>
      </div>

      {/* فلاتر + إجراءات جماعية */}
      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-saei-purple-500" />
          <Select value={filterAnnId} onValueChange={setFilterAnnId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="كل الإعلانات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل الإعلانات</SelectItem>
              {announcements.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل التصنيفات</SelectItem>
              {(Object.keys(CLASS_LABEL) as Classification[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {CLASS_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 ms-auto">
              <Badge variant="purple">
                {toArabicDigits(selected.size)} محدّد
              </Badge>
              {selected.size >= 2 && selected.size <= 4 && (
                <Link
                  href={`/screening/compare?ids=${Array.from(selected).join(",")}`}
                >
                  <Button size="sm" variant="primary">
                    <GitCompareArrows className="h-4 w-4" />
                    مقارنة
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={() => bulkClassify("SUITABLE")}
              >
                <CheckCheck className="h-4 w-4" />
                مناسب
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => bulkClassify("PARTIALLY_SUITABLE")}
              >
                مناسب جزئياً
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => bulkClassify("UNSUITABLE")}
              >
                <X className="h-4 w-4" />
                غير مناسب
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قائمة المتقدمين */}
      {loading ? (
        <div className="text-center py-16 text-stone-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          جارٍ التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-stone-500">
            لا متقدمين بعد لهذه التصفية.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-saei-purple-50 text-saei-purple-700">
                <tr className="text-right">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 &&
                        selected.size === filtered.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(filtered.map((a) => a.id)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="py-3 px-3 font-bold">الاسم</th>
                  <th className="py-3 px-3 font-bold">الإعلان</th>
                  <th className="py-3 px-3 font-bold">المؤهلات</th>
                  <th className="py-3 px-3 font-bold">التصنيف</th>
                  <th className="py-3 px-3 font-bold">الدرجة</th>
                  <th className="py-3 px-3 font-bold">قُدّم</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-saei-purple-50 hover:bg-saei-purple-50/30"
                  >
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-saei-purple-700">
                        {a.fullName}
                      </div>
                      {a.email && (
                        <div className="text-xs text-stone-500">{a.email}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate">
                      {a.announcement.title}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      <div>
                        نشر: {toArabicDigits(a.publicationsCount)} ·{" "}
                        خبرة: {toArabicDigits(a.yearsExperience)} سنة
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={CLASS_TONE[a.classification]}>
                        {CLASS_LABEL[a.classification]}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 tabular-nums">
                      {a.scoreTotal != null ? (
                        <span className="inline-flex items-center gap-1 font-bold text-saei-purple-700">
                          <Star className="h-3 w-3 text-saei-gold" />
                          {toArabicDigits(a.scoreTotal)}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-stone-600">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="py-2 px-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEvalTarget(a)}
                      >
                        <Award className="h-4 w-4" />
                        تقييم
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ApplicantDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        announcements={announcements}
        onSaved={() => void refetch()}
      />
      <ApplicantEvalDialog
        applicant={evalTarget}
        open={!!evalTarget}
        onOpenChange={(v) => {
          if (!v) setEvalTarget(null);
        }}
        onSaved={() => void refetch()}
      />
    </div>
  );
}
