"use client";

// صفحة العقود — للمدير والمنسقين
// — قائمة العقود مع الفلترة بالحالة
// — إنشاء/تعديل + انتقال الحالات (إرسال/توقيع/إلغاء)
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileSignature,
  Plus,
  RefreshCw,
  Send,
  PenLine,
  Ban,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatDate, toArabicDigits } from "@/lib/utils";

type ContractStatus = "DRAFT" | "SENT" | "SIGNED" | "EXPIRED" | "CANCELLED";
type ContractKind = "RESEARCH" | "PUBLISHING" | "EDITING";

interface ContractRow {
  id: string;
  workId: string;
  kind: ContractKind;
  status: ContractStatus;
  title: string;
  body: string;
  partyName: string;
  partyEmail: string | null;
  startsAt: string | null;
  endsAt: string | null;
  value: number | null;
  currency: string;
  signedAt: string | null;
  createdAt: string;
  work: { id: string; code: string; title: string };
}

interface WorkOption {
  id: string;
  code: string;
  title: string;
}

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "مسودّة",
  SENT: "مرسَل",
  SIGNED: "موقَّع",
  EXPIRED: "منتهي",
  CANCELLED: "مُلغى",
};

const STATUS_TONE: Record<
  ContractStatus,
  "purple" | "gold" | "green" | "gray" | "red"
> = {
  DRAFT: "purple",
  SENT: "gold",
  SIGNED: "green",
  EXPIRED: "gray",
  CANCELLED: "red",
};

const KIND_LABEL: Record<ContractKind, string> = {
  RESEARCH: "بحثي",
  PUBLISHING: "نشر",
  EDITING: "تحرير",
};

