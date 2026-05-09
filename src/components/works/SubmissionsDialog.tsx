"use client";

// نافذة تسليمات العمل العلمي — قائمة الإصدارات + رفع فعلي عبر Supabase Storage
// التدفّق:
//   1) المستخدم يسحب/يختار ملفاً
//   2) POST /api/works/[id]/submissions/upload-url → يرجع uploadUrl + storagePath
//   3) PUT الملف على uploadUrl مباشرة (يتجاوز Vercel function body limit)
//   4) POST /api/works/[id]/submissions مع storagePath لتسجيل الـrow
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  FileUp,
  FileText,
  Loader2,
  Plus,
  Download,
  X,
  Upload,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { toArabicDigits, formatDate, cn } from "@/lib/utils";

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

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_SIZE = 50 * 1024 * 1024;

interface Props {
  workId: string | null;
  workTitle?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAfterSubmit?: () => void;
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

  // نموذج رفع
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Submission["kind"]>("FIRST_DRAFT");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      reset();
      setShowForm(false);
    }
  }, [open, workId, refetch]);

  function reset() {
    setFile(null);
    setKind("FIRST_DRAFT");
    setNotes("");
    setProgress(0);
  }

  function pickFile(f: File) {
    if (!ALLOWED_MIME.has(f.type) && !/\.(pdf|docx?)$/i.test(f.name)) {
      toast.error("نوع غير مدعوم", {
        description: "مسموح فقط: PDF, DOC, DOCX",
      });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("الملف كبير جداً", {
        description: `الحدّ الأقصى ٥٠ ميغابايت (الملف ${formatSize(f.size)})`,
      });
      return;
    }
    setFile(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function uploadFile(): Promise<{
    storagePath: string;
    version: number;
  } | null> {
    if (!file || !workId) return null;

    // 1) طلب signed URL
    setProgress(10);
    const r1 = await fetch(`/api/works/${workId}/submissions/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      }),
    });
    const j1 = await r1.json();
    if (!r1.ok || !j1.ok) {
      throw new Error(j1.error || "تعذّر تجهيز الرفع");
    }
    setProgress(30);

    // 2) PUT الملف مباشرة لـSupabase
    const putRes = await fetch(j1.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(`فشل رفع الملف: HTTP ${putRes.status}`);
    }
    setProgress(80);

    return {
      storagePath: j1.storagePath as string,
      version: j1.version as number,
    };
  }

  async function handleSubmit() {
    if (!workId || !file) {
      toast.error("اختر ملفاً للرفع");
      return;
    }
    setSubmitting(true);
    setProgress(0);

    try {
      const uploaded = await uploadFile();
      if (!uploaded) throw new Error("فشل الرفع");

      // 3) تسجيل الـrow
      const r2 = await fetch(`/api/works/${workId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          kind,
          notes: notes.trim() || null,
          storagePath: uploaded.storagePath,
        }),
      });
      const j2 = await r2.json();
      if (!r2.ok || !j2.ok) {
        throw new Error(j2.error || "فشل تسجيل التسليم");
      }
      setProgress(100);

      toast.success("تمّ الرفع والتسليم", {
        description: j2.stageAdvancedTo
          ? `الإصدار ${toArabicDigits(j2.submission.version)} — انتقل للمرحلة: ${j2.stageAdvancedTo}`
          : `الإصدار ${toArabicDigits(j2.submission.version)}`,
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
      setProgress(0);
    }
  }

  function downloadSubmission(s: Submission) {
    if (!s.storagePath) {
      toast.error("لا يوجد ملف لهذا التسليم");
      return;
    }
    // فتح في تبويب جديد — السيرفر يعيد التوجيه إلى signed URL
    window.open(`/api/works/${s.workId}/submissions/${s.id}/download`, "_blank");
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
                      <span className="ms-2 text-amber-700">(بدون ملف)</span>
                    )}
                  </div>
                  {s.notes && (
                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                      {s.notes}
                    </p>
                  )}
                </div>
                {s.storagePath && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadSubmission(s)}
                    title="تنزيل الملف"
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4 text-saei-purple-500" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* نموذج رفع جديد */}
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

                {/* منطقة السحب والإفلات */}
                {!file ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "rounded-2xl border-2 border-dashed transition-colors p-6 text-center cursor-pointer",
                      dragOver
                        ? "border-saei-purple-500 bg-saei-purple-100"
                        : "border-saei-purple-300 bg-white hover:bg-saei-purple-50"
                    )}
                  >
                    <Upload className="h-8 w-8 mx-auto text-saei-purple-500 mb-2" />
                    <p className="font-bold text-saei-purple-700">
                      اسحب الملف هنا أو اضغط للاختيار
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      PDF, DOC, DOCX — الحد الأقصى ٥٠ ميغابايت
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) pickFile(f);
                      }}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-white border border-saei-purple-200 p-3 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-saei-purple-700 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {formatSize(file.size)} · {file.type || "غير معروف"}
                      </p>
                    </div>
                    {!submitting && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        className="h-8 w-8"
                        aria-label="إزالة"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

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
                    disabled={submitting}
                  />
                </div>

                {submitting && progress > 0 && (
                  <div>
                    <div className="text-xs text-stone-600 mb-1">
                      جارٍ الرفع... {toArabicDigits(progress)}%
                    </div>
                    <div className="h-2 rounded-full bg-saei-purple-100 overflow-hidden">
                      <div
                        className="h-full bg-saei-hero transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !file}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    رفع وتسليم
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
