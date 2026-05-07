"use client";

// نافذة تسليمات العمل العلمي — قائمة الإصدارات + إضافة تسليم جديد
// — في هذه المرحلة لا يوجد رفع فعلي للملف (Supabase Storage مستقبلاً)
//   نحفظ فقط البيانات الوصفية: الاسم، النوع، الحجم، نوع التسليم
// — عند توصيل Storage، نضيف input[type=file] ونملأ storagePath
import { useCallback, useEffect, useState } from "react";
import { FileUp, FileText, Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { toArabicDigits, formatDate } from "@/lib/utils";

export interface Submission {
  id: string;
  workId: string;
  version: number;
  kind: "FIRST_DRAFT" | "REVISION" | "FINAL";
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string | null;
  uploadedBy: string;
  uploadedAt: string;
  notes: string | null;
}

const KIND_LABEL: Record<Submission["kind"], string> = {
  FIRST_DRAFT: "تسليم أوّلي",
  REVISION: "تسليم منقّح",
  FINAL: "نسخة نهائية",
};

const KIND_TONE: Record<Submission["kind"], "purple" | "amber" | "green"> = {
  FIRST_DRAFT: "purple",
  REVISION: "amber",
  FINAL: "green",
};

const ALLOWED_MIME = [
  { label: "PDF (.pdf)", value: "application/pdf" },
  { label: "Word (.doc)", value: "application/msword" },
  {
    label: "Word (.docx)",
    value:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

interface Props {
  workId: string | null;
  workTitle?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** يُستدعى بعد التسليم الناجح لتحديث الواجهة الأم */
  onAfterSubmit?: () => void;
  /** للأدوار التي يُسمح لها فقط بالعرض دون إضافة (مثلاً المحكم) */
  readOnly?: boolean;
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function SubmissionsDialog({
  workId,
  workTitle,
  open,
  onOpenChange,
  onAfterSubmit,
  readOnly = false,
}: Props) {
  const toast = useToast();
  const [list, setList] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  // نموذج إضافة
  const [showForm, setShowForm] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState(ALLOWED_MIME[0].value);
  const [size, setSize] = useState<number | "">("");
  const [kind, setKind] = useState<Submission["kind"]>("FIRST_DRAFT");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refetch = useCallback(async () => {
    if (!workId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/works/${workId}/submissions`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "تعذّر التحميل");
      setList(j.submissions as Submission[]);
    } catch (e) {
      toast.error("تعذّر تحميل التسليمات", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [workId, toast]);

  useEffect(() => {
    if (open && workId) {
      void refetch();
      setShowForm(false);
    }
  }, [open, workId, refetch]);

  function reset() {
    setFileName("");
    setMimeType(ALLOWED_MIME[0].value);
    setSize("");
    setKind("FIRST_DRAFT");
    setNotes("");
  }

  async function handleSubmit() {
    if (!workId) return;
    if (!fileName.trim() || fileName.length > 255) {
      toast.error("أدخل اسم ملف صالح (أقل من ٢٥٥ حرفاً)");
      return;
    }
    if (typeof size !== "number" || size <= 0) {
      toast.error("أدخل حجم الملف بالبايت (رقم موجب)");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/works/${workId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileName.trim(),
          mimeType,
          size,
          kind,
          notes: notes.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "فشل التسليم");

      toast.success("تمّ تسجيل التسليم", {
        description: j.stageAdvancedTo
          ? `الإصدار ${toArabicDigits(j.submission.version)} — انتقل للمرحلة: ${j.stageAdvancedTo}`
          : `الإصدار ${toArabicDigits(j.submission.version)}`,
      });
      reset();
      setShowForm(false);
      await refetch();
      onAfterSubmit?.();
    } catch (e) {
      toast.error("تعذّر التسليم", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-saei-purple-600" />
            تسليمات العمل
          </DialogTitle>
          {workTitle && (
            <DialogDescription className="line-clamp-2">
              {workTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* قائمة التسليمات */}
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-stone-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ التحميل...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">
              لا توجد تسليمات بعد
            </div>
          ) : (
            list.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-saei-purple-100 p-3 flex items-start gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-saei-purple-50 grid place-items-center text-saei-purple-700 font-extrabold tabular-nums shrink-0">
                  v{toArabicDigits(s.version)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-saei-purple-700 truncate">
                      {s.fileName}
                    </span>
                    <Badge variant={KIND_TONE[s.kind]}>
                      {KIND_LABEL[s.kind]}
                    </Badge>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {formatSize(s.size)} · {formatDate(s.uploadedAt)}
                    {!s.storagePath && (
                      <span className="ms-2 text-amber-700">
                        (بدون ملف فعلي بعد — يحتاج تفعيل Supabase Storage)
                      </span>
                    )}
                  </div>
                  {s.notes && (
                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                      {s.notes}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* نموذج تسليم جديد */}
        {!readOnly && (
          <>
            {!showForm ? (
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4" />
                تسليم نسخة جديدة
              </Button>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-saei-purple-200 bg-saei-purple-50/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-saei-purple-700 font-bold">
                  <FileUp className="h-4 w-4" />
                  تسليم نسخة جديدة
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                  ⚠️ في هذه المرحلة يُسجَّل سجل وصفي فقط. الرفع الفعلي للملف
                  يحتاج إعداد Supabase Storage.
                </p>

                <div>
                  <Label>اسم الملف</Label>
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="thesis_v1.pdf"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>نوع الملف</Label>
                    <Select
                      value={mimeType}
                      onValueChange={(v) => setMimeType(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOWED_MIME.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الحجم (بايت)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={size}
                      onChange={(e) =>
                        setSize(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="1048576"
                    />
                  </div>
                </div>

                <div>
                  <Label>نوع التسليم</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind(v as Submission["kind"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIRST_DRAFT">تسليم أوّلي</SelectItem>
                      <SelectItem value="REVISION">تسليم منقّح</SelectItem>
                      <SelectItem value="FINAL">نسخة نهائية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات للمنسق..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    تأكيد التسليم
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false);
                      reset();
                    }}
                    disabled={submitting}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
