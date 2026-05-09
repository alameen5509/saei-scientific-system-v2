"use client";

// نافذة إضافة/تحرير ناشر
import { useEffect, useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

interface Publisher {
  id?: string;
  name: string;
  city?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  rating?: number | null;
  notes?: string | null;
  active?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Publisher | null;
  onSaved?: () => void;
}

export function PublisherDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Props) {
  const toast = useToast();
  const [form, setForm] = useState<Publisher>({ name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial ?? {
          name: "",
          city: "",
          country: "SA",
          contactName: "",
          contactPhone: "",
          contactEmail: "",
          rating: null,
          notes: "",
          active: true,
        }
      );
    }
  }, [open, initial]);

  async function save() {
    if (!form.name || form.name.length < 2) {
      toast.error("اسم الناشر مطلوب");
      return;
    }
    setSaving(true);
    try {
      const url = form.id ? `/api/publishers/${form.id}` : "/api/publishers";
      const r = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success(form.id ? "تم التحديث" : "تم الإضافة");
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-saei-purple-600" />
            {form.id ? "تحرير ناشر" : "ناشر جديد"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الاسم</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>المدينة</Label>
              <Input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label>الدولة</Label>
              <Input
                value={form.country ?? ""}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <Label>جهة الاتصال</Label>
              <Input
                value={form.contactName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>الجوال</Label>
              <Input
                value={form.contactPhone ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>البريد</Label>
              <Input
                type="email"
                value={form.contactEmail ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
              />
            </div>
            <div>
              <Label>التقييم (١-٥)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.rating ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rating: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
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
