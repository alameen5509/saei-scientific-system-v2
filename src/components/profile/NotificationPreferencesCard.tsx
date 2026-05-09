"use client";

// قسم تفضيلات الإشعارات داخل صفحة الملف الشخصي
import { useEffect, useState } from "react";
import { Bell, Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const KIND_LABEL: Record<string, string> = {
  STAGE_CHANGED: "نقل مرحلة عمل",
  REVIEW_ASSIGNED: "إسناد مراجعة",
  REVIEW_SUBMITTED: "تسليم مراجعة",
  SUBMISSION_RECEIVED: "تسليم نسخة",
  DEADLINE_APPROACHING: "اقتراب موعد",
  DEADLINE_OVERDUE: "تجاوز موعد",
  CONTRACT_SIGNED: "توقيع عقد",
  CONTRACT_SENT: "إرسال عقد",
  ANNOUNCEMENT_PUBLISHED: "إعلان جديد",
  APPLICANT_ACCEPTED: "قبول متقدم",
  APPLICANT_REJECTED: "اعتذار عن متقدم",
  PRINTING_STAGE_CHANGED: "تغيّر مرحلة طباعة",
  REPORT_READY: "تقرير جاهز",
  GENERIC: "إشعارات عامة",
};

interface Pref {
  kind: string;
  inApp: boolean;
  email: boolean;
}

export function NotificationPreferencesCard() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/notification-preferences", {
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error);
        setPrefs(j.preferences);
      } catch (e) {
        toast.error("فشل تحميل التفضيلات", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  function toggle(kind: string, channel: "inApp" | "email") {
    setPrefs((prev) =>
      prev.map((p) =>
        p.kind === kind ? { ...p, [channel]: !p[channel] } : p
      )
    );
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("تم حفظ التفضيلات");
    } catch (e) {
      toast.error("فشل الحفظ", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          تفضيلات الإشعارات
        </CardTitle>
        <CardDescription>
          اختر القنوات (داخل التطبيق / البريد) لكل نوع إشعار
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ التحميل...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {prefs.map((p) => (
                <div
                  key={p.kind}
                  className="flex items-center justify-between rounded-xl border border-saei-purple-100 px-3 py-2"
                >
                  <span className="text-sm font-bold text-saei-purple-700">
                    {KIND_LABEL[p.kind] ?? p.kind}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.inApp}
                        onChange={() => toggle(p.kind, "inApp")}
                      />
                      داخل
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.email}
                        onChange={() => toggle(p.kind, "email")}
                      />
                      بريد
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={save}
              disabled={saving}
              className="mt-4"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ التفضيلات
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
