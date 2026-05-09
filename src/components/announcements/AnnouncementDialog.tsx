"use client";

// نافذة إنشاء/تحرير إعلان أولوية بحثية
import { useEffect, useState } from "react";
import { Megaphone, Loader2, Save } from "lucide-react";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SPECIALTY_LABEL, type WorkSpecialty } from "@/types/works";

export interface AnnouncementForm {
  id?: string;
  title: string;
  body: string;
  requirements: string | null;
  specialty: WorkSpecialty | "" | null;
  targetCount: number;
  applyDeadline: string | null;
}

const empty: AnnouncementForm = {
  title: "",
  body: "",
  requirements: "",
  specialty: "",
  targetCount: 1,
  applyDeadline: "",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // accept any shape with the announcement fields (DB row uses string | null)
  initial?: Record<string, unknown> | null;
  onSaved?: () => void;
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Props) {
  const toast = useToast();
  const [form, setForm] = useState<AnnouncementForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const i = (initial ?? {}) as Record<string, unknown>;
      setForm({
        ...empty,
        id: typeof i.id === "string" ? i.id : undefined,
        title: typeof i.title === "string" ? i.title : "",
        body: typeof i.body === "string" ? i.body : "",
        requirements: typeof i.requirements === "string" ? i.requirements : "",
        specialty: (i.specialty as AnnouncementForm["specialty"]) ?? "",
        targetCount: typeof i.targetCount === "number" ? i.targetCount : 1,
        applyDeadline: i.applyDeadline
          ? String(i.applyDeadline).slice(0, 10)
          : "",
      });
    }
  }, [open, initial]);

  async function save() {
    if (form.title.length < 3) {
      toast.error("العنوان مطلوب");
      return;
    }
    if (form.body.length < 10) {
      toast.error("نص الإعلان مطلوب (١٠ أحرف على الأقل)");
      return;
    }
    setSaving(true);
    try {
      const url = form.id
        ? `/api/announcements/${form.id}`
        : `/api/announcements`;
      const r = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          requirements: form.requirements || null,
          specialty: form.specialty || null,
          targetCount: Number(form.targetCount) || 1,
          applyDeadline: form.applyDeadline || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "تعذّر الحفظ");
      toast.success(form.id ? "تم التحديث" : "تم الإنشاء");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("فشل الحفظ", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-saei-purple-600" />
            {form.id ? "تحرير إعلان" : "إعلان أولوية بحثية جديد"}
          </DialogTitle>
          <DialogDescription>
            ينشر هذا الإعلان لاستقطاب أبحاث في موضوع محدد بمعايير واضحة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>العنوان</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: استقطاب أبحاث في الفقه المقارن لعام 2026"
            />
          </div>

          <div>
            <Label>نص الإعلان</Label>
            <RichTextEditor
              value={form.body}
              onChange={(html) => setForm({ ...form, body: html })}
              placeholder="نص الإعلان — يدعم العناوين والقوائم والروابط"
            />
          </div>

          <div>
            <Label>متطلبات التقديم (اختياري)</Label>
            <Textarea
              value={form.requirements ?? ""}
              onChange={(e) =>
                setForm({ ...form, requirements: e.target.value })
              }
              rows={3}
              placeholder="السيرة الذاتية، نشر سابق ذو صلة، خطاب تعريف..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>التخصص</Label>
              <Select
                value={form.specialty || "ANY"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    specialty: v === "ANY" ? "" : (v as WorkSpecialty),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">عام</SelectItem>
                  {Object.entries(SPECIALTY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>العدد المستهدف</Label>
              <Input
                type="number"
                min={1}
                value={form.targetCount}
                onChange={(e) =>
                  setForm({ ...form, targetCount: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>الموعد النهائي للتقديم</Label>
              <Input
                type="date"
                value={form.applyDeadline ?? ""}
                onChange={(e) =>
                  setForm({ ...form, applyDeadline: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            إلغاء
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
