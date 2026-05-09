"use client";

// إدارة إعلانات الأولويات البحثية
import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, Pencil, Send, Archive, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { AnnouncementDialog } from "@/components/announcements/AnnouncementDialog";
import { toArabicDigits, formatDate } from "@/lib/utils";
import { SPECIALTY_LABEL } from "@/types/works";

type Status = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
const STATUS_LABEL: Record<Status, string> = {
  DRAFT: "مسودّة",
  PUBLISHED: "منشور",
  CLOSED: "أُغلق",
  ARCHIVED: "مؤرشف",
};
const STATUS_TONE: Record<Status, "gray" | "teal" | "amber" | "purple"> = {
  DRAFT: "gray",
  PUBLISHED: "teal",
  CLOSED: "amber",
  ARCHIVED: "purple",
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  requirements?: string | null;
  specialty?: string | null;
  targetCount: number;
  status: Status;
  publishedAt?: string | null;
  applyDeadline?: string | null;
  createdAt: string;
  _count: { applicants: number };
}

export default function AnnouncementsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/announcements", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "تعذّر التحميل");
      setItems(j.announcements);
    } catch (e) {
      toast.error("فشل تحميل الإعلانات", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function publishItem(id: string) {
    try {
      const r = await fetch(`/api/announcements/${id}/publish`, {
        method: "POST",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("تم النشر — أُخطر المنسقون");
      await refetch();
    } catch (e) {
      toast.error("فشل النشر", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function archiveItem(id: string) {
    if (!confirm("سيُؤرشف هذا الإعلان. هل أنت متأكد؟")) return;
    try {
      const r = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("تمّت الأرشفة");
      await refetch();
    } catch (e) {
      toast.error("فشلت الأرشفة", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
            <Megaphone className="h-7 w-7" />
            إعلانات الأولويات البحثية
          </h1>
          <p className="text-stone-600 text-sm">
            استقطاب الباحثين لأعمال علمية محددة بمعايير واضحة
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          إعلان جديد
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          جارٍ التحميل...
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-stone-500">
            لا توجد إعلانات بعد. ابدأ بإنشاء إعلان جديد.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{a.title}</CardTitle>
                  <Badge variant={STATUS_TONE[a.status]}>
                    {STATUS_LABEL[a.status]}
                  </Badge>
                </div>
                <div
                  className="text-sm text-stone-600 line-clamp-3 [&_*]:inline"
                  dir="rtl"
                  dangerouslySetInnerHTML={{
                    __html: a.body
                      .replace(/<[^>]+>/g, " ")
                      .replace(/\s+/g, " ")
                      .slice(0, 240),
                  }}
                />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.specialty && (
                    <Badge variant="purple">
                      {SPECIALTY_LABEL[
                        a.specialty as keyof typeof SPECIALTY_LABEL
                      ] ?? a.specialty}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    العدد المستهدف: {toArabicDigits(a.targetCount)}
                  </Badge>
                  <Badge variant="outline">
                    المتقدمون: {toArabicDigits(a._count.applicants)}
                  </Badge>
                </div>
                {a.applyDeadline && (
                  <p className="text-stone-600">
                    آخر موعد للتقديم: {formatDate(a.applyDeadline)}
                  </p>
                )}
                {a.publishedAt && (
                  <p className="text-stone-500 text-xs">
                    نُشر: {formatDate(a.publishedAt)}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-saei-purple-50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(a);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    تحرير
                  </Button>
                  {a.status === "DRAFT" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => publishItem(a.id)}
                    >
                      <Send className="h-4 w-4" />
                      نشر
                    </Button>
                  )}
                  {a.status !== "ARCHIVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveItem(a.id)}
                    >
                      <Archive className="h-4 w-4" />
                      أرشفة
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing as unknown as Record<string, unknown> | null}
        onSaved={() => void refetch()}
      />
    </div>
  );
}
