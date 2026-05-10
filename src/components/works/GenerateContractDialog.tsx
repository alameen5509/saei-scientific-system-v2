"use client";

// نافذة توليد عقد من بيانات عمل علمي
// — اختيار نوع العقد (RESEARCH / PUBLISHING / EDITING) ثم POST → redirect لتحريره
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  FileText,
  Printer,
  PenSquare,
  Loader2,
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
import { useToast } from "@/components/ui/toast";
import type { ScientificWork } from "@/types/works";

type Kind = "RESEARCH" | "PUBLISHING" | "EDITING";

const KIND_INFO: Record<
  Kind,
  { label: string; description: string; icon: typeof FileText }
> = {
  RESEARCH: {
    label: "عقد إعداد عمل علمي",
    description: "بين المؤسسة والباحث — تسليمات + مدة + مقابل",
    icon: FileText,
  },
  PUBLISHING: {
    label: "عقد نشر/طباعة",
    description: "بين المؤسسة والناشر — كميات + توزيع + معايير",
    icon: Printer,
  },
  EDITING: {
    label: "عقد تحرير وتدقيق",
    description: "مراجعة لغوية ومنهجية للعمل",
    icon: PenSquare,
  },
};

interface Props {
  work: ScientificWork | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GenerateContractDialog({ work, open, onOpenChange }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<Kind | null>(null);

  async function generate(kind: Kind) {
    if (!work) return;
    setSubmitting(kind);
    try {
      const r = await fetch(`/api/contracts/from-work/${work.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "تعذّر إنشاء العقد");
      toast.success("تمّ إنشاء العقد", {
        description: "أُنشئ في حالة مسودّة وجاهز للتعديل",
      });
      onOpenChange(false);
      router.push(`/contracts/${j.contract.id}`);
    } catch (e) {
      toast.error("فشل إنشاء العقد", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-saei-purple-600" />
            إنشاء عقد من العمل
          </DialogTitle>
          <DialogDescription>
            {work ? (
              <>
                <span className="font-mono text-xs ltr text-saei-purple-600">
                  {work.code}
                </span>{" "}
                — {work.title}
              </>
            ) : (
              "اختر نوع العقد"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {(Object.keys(KIND_INFO) as Kind[]).map((k) => {
            const info = KIND_INFO[k];
            const Icon = info.icon;
            const busy = submitting === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => void generate(k)}
                disabled={!!submitting}
                className="w-full text-right flex items-start gap-3 rounded-xl border border-saei-purple-100 p-3 hover:bg-saei-purple-50 hover:border-saei-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="h-10 w-10 rounded-xl bg-saei-purple/10 grid place-items-center text-saei-purple-700 shrink-0">
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-saei-purple-700">
                    {info.label}
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">
                    {info.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-stone-500">
          سيُنشأ العقد في حالة <strong>مسودّة</strong> ببيانات العمل والباحث
          مُعبَّأة، ثم تُحوَّل لصفحة تحريره مباشرةً.
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={!!submitting}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
