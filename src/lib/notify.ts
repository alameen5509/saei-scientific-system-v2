// خدمة إشعارات داخل التطبيق — تكتب صفوفاً في Notification
// + ترسل بريداً عبر Resend عند توفّر RESEND_API_KEY
// + تحترم تفضيلات المستخدم (NotificationPreference) لكل نوع
import { prisma } from "@/lib/prisma";
import type { NotificationKind } from "@/generated/prisma/enums";
import { sendEmail, isEmailConfigured } from "@/lib/email";

interface CreateNotifyArgs {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
  /** قالب بريد جاهز — يُرسل بالتوازي مع تسجيل الإشعار */
  email?: {
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    actionPath?: string;
    actionLabel?: string;
  };
}

/** يجلب تفضيلات المستخدم لنوع معيّن — يعود إلى defaults (true/true) إن لم يكن هناك سجل */
async function getPrefs(
  userId: string,
  kind: NotificationKind
): Promise<{ inApp: boolean; email: boolean }> {
  const p = await prisma.notificationPreference.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  return { inApp: p?.inApp ?? true, email: p?.email ?? true };
}

async function fireEmail(userId: string, email: NonNullable<CreateNotifyArgs["email"]>) {
  if (!isEmailConfigured()) return;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!u?.email) return;
  await sendEmail({
    to: u.email,
    subject: email.subject,
    bodyHtml: email.bodyHtml,
    bodyText: email.bodyText,
    actionPath: email.actionPath,
    actionLabel: email.actionLabel,
  });
}

/** إنشاء إشعار واحد لمستخدم محدد + بريد اختياري — يحترم تفضيلات المستخدم */
export async function notify(args: CreateNotifyArgs) {
  const prefs = await getPrefs(args.userId, args.kind);
  let created = null;
  if (prefs.inApp) {
    created = await prisma.notification.create({
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
  if (args.email && prefs.email) {
    void fireEmail(args.userId, args.email);
  }
  return created;
}

/** إشعار جماعي لقائمة من المستخدمين + بريد لكل واحد */
export async function notifyMany(
  userIds: string[],
  args: Omit<CreateNotifyArgs, "userId">
) {
  if (userIds.length === 0) return { count: 0 };
  const r = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      kind: args.kind,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null,
      metadata: (args.metadata ?? null) as never,
    })),
  });
  if (args.email && isEmailConfigured()) {
    for (const userId of userIds) {
      void fireEmail(userId, args.email);
    }
  }
  return r;
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

/** إبقاء التوقيع للـcron القديم — الآن يُحوّل لـsendEmail الفعلي */
export function emailPlaceholder(to: string, subject: string, body: string) {
  if (!isEmailConfigured()) {
    console.log(`[email placeholder] to=${to} subject=${subject}`);
    return;
  }
  void sendEmail({ to, subject, bodyHtml: `<p>${body}</p>` });
}
