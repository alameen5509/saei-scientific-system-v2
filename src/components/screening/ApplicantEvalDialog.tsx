"use client";

// نافذة تقييم متقدم — درجات (0-100) + تصنيف نهائي
import { useEffect, useState } from "react";
import { Award, Loader2, Save } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { toArabicDigits } from "@/lib/utils";

type Classification =
  | "PENDING"
  | "SUITABLE"
  | "PARTIALLY_SUITABLE"
  | "UNSUITABLE";

interface Applicant {
  id: string;
  fullName: string;
  classification: Classification;
  scoreExpertise?: number | null;
  scorePublications?: number | null;
  scoreFit?: number | null;
}

interface Props {
  applicant: Applicant | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

export function ApplicantEvalDialog({
  applicant,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const toast = useToast();
  const [scoreE, setScoreE] = useState(0);
  const [scoreP, setScoreP] = useState(0);
  const [scoreF, setScoreF] = useState(0);
  const [classification, setClassification] = useState<Classification>("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && applicant) {
      setScoreE(applicant.scoreExpertise ?? 0);
      setScoreP(applicant.scorePublications ?? 0);
      setScoreF(applicant.scoreFit ?? 0);
      setClassification(applicant.classification);
      setNotes("");
    }
  }, [open, applicant]);

  // محاكاة Total على الـclient لإظهارها فوراً
  const computed = Math.round(
    (scoreE * 50 + scoreP * 30 + scoreF * 20) / 100
  );

  async function save() {
    if (!applicant) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/applicants/${applicant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreExpertise: scoreE,
          scorePublications: scoreP,
          scoreFit: scoreF,
          classification,
          notes: notes || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("تم حفظ التقييم");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-saei-gold-700" />
            تقييم {applicant?.fullName ?? ""}
          </DialogTitle>
          <DialogDescription>
            الأوزان: الخبرة {toArabicDigits(50)}٪ · النشر {toArabicDigits(30)}٪ · الملاءمة {toArabicDigits(20)}٪
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>الخبرة والاختصاص (٠ - ١٠٠)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={scoreE}
              onChange={(e) => setScoreE(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>سجل المنشورات (٠ - ١٠٠)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={scoreP}
              onChange={(e) => setScoreP(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>الملاءمة للموضوع (٠ - ١٠٠)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={scoreF}
              onChange={(e) => setScoreF(Number(e.target.value))}
            />
          </div>

          <div className="rounded-xl bg-saei-purple-50 p-3 flex items-center justify-between">
            <span className="font-bold text-saei-purple-700">
              الدرجة الكلية المرجَّحة
            </span>
            <Badge variant="purple" className="text-lg">
              {toArabicDigits(computed)}/{toArabicDigits(100)}
            </Badge>
          </div>

          <div>
            <Label>التصنيف النهائي</Label>
            <Select
              value={classification}
              onValueChange={(v) => setClassification(v as Classification)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">قيد الفرز</SelectItem>
                <SelectItem value="SUITABLE">مناسب — مقبول</SelectItem>
                <SelectItem value="PARTIALLY_SUITABLE">مناسب جزئياً</SelectItem>
                <SelectItem value="UNSUITABLE">غير مناسب — معتذر</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-stone-500 mt-1">
              ملاحظة: عند تصنيف "مناسب" أو "غير مناسب" يُرسَل بريد للمتقدم تلقائياً (إن كان لديه بريد).
            </p>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات داخلية..."
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
            حفظ التقييم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