export default function ContractsPage() {
  const toast = useToast();
  const [list, setList] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | ContractStatus>("ALL");

  // نافذة الإنشاء/التعديل
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [worksOptions, setWorksOptions] = useState<WorkOption[]>([]);
  const [form, setForm] = useState({
    workId: "",
    kind: "RESEARCH" as ContractKind,
    title: "",
    body: "",
    partyName: "",
    partyEmail: "",
    value: "",
    currency: "SAR",
    startsAt: "",
    endsAt: "",
  });

  // نافذة التوقيع
  const [signTarget, setSignTarget] = useState<ContractRow | null>(null);
  const [signNote, setSignNote] = useState("");
  const [signing, setSigning] = useState(false);

  // حذف
  const [deleteTarget, setDeleteTarget] = useState<ContractRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/contracts", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "فشل التحميل");
      setList(j.contracts as ContractRow[]);
    } catch (e) {
      toast.error("تعذّر تحميل العقود", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // تحميل الأعمال للقائمة المنسدلة
  const loadWorks = useCallback(async () => {
    try {
      const r = await fetch("/api/works", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) {
        setWorksOptions(
          (j.works as { id: string; code: string; title: string }[]).map(
            (w) => ({ id: w.id, code: w.code, title: w.title })
          )
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  function openCreate() {
    setForm({
      workId: "",
      kind: "RESEARCH",
      title: "",
      body: "",
      partyName: "",
      partyEmail: "",
      value: "",
      currency: "SAR",
      startsAt: "",
      endsAt: "",
    });
    void loadWorks();
    setFormOpen(true);
  }

  async function handleCreate() {
    if (!form.workId) {
      toast.error("اختر العمل");
      return;
    }
    if (form.title.trim().length < 3) {
      toast.error("أدخل عنواناً للعقد");
      return;
    }
    if (form.body.trim().length < 10) {
      toast.error("نصّ العقد قصير جداً");
      return;
    }
    if (!form.partyName.trim()) {
      toast.error("أدخل اسم الطرف الآخر");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: form.value ? Number(form.value) : undefined,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "فشل الإنشاء");
      toast.success("تمّ إنشاء العقد");
      setFormOpen(false);
      await refetch();
    } catch (e) {
      toast.error("تعذّر إنشاء العقد", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function transition(id: string, to: ContractStatus, note?: string) {
    const r = await fetch(`/api/contracts/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, signatureNote: note }),
    });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      throw new Error(j.error || "فشل تغيير الحالة");
    }
    return j;
  }

  async function handleSend(c: ContractRow) {
    try {
      await transition(c.id, "SENT");
      toast.success("تمّ إرسال العقد");
      await refetch();
    } catch (e) {
      toast.error("تعذّر الإرسال", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleSign() {
    if (!signTarget) return;
    setSigning(true);
    try {
      await transition(signTarget.id, "SIGNED", signNote.trim() || undefined);
      toast.success("تمّ توقيع العقد", {
        description: "تأكيد بالنقر — يحتاج لاحقاً ربط بـE-Signature خارجي",
      });
      setSignTarget(null);
      setSignNote("");
      await refetch();
    } catch (e) {
      toast.error("تعذّر التوقيع", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSigning(false);
    }
  }

  async function handleCancel(c: ContractRow) {
    if (!confirm(`إلغاء العقد "${c.title}"؟`)) return;
    try {
      await transition(c.id, "CANCELLED");
      toast.success("تمّ إلغاء العقد");
      await refetch();
    } catch (e) {
      toast.error("تعذّر الإلغاء", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/contracts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "فشل الحذف");
      toast.success("تمّ حذف العقد");
      setDeleteTarget(null);
      await refetch();
    } catch (e) {
      toast.error("تعذّر الحذف", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(
    () => (filter === "ALL" ? list : list.filter((c) => c.status === filter)),
    [list, filter]
  );

  const stats = useMemo(() => {
    return {
      total: list.length,
      draft: list.filter((c) => c.status === "DRAFT").length,
      sent: list.filter((c) => c.status === "SENT").length,
      signed: list.filter((c) => c.status === "SIGNED").length,
    };
  }, [list]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
            <FileSignature className="h-7 w-7" />
            العقود
          </h1>
          <p className="text-stone-600 text-sm">
            عقود البحث والنشر والتحرير — تأكيد التوقيع داخل التطبيق
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            عقد جديد
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-saei-purple/10 text-saei-purple-700 grid place-items-center">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>إجمالي</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(stats.total)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-saei-purple-100 text-saei-purple-700 grid place-items-center">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>مسودّات</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(stats.draft)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 grid place-items-center">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>مرسَل</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(stats.sent)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>موقَّع</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(stats.signed)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* فلترة بالحالة */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL", "DRAFT", "SENT", "SIGNED", "EXPIRED", "CANCELLED"] as const).map(
          (s) => (
            <Button
              key={s}
              variant={filter === s ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s === "ALL" ? "الكل" : STATUS_LABEL[s]}
            </Button>
          )
        )}
      </div>

      {/* الجدول */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-stone-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> جارٍ التحميل…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="لا توجد عقود"
          description="ابدأ بإنشاء أول عقد بحثي أو نشري."
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              عقد جديد
            </Button>
          }
          variant="subtle"
        />
      ) : (
        <div className="rounded-2xl border border-saei-purple-100 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العنوان</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الطرف</TableHead>
                <TableHead>العمل</TableHead>
                <TableHead>القيمة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead className="w-44">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-saei-purple-700 max-w-[18rem]">
                    <div className="line-clamp-2">{c.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="purple">{KIND_LABEL[c.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{c.partyName}</TableCell>
                  <TableCell className="text-xs text-stone-600">
                    {c.work.code}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {c.value
                      ? `${toArabicDigits(c.value)} ${c.currency}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[c.status]}>
                      {STATUS_LABEL[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-stone-600 whitespace-nowrap">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {c.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleSend(c)}
                          title="إرسال"
                        >
                          <Send className="h-3.5 w-3.5" />
                          إرسال
                        </Button>
                      )}
                      {c.status === "SENT" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSignTarget(c)}
                          title="توقيع"
                          className="text-emerald-700"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          توقيع
                        </Button>
                      )}
                      {(c.status === "DRAFT" || c.status === "SENT") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleCancel(c)}
                          className="text-red-700"
                          title="إلغاء"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(c.status === "DRAFT" || c.status === "CANCELLED") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(c)}
                          className="text-red-700"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* نافذة الإنشاء */}
      <Dialog open={formOpen} onOpenChange={(v) => !submitting && setFormOpen(v)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>عقد جديد</DialogTitle>
            <DialogDescription>
              املأ تفاصيل العقد. يبدأ كمسوّدة (DRAFT)، ثم يُرسل، ثم يُوقَّع.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pl-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>العمل المرتبط</Label>
                <Select
                  value={form.workId}
                  onValueChange={(v) => setForm((f) => ({ ...f, workId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر عملاً" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh]">
                    {worksOptions.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.code} — {w.title.slice(0, 40)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نوع العقد</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, kind: v as ContractKind }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESEARCH">بحثي</SelectItem>
                    <SelectItem value="PUBLISHING">نشر</SelectItem>
                    <SelectItem value="EDITING">تحرير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>عنوان العقد</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="عقد بحث علمي — موضوع كذا..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الطرف الآخر</Label>
                <Input
                  value={form.partyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, partyName: e.target.value }))
                  }
                  placeholder="اسم الباحث/الناشر"
                />
              </div>
              <div>
                <Label>بريد الطرف (اختياري)</Label>
                <Input
                  type="email"
                  value={form.partyEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, partyEmail: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>القيمة</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, value: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>العملة</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">ريال سعودي</SelectItem>
                    <SelectItem value="USD">دولار</SelectItem>
                    <SelectItem value="EUR">يورو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ البدء</Label>
                <Input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAt: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>نصّ العقد</Label>
              <Textarea
                rows={6}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="بسم الله الرحمن الرحيم، اتفق الطرفان على..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreate()}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              إنشاء العقد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة التوقيع */}
      <Dialog open={!!signTarget} onOpenChange={(v) => !signing && !v && setSignTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-emerald-600" />
              تأكيد التوقيع
            </DialogTitle>
            <DialogDescription>
              {signTarget?.title} — {signTarget?.partyName}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              هذا تأكيد توقيع داخلي بالنقر فقط — لاستبداله بـE-Signature معتمد
              (DocuSign / HelloSign) لاحقاً.
            </p>
          </div>
          <div>
            <Label>ملاحظة على التوقيع (اختياري)</Label>
            <Textarea
              rows={3}
              value={signNote}
              onChange={(e) => setSignNote(e.target.value)}
              placeholder="مثلاً: وقّع بحضور المنسق..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSignTarget(null)}
              disabled={signing}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSign()}
              disabled={signing}
            >
              {signing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
              توقيع نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="حذف عقد"
        description={
          deleteTarget && (
            <>
              هل أنت متأكد من حذف العقد{" "}
              <strong className="text-saei-purple-700">
                «{deleteTarget.title}»
              </strong>
              ؟
            </>
          )
        }
        confirmLabel="حذف نهائي"
        loading={deleting}
        onOpenChange={(v) => !deleting && !v && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
