// مهامي — view ذكي يجمع الإجراءات المعلَّقة لكل دور من DB
// — للباحث: تسليماته
// — للمحكم: مراجعاته
// — للمنسق/المدير: إسنادات/قرارات/تسليمات/متأخرات
import Link from "next/link";
import {
  CheckSquare,
  AlertTriangle,
  FileUp,
  ClipboardCheck,
  UserCheck,
  Gavel,
  Inbox,
  ArrowLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/api-auth";
import { loadPersonalTasks, type PersonalTask, type TaskKind } from "@/lib/tasks-data";
import { ROLE_LABEL } from "@/lib/rbac";
import { toArabicDigits, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<TaskKind, typeof FileUp> = {
  PENDING_SUBMISSION: FileUp,
  PENDING_REVISION: FileUp,
  PENDING_REVIEW: ClipboardCheck,
  NEEDS_REVIEWER_ASSIGN: UserCheck,
  NEEDS_DECISION: Gavel,
  OVERDUE_WORK: AlertTriangle,
  NEW_SUBMISSION: Inbox,
};

const KIND_TONE: Record<TaskKind, "purple" | "amber" | "teal" | "red" | "gold" | "green"> = {
  PENDING_SUBMISSION: "purple",
  PENDING_REVISION: "amber",
  PENDING_REVIEW: "teal",
  NEEDS_REVIEWER_ASSIGN: "gold",
  NEEDS_DECISION: "red",
  OVERDUE_WORK: "red",
  NEW_SUBMISSION: "green",
};

const PRI_TONE: Record<PersonalTask["priority"], "red" | "amber" | "gray"> = {
  high: "red",
  medium: "amber",
  low: "gray",
};

const PRI_LABEL: Record<PersonalTask["priority"], string> = {
  high: "عاجلة",
  medium: "متوسطة",
  low: "منخفضة",
};

export default async function TasksPage() {
  const me = await requireAuth();
  if (!me) {
    redirect("/login?callbackUrl=/tasks");
  }
  const tasks = await loadPersonalTasks({ userId: me.id, role: me.role });

  // عدّ حسب الأولوية
  const counts = {
    high: tasks.filter((t) => t.priority === "high").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    low: tasks.filter((t) => t.priority === "low").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
          <CheckSquare className="h-7 w-7" />
          مهامّي
        </h1>
        <p className="text-stone-600 text-sm">
          الإجراءات المعلَّقة المخصَّصة لك ({ROLE_LABEL[me.role]}). تتحدّث تلقائياً كل تحميل.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <div className="h-10 w-10 rounded-xl bg-red-100 grid place-items-center text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>عاجلة</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(counts.high)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center text-amber-700">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>متوسطة</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(counts.medium)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <div className="h-10 w-10 rounded-xl bg-stone-100 grid place-items-center text-stone-600">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>منخفضة</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(counts.low)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-stone-500 space-y-2">
            <CheckSquare className="h-12 w-12 mx-auto text-saei-teal opacity-60" />
            <p className="font-bold text-saei-purple-700">لا مهام معلَّقة لديك ✨</p>
            <p className="text-sm">
              {me.role === "RESEARCHER"
                ? "كل أعمالك في حالة ممتازة — لا تسليمات معلَّقة الآن."
                : me.role === "REVIEWER"
                ? "لم تُسنَد إليك مراجعات جديدة. عُد لاحقاً."
                : "كل الإجراءات منجزة — لا أعمال متأخرة أو في انتظار قرار."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const Icon = KIND_ICON[t.kind];
            const overdue = t.daysLeft !== undefined && t.daysLeft < 0;
            return (
              <Card
                key={t.id}
                className={`transition-colors ${
                  t.priority === "high"
                    ? "border-red-200"
                    : t.priority === "medium"
                    ? "border-amber-200"
                    : ""
                }`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
                      KIND_TONE[t.kind] === "red"
                        ? "bg-red-100 text-red-700"
                        : KIND_TONE[t.kind] === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : KIND_TONE[t.kind] === "teal"
                        ? "bg-saei-teal/15 text-saei-teal"
                        : KIND_TONE[t.kind] === "gold"
                        ? "bg-saei-gold/15 text-saei-gold-700"
                        : KIND_TONE[t.kind] === "green"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-saei-purple/10 text-saei-purple-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-saei-purple-700">
                        {t.title}
                      </span>
                      <Badge variant={PRI_TONE[t.priority]}>
                        {PRI_LABEL[t.priority]}
                      </Badge>
                      {t.daysLeft !== undefined && (
                        <Badge variant={overdue ? "red" : "outline"}>
                          {overdue
                            ? `متأخر ${toArabicDigits(Math.abs(t.daysLeft))} يوم`
                            : `${toArabicDigits(t.daysLeft)} يوم متبقّ`}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-stone-700 mt-1 truncate">
                      <span className="font-mono text-xs ltr text-saei-purple-600">
                        {t.workCode}
                      </span>{" "}
                      — {t.workTitle}
                    </div>
                    {t.deadline && (
                      <div className="text-xs text-stone-500 mt-0.5">
                        الموعد: {formatDate(t.deadline)}
                      </div>
                    )}
                  </div>
                  <Link href={t.link}>
                    <Button variant="outline" size="sm">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      افتح
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
