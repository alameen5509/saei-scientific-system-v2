"use client";

// نافذة إنشاء أمر طباعة لعمل علمي معتمد
import { useEffect, useState } from "react";
import { Printer, Loader2, Save } from "lucide-react";
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
  publishers: { id: string; name: string }[];
  onSaved?: () => void;
}

interface WorkOpt {
  id: string;
  code: string;
  title: string;
}

export function PrintingJobDialog({
  open,
  onOpenChange,
  publishers,
  onSaved,
}: Props) {
  const toast = useToast();
  const [works, setWorks] = useState<WorkOpt[]>([]);
  const [workId, setWorkId] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [copies, setCopies] = useState(0);
  const [cost, setCost] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // جلب الأعمال في مرحلة APPROVED أو IN_PRODUCTION (المرشحة للطباعة)
    void (async () => {
      try {
        const r = await fetch(
          "/api/works?stage=APPROVED,IN_PRODUCTION&limit=100",
          { cache: "no-store" }
        );
        const j = await r.json();
        if (j.ok && Array.isArray(j.works)) {
          setWorks(
            j.works.map((w: WorkOpt) => ({
              id: w.id,
              code: w.code,
              title: w.title,
            }))
          );
        }
      } catch {
        // ignore
      }
    })();
    setWorkId("");
    setPublisherId(publishers[0]?.id ?? "");
    setCopies(0);
    setCost("");
    setExpectedDeliveryAt("");
    setNotes("");
  }, [open, publishers]);

  async function save() {
    if (!workId) {
      toast.error("اختر العمل العلمي");
      return;
    }
    if (!publisherId) {
      toast.error("اختر الناشر");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/printing-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workId,
          publisherId,
          copies: Number(copies) || 0,
          cost: cost ? Number(cost) : undefined,
          expectedDeliveryAt: expectedDeliveryAt || undefined,
          notes: notes || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("تم إنشاء أمر الطباعة");
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
            <Printer className="h-5 w-5 text-saei-purple-600" />
            أمر طباعة جديد
          </DialogTitle>
          <DialogDescription>
            يبدأ من مرحلة "استلام الملف" — انقل المرحلة لاحقاً من القائمة الرئيسية
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>العمل العلمي</Label>
            <Select value={workId} onValueChange={setWorkId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عملاً مُعتَمداً" />
              </SelectTrigger>
              <SelectContent>
                {works.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-stone-500">
                    لا أعمال جاهزة للطباعة
                  </div>
                ) : (
                  works.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} — {w.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الناشر</Label>
            <Select value={publisherId} onValueChange={setPublisherId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر ناشراً" />
              </SelectTrigger>
              <SelectContent>
                {publishers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>عدد النسخ</Label>
              <Input
                type="number"
                min={0}
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>التكلفة (ر.س)</Label>
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>تاريخ التسليم المتوقع</Label>
            <Input
              type="date"
              value={expectedDeliveryAt}
              onChange={(e) => setExpectedDeliveryAt(e.target.value)}
            />
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
