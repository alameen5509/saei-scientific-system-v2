// إعدادات النظام — لـADMIN فقط
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings as SettingsIcon,
  Mail,
  Workflow,
  Bell,
  Palette,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { STAGE_LABEL } from "@/types/works";
import { toArabicDigits } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEFAULT_KEYS: { key: string; description: string; placeholder: string }[] =
  [
    {
      key: "deadline_reminder_days",
      description: "عدد الأيام قبل الموعد لتفعيل التذكير (افتراضي 7)",
      placeholder: "7",
    },
    {
      key: "auto_archive_after_days",
      description:
        "أرشفة الأعمال المنشورة تلقائياً بعد عدد أيام (0 = معطّل)",
      placeholder: "365",
    },
    {
      key: "default_review_due_days",
      description: "افتراضي للموعد النهائي للتحكيم بأيام (افتراضي 14)",
      placeholder: "14",
    },
    {
      key: "max_reviewers_per_work",
      description: "الحد الأقصى لعدد المحكمين لكل عمل (افتراضي 3)",
      placeholder: "3",
    },
  ];

export default async function SettingsPage() {
  const [stages, settings] = await Promise.all([
    prisma.workflowStage.findMany({ orderBy: { order: "asc" } }),
    prisma.systemSetting.findMany(),
  ]);
  const settingsMap = new Map(settings.map((s) => [s.key, s]));
  const initialItems = DEFAULT_KEYS.map((d) => ({
    key: d.key,
    description: d.description,
    placeholder: d.placeholder,
    value: settingsMap.get(d.key)?.value as string | number | undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
          <SettingsIcon className="h-7 w-7" />
          إعدادات النظام
        </h1>
        <p className="text-stone-600 text-sm">
          إعدادات إدارية حساسة — للمدير فقط
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/settings/branding">
          <Card className="h-full hover:border-saei-purple-300 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-saei-purple-600" />
                الهوية البصرية
              </CardTitle>
              <CardDescription>
                ألوان وخطوط النظام (CSS variables)
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/settings/escalation">
          <Card className="h-full hover:border-saei-purple-300 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronUp className="h-5 w-5 text-saei-teal" />
                قواعد التصاعد
              </CardTitle>
              <CardDescription>
                تصاعد الإشعارات غير المقروءة لأدوار أعلى
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/settings/sms">
          <Card className="h-full hover:border-saei-purple-300 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-saei-gold-700" />
                لوحة SMS
              </CardTitle>
              <CardDescription>
                سجل وإحصاءات الرسائل النصية (Twilio)
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-saei-teal" />
            الإعدادات العامة
          </CardTitle>
          <CardDescription>
            قيم رقمية تتحكم بسلوك النظام (التذكيرات، الأرشفة، الافتراضيات)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm items={initialItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-saei-purple-600" />
            مراحل سير العمل ({toArabicDigits(stages.length)})
          </CardTitle>
          <CardDescription>
            مرجعية المراحل المعرَّفة في النظام (للقراءة — تعديلها يحتاج migration)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {stages.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-saei-purple-100 px-3 py-2"
              >
                <Badge variant="purple">{toArabicDigits(s.order)}</Badge>
                <div className="flex-1">
                  <div className="font-bold text-saei-purple-700">
                    {s.label}
                  </div>
                  <div className="text-xs text-stone-500 ltr text-left">
                    {s.code}
                  </div>
                </div>
              </li>
            ))}
            {stages.length === 0 &&
              Object.entries(STAGE_LABEL).map(([code, label], idx) => (
                <li
                  key={code}
                  className="flex items-center gap-3 rounded-xl border border-saei-purple-100 px-3 py-2"
                >
                  <Badge variant="purple">{toArabicDigits(idx + 1)}</Badge>
                  <div className="flex-1">
                    <div className="font-bold text-saei-purple-700">
                      {label}
                    </div>
                    <div className="text-xs text-stone-500 ltr text-left">
                      {code}
                    </div>
                  </div>
                  <Badge variant="amber">من types/works.ts</Badge>
                </li>
              ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-saei-gold-700" />
            قوالب البريد
          </CardTitle>
          <CardDescription>
            القوالب مُعرَّفة في <code>src/lib/email.ts</code> ولها ٦ أنواع جاهزة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ["stageChanged", "تغيير المرحلة"],
              ["reviewAssigned", "إسناد التحكيم"],
              ["submissionReceived", "استلام تسليم"],
              ["deadlineApproaching", "اقتراب الموعد"],
              ["deadlineOverdue", "تجاوز الموعد"],
              ["contractSigned", "توقيع عقد"],
            ].map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl border border-saei-purple-100 p-3"
              >
                <div className="font-bold text-saei-purple-700">{label}</div>
                <div className="text-xs text-stone-500 ltr text-left">
                  templates.{key}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            تحرير محتوى القوالب يتم بتحديث ملف <code>email.ts</code> ونشر التطبيق.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
