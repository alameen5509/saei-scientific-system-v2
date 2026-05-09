"use client";

// نافذة إضافة متقدم — تربطه بإعلان
import { useEffect, useState } from "react";
import { UserPlus, Loader2, Save } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  announcements: { id: string; title: string }[];
  onSaved?: () => void;
}

const empty = {
  announcementId: "",
  fullName: "",
  email: "",
  phone: "",
  qualifications: "",
  cvText: "",
  publicationsCount: 0,
  yearsExperience: 0,
};

export function ApplicantDialog({
  open,
  onOpenChange,
  announcements,
  onSaved,
}: Props) {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        ...empty,
        announcementId: announcements[0]?.id ?? "",
      });
    }
  }, [open, announcements]);

  async function save() {
    if (!form.announcementId) {
      toast.error("اختر إعلاناً");
      return;
    }
    if (form.fullName.length < 2) {
      toast.error("الاسم مطلوب");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("تمت الإضافة");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("فشلت الإضافة", {
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
            <UserPlus className="h-5 w-5 text-saei-purple-600" />
            إضافة متقدم جديد
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الإعلان</Label>
            <Select
              value={form.announcementId}
              onValueChange={(v) => setForm({ ...form, announcementId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر إعلاناً" />
              </SelectTrigger>
              <SelectContent>
                {announcements.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الاسم الكامل</Label>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>البريد</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>الجوال</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>عدد المنشورات</Label>
              <Input
                type="number"
                min={0}
                value={form.publicationsCount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    publicationsCount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>سنوات الخبرة</Label>
              <Input
                type="number"
                min={0}
                value={form.yearsExperience}
                onChange={(e) =>
                  setForm({ ...form, yearsExperience: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <Label>المؤهلات</Label>
            <Input
              value={form.qualifications}
              onChange={(e) =>
                setForm({ ...form, qualifications: e.target.value })
              }
              placeholder="درجة الدكتوراه، تخصص..."
            />
          </div>
          <div>
            <Label>ملخص السيرة (اختياري)</Label>
            <Textarea
              rows={4}
              value={form.cvText}
              onChange={(e) => setForm({ ...form, cvText: e.target.value })}
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
