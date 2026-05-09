"use client";

// إدارة قواعد تصاعد الإشعارات
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Bell,
  Plus,
  Trash2,
  Loader2,
  ChevronUp,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toArabicDigits } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  STAGE_CHANGED: "نقل مرحلة",
  REVIEW_ASSIGNED: "إسناد تحكيم",
  REVIEW_SUBMITTED: "تسليم تحكيم",
  SUBMISSION_RECEIVED: "تسليم نسخة",
  DEADLINE_APPROACHING: "اقتراب موعد",
  DEADLINE_OVERDUE: "تجاوز موعد",
  CONTRACT_SIGNED: "توقيع عقد",
  CONTRACT_SENT: "إرسال عقد",
  ANNOUNCEMENT_PUBLISHED: "نشر إعلان",
  APPLICANT_ACCEPTED: "قبول متقدم",
  APPLICANT_REJECTED: "اعتذار متقدم",
  PRINTING_STAGE_CHANGED: "مرحلة طباعة",
  REPORT_READY: "تقرير جاهز",
  GENERIC: "عام",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "مدير النظام",
  RESEARCH_COORDINATOR: "منسق الأبحاث",
  JOURNAL_COORDINATOR: "منسق المجلة",
  PRINTING_MANAGER: "مدير الطباعة",
  RESEARCHER: "باحث",
  REVIEWER: "محكم",
};

interface Rule {
  id: string;
  name: string;
  kind: string;
  triggerAfterHours: number;
  level: number;
  escalateToRoles: string[];
  emailEnabled: boolean;
  smsEnabled: boolean;
  active: boolean;
}

export default function EscalationPage() {
  const toast = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/escalation-rules", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      setRules(j.rules);
    } catch (e) {
      toast.error("فشل التحميل", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function addRule() {
    try {
      const r = await fetch("/api/escalation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "قاعدة جديدة",
          kind: "DEADLINE_OVERDUE",
          triggerAfterHours: 24,
          level: 1,
          escalateToRoles: ["RESEARCH_COORDINATOR"],
          emailEnabled: true,
          smsEnabled: false,
          active: true,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("أُضيفت قاعدة");
      await refetch();
    } catch (e) {
      toast.error("فشلت الإضافة", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function updateRule(rule: Rule) {
    try {
      const r = await fetch(`/api/escalation-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
    } catch (e) {
      toast.error("فشل الحفظ", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("حذف هذه القاعدة؟")) return;
    try {
      const r = await fetch(`/api/escalation-rules/${id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("حُذفت القاعدة");
      await refetch();
    } catch (e) {
      toast.error("فشل الحذف", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  function setRuleField<K extends keyof Rule>(id: string, k: K, v: Rule[K]) {
    setRules((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [k]: v };
        void updateRule(updated);
        return updated;
      })
    );
  }

  function toggleRole(rule: Rule, role: string) {
    const next = rule.escalateToRoles.includes(role)
      ? rule.escalateToRoles.filter((r) => r !== role)
      : [...rule.escalateToRoles, role];
    setRuleField(rule.id, "escalateToRoles", next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
            <ChevronUp className="h-7 w-7" />
            قواعد تصاعد الإشعارات
          </h1>
          <p className="text-stone-600 text-sm">
            عند بقاء الإشعار غير مقروء لفترة، يتصاعد تلقائياً لمستلمين جدد —
            يطبَّق عبر cron الـdeadline check (يومياً 6:00 UTC)
          </p>
        </div>
        <Button variant="primary" onClick={addRule}>
          <Plus className="h-4 w-4" />
          قاعدة جديدة
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          جارٍ التحميل...
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-stone-500">
            لا قواعد تصاعد مُعرَّفة بعد. ابدأ بإضافة واحدة.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={rule.name}
                      onChange={(e) =>
                        setRuleField(rule.id, "name", e.target.value)
                      }
                      className="font-bold text-base"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.active}
                        onChange={(e) =>
                          setRuleField(rule.id, "active", e.target.checked)
                        }
                      />
                      نشطة
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteRule(rule.id)}
                      className="h-8 w-8 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">نوع الإشعار</Label>
                    <select
                      className="w-full rounded-xl border border-saei-purple-100 bg-white px-3 py-2 text-sm"
                      value={rule.kind}
                      onChange={(e) =>
                        setRuleField(rule.id, "kind", e.target.value)
                      }
                    >
                      {Object.entries(KIND_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">يُفعَّل بعد (ساعة)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rule.triggerAfterHours}
                      onChange={(e) =>
                        setRuleField(
                          rule.id,
                          "triggerAfterHours",
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">المستوى</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={rule.level}
                      onChange={(e) =>
                        setRuleField(rule.id, "level", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">يتصاعد إلى الأدوار</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(ROLE_LABEL).map(([k, v]) => {
                      const active = rule.escalateToRoles.includes(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => toggleRole(rule, k)}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                            active
                              ? "bg-saei-purple text-white border-saei-purple"
                              : "bg-white text-stone-600 border-saei-purple-100 hover:bg-saei-purple-50"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.emailEnabled}
                      onChange={(e) =>
                        setRuleField(rule.id, "emailEnabled", e.target.checked)
                      }
                    />
                    <Mail className="h-4 w-4" /> بريد
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.smsEnabled}
                      onChange={(e) =>
                        setRuleField(rule.id, "smsEnabled", e.target.checked)
                      }
                    />
                    <MessageSquare className="h-4 w-4" /> SMS
                    <Badge variant="amber" className="text-xs">
                      يحتاج Twilio
                    </Badge>
                  </label>
                  <Badge variant="purple">
                    L{toArabicDigits(rule.level)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
