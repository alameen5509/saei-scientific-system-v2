// خدمة إشعارات داخل التطبيق — تكتب صفوفاً في Notification
// — لاحقاً: hook لـResend/SendGrid لإرسال البريد عند ضبط مفاتيح API
import { prisma } from "@/lib/prisma";
import type { NotificationKind } from "@/generated/prisma/enums";

interface CreateNotifyArgs {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
}

/** إنشاء إشعار واحد لمستخدم محدد */
export async function notify(args: CreateNotifyArgs) {
  return prisma.notification.create({
    data: {
      userId: args.userId,
      kind: args.kind,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null,
      metadata: (args.metadata ?? null) as never,
    },
  });
}

/** إشعار جماعي لقائمة من المستخدمين */
export async function notifyMany(
  userIds: string[],
  args: Omit<CreateNotifyArgs, "userId">
) {
  if (userIds.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      kind: args.kind,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null,
      metadata: (args.metadata ?? null) as never,
    })),
  });
}

/** إشعار كل المستخدمين بدور معيّن (مثل المنسقين) */
export async function notifyRole(
  role: "ADMIN" | "RESEARCH_COORDINATOR" | "JOURNAL_COORDINATOR" | "RESEARCHER" | "REVIEWER",
  args: Omit<CreateNotifyArgs, "userId">
) {
  const users = await prisma.user.findMany({
    where: { role },
    select: { id: true },
  });
  return notifyMany(users.map((u) => u.id), args);
}

/** placeholder للبريد الإلكتروني — يطبع log فقط؛ يُستبدل بـResend لاحقاً */
export function emailPlaceholder(to: string, subject: string, body: string) {
  console.log(`[EMAIL placeholder] to=${to} subject=${subject}`);
  console.log(`  body: ${body.slice(0, 200)}${body.length > 200 ? "…" : ""}`);
  // TODO: استبدل بـResend SDK عند إضافة RESEND_API_KEY
}
