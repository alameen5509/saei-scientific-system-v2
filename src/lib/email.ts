// خدمة البريد الإلكتروني عبر Resend
// — تُستخدم بجانب الإشعارات داخل التطبيق، لا بديلاً عنها
// — كل القوالب RTL عربية مع HTML بسيط متوافق مع كل برامج البريد
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
const APP_NAME = "نظام ساعي";
const BASE_URL =
  process.env.NEXTAUTH_URL ?? "https://saei-scientific-system-marsa1.vercel.app";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(RESEND_API_KEY);
  return _client;
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

export interface EmailArgs {
  to: string;
  subject: string;
  /** نصّ HTML للجسم (سيُلفّ بقالب ساعي تلقائياً) */
  bodyHtml: string;
  /** نصّ نقي للعملاء التي لا تدعم HTML (اختياري) */
  bodyText?: string;
  /** مسار داخل التطبيق لزر "افتح في النظام" */
  actionPath?: string;
  /** نصّ زر الإجراء */
  actionLabel?: string;
}

/** يلفّ المحتوى بقالب RTL مع هوية ساعي */
function wrap(args: {
  bodyHtml: string;
  actionPath?: string;
  actionLabel?: string;
}): string {
  const action = args.actionPath
    ? `<div style="text-align:center;margin:24px 0">
         <a href="${BASE_URL}${args.actionPath}"
            style="display:inline-block;background:linear-gradient(135deg,#00d4dd,#0ea5e9);color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-weight:bold;font-family:Cairo,sans-serif">
           ${args.actionLabel ?? "افتح في النظام"}
         </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;direction:rtl">
  <div style="max-width:560px;margin:24px auto;padding:0 16px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #e7e5e4">
      <div style="background:linear-gradient(135deg,#00d4dd,#0ea5e9);padding:20px 24px;color:#fff">
        <h1 style="margin:0;font-size:18px;font-weight:800">${APP_NAME}</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.9">إدارة الأعمال العلمية</p>
      </div>
      <div style="padding:24px;color:#1f1b30;font-size:14px;line-height:1.7">
        ${args.bodyHtml}
        ${action}
      </div>
      <div style="background:#fafaf9;padding:12px 24px;font-size:11px;color:#78716c;border-top:1px solid #f5f5f4;text-align:center">
        هذه رسالة آلية من ${APP_NAME}. لإدارة الإشعارات، سجّل دخولك.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/** يرسل بريداً عبر Resend. لا يرمي عند فشل الإرسال — يطبع تحذير ويستمرّ */
export async function sendEmail(args: EmailArgs): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY غير مضبوط — تجاوزنا الإرسال");
    return { ok: false, error: "not configured" };
  }
  if (!args.to || !args.to.includes("@")) {
    return { ok: false, error: "invalid recipient" };
  }

  try {
    const html = wrap({
      bodyHtml: args.bodyHtml,
      actionPath: args.actionPath,
      actionLabel: args.actionLabel,
    });
    const result = await client.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html,
      text: args.bodyText,
    });
    if ("error" in result && result.error) {
      console.warn("[email] فشل الإرسال:", result.error);
      return { ok: false, error: String(result.error) };
    }
    return { ok: true, id: (result.data?.id as string | undefined) ?? undefined };
  } catch (e) {
    console.warn("[email] استثناء:", e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// ————————————————————————————————
// قوالب جاهزة لكل نوع إشعار
// ————————————————————————————————

export const templates = {
  stageChanged(args: {
    workTitle: string;
    stageLabel: string;
    workId: string;
    isResearcher: boolean;
    researcherName?: string;
  }): EmailArgs & { actionPath: string } {
    const subject = `تحديث مرحلة: ${args.workTitle}`;
    const bodyHtml = args.isResearcher
      ? `
        <p>السلام عليكم،</p>
        <p>نُعلمكم بأنّ عملكم العلمي <strong>"${args.workTitle}"</strong> انتقل إلى المرحلة الجديدة:</p>
        <p style="background:#faf5ff;border-right:4px solid #5e5495;padding:12px 16px;border-radius:8px;font-weight:bold;color:#3f3766;margin:16px 0">
          ${args.stageLabel}
        </p>
        <p>يمكنكم الاطلاع على التفاصيل والتسليمات من خلال النظام.</p>`
      : `
        <p>تحديث على عمل علمي:</p>
        <p style="background:#faf5ff;border-right:4px solid #5e5495;padding:12px 16px;border-radius:8px;margin:16px 0">
          <strong>${args.workTitle}</strong><br>
          الباحث: ${args.researcherName ?? "—"}<br>
          المرحلة: <span style="color:#3f3766;font-weight:bold">${args.stageLabel}</span>
        </p>`;
    return {
      to: "",
      subject,
      bodyHtml,
      actionPath: `/projects?work=${args.workId}`,
      actionLabel: "عرض العمل",
    };
  },

  reviewAssigned(args: {
    workCode: string;
    workTitle: string;
    dueDate?: string;
  }): EmailArgs & { actionPath: string } {
    return {
      to: "",
      subject: "تمّ إسناد عمل علمي إليك للتحكيم",
      bodyHtml: `
        <p>السلام عليكم،</p>
        <p>تمّ إسناد العمل التالي إليكم للمراجعة العلمية:</p>
        <p style="background:#fef3c7;border-right:4px solid #c9a84c;padding:12px 16px;border-radius:8px;margin:16px 0">
          <strong>${args.workCode}</strong> — ${args.workTitle}
          ${args.dueDate ? `<br>الموعد النهائي: <strong>${args.dueDate}</strong>` : ""}
        </p>
        <p>المراجعة مجهولة المصدر — لن يطّلع الباحث على هويتكم. شكراً لتعاونكم.</p>`,
      actionPath: `/reviews`,
      actionLabel: "افتح المراجعات",
    };
  },

  submissionReceived(args: {
    workTitle: string;
    version: number;
    workId: string;
    fileName: string;
    researcherName?: string;
    forResearcher: boolean;
  }): EmailArgs & { actionPath: string } {
    return {
      to: "",
      subject: args.forResearcher
        ? `تمّ تسجيل تسليم لعملك "${args.workTitle}"`
        : `تسليم جديد: ${args.workTitle}`,
      bodyHtml: args.forResearcher
        ? `
          <p>السلام عليكم،</p>
          <p>سجّلنا تسليماً جديداً لعملكم العلمي:</p>
          <p style="background:#ccfbf1;border-right:4px solid #2abfbf;padding:12px 16px;border-radius:8px;margin:16px 0">
            <strong>${args.workTitle}</strong><br>
            الإصدار: <strong>${args.version}</strong> — ${args.fileName}
          </p>`
        : `
          <p>تسليم جديد من باحث:</p>
          <p style="background:#ccfbf1;border-right:4px solid #2abfbf;padding:12px 16px;border-radius:8px;margin:16px 0">
            <strong>${args.workTitle}</strong><br>
            الباحث: ${args.researcherName ?? "—"}<br>
            الإصدار: <strong>${args.version}</strong> — ${args.fileName}
          </p>`,
      actionPath: `/projects?work=${args.workId}`,
      actionLabel: "عرض التسليمات",
    };
  },

  deadlineApproaching(args: {
    workTitle: string;
    workId: string;
    daysLeft: number;
    deadline: string;
  }): EmailArgs & { actionPath: string } {
    return {
      to: "",
      subject: `الموعد النهائي قارب: ${args.workTitle}`,
      bodyHtml: `
        <p>السلام عليكم،</p>
        <p>يقترب الموعد النهائي لعملكم العلمي:</p>
        <p style="background:#fef3c7;border-right:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin:16px 0">
          <strong>${args.workTitle}</strong><br>
          المتبقّي: <strong style="color:#b45309">${args.daysLeft} يوم/أيام</strong><br>
          ينتهي في: ${args.deadline}
        </p>
        <p>يُرجى التأكد من التسليم في الوقت المحدد.</p>`,
      actionPath: `/projects?work=${args.workId}`,
      actionLabel: "عرض العمل",
    };
  },

  deadlineOverdue(args: {
    workTitle: string;
    workId: string;
    deadline: string;
  }): EmailArgs & { actionPath: string } {
    return {
      to: "",
      subject: `تجاوز الموعد النهائي: ${args.workTitle}`,
      bodyHtml: `
        <p>السلام عليكم،</p>
        <p>تجاوز عملكم العلمي موعده النهائي:</p>
        <p style="background:#fee2e2;border-right:4px solid #dc2626;padding:12px 16px;border-radius:8px;margin:16px 0">
          <strong>${args.workTitle}</strong><br>
          الموعد كان: <strong>${args.deadline}</strong>
        </p>
        <p>يُرجى تحديث حالة العمل أو التواصل مع منسق الأبحاث في أقرب وقت.</p>`,
      actionPath: `/projects?work=${args.workId}`,
      actionLabel: "تحديث الحالة",
    };
  },

  contractSigned(args: {
    contractTitle: string;
    contractId: string;
    workTitle: string;
  }): EmailArgs & { actionPath: string } {
    return {
      to: "",
      subject: `تمّ توقيع عقد متعلّق بعملك`,
      bodyHtml: `
        <p>السلام عليكم،</p>
        <p>تمّ توقيع عقد متعلّق بعملك العلمي:</p>
        <p style="background:#dcfce7;border-right:4px solid #16a34a;padding:12px 16px;border-radius:8px;margin:16px 0">
          العقد: <strong>${args.contractTitle}</strong><br>
          العمل: ${args.workTitle}
        </p>`,
      actionPath: `/contracts/${args.contractId}`,
      actionLabel: "عرض العقد",
    };
  },
};
