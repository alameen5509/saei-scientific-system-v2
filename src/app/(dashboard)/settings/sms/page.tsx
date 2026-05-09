"use client";

// لوحة استخدام SMS — للمدير فقط
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { MessageSquare, Loader2 } from "lucide-react";
import { toArabicDigits, formatDate } from "@/lib/utils";

interface Log {
  id: string;
  toNumber: string;
  body: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  provider?: string | null;
  providerId?: string | null;
  errorMessage?: string | null;
  cost?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<Log["status"], "gray" | "amber" | "green" | "red"> = {
  QUEUED: "gray",
  SENT: "amber",
  DELIVERED: "green",
  FAILED: "red",
};

export default function SmsDashboardPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState({
    sent: 0,
    failed: 0,
    totalCost: 0,
  });
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/sms-logs", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error);
        setLogs(j.logs);
        setStats(j.stats);
        setConfigured(j.configured);
      } catch (e) {
        toast.error("فشل التحميل", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
          <MessageSquare className="h-7 w-7" />
          سجل SMS
        </h1>
        <p className="text-stone-600 text-sm">
          مراقبة استخدام SMS عبر Twilio — يحتاج TWILIO_* متغيّرات في .env
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          {configured ? (
            <Badge variant="green">Twilio مُهيّأ ✓</Badge>
          ) : (
            <div className="space-y-2">
              <Badge variant="amber">Twilio غير مُهيّأ</Badge>
              <p className="text-sm text-stone-600">
                لتفعيل SMS، أضف هذه المتغيّرات في <code>.env</code> ثم أعد التشغيل:
              </p>
              <pre className="text-xs bg-saei-purple-50 rounded-lg p-3 ltr text-left">
                TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
              </pre>
              <p className="text-xs text-stone-500">
                إن لم تكن Twilio متاحة، يستخدم النظام البريد كـ fallback تلقائياً.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>أُرسل بنجاح</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {toArabicDigits(stats.sent)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>فشل</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {toArabicDigits(stats.failed)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>التكلفة التقديرية</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              ${stats.totalCost.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أحدث {toArabicDigits(logs.length)} رسالة</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-stone-500 py-12 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ التحميل...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-stone-500">
              لا رسائل في السجل بعد.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-saei-purple-50 text-saei-purple-700">
                <tr className="text-right">
                  <th className="py-3 px-3 font-bold">التاريخ</th>
                  <th className="py-3 px-3 font-bold">الرقم</th>
                  <th className="py-3 px-3 font-bold">المحتوى</th>
                  <th className="py-3 px-3 font-bold">الحالة</th>
                  <th className="py-3 px-3 font-bold">المزوّد</th>
                  <th className="py-3 px-3 font-bold">التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-saei-purple-50 hover:bg-saei-purple-50/30"
                  >
                    <td className="py-2 px-3 text-xs">
                      {formatDate(l.createdAt)}
                    </td>
                    <td className="py-2 px-3 ltr text-left">{l.toNumber}</td>
                    <td className="py-2 px-3 max-w-xs truncate">{l.body}</td>
                    <td className="py-2 px-3">
                      <Badge variant={STATUS_TONE[l.status]}>{l.status}</Badge>
                      {l.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">
                          {l.errorMessage.slice(0, 60)}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-stone-600">
                      {l.provider ?? "—"}
                    </td>
                    <td className="py-2 px-3 tabular-nums">
                      {l.cost ? `$${l.cost}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
