// خدمة SMS — تعمل مع Twilio إن توفّرت credentials، وإلا تسجّل الرسالة وترجع status FAILED
// — لا تثبت Twilio SDK تلقائياً لتجنّب bundle size لمن لا يحتاجها
//   إن أراد المستخدم تفعيل SMS فعلياً، يضيف:
//     npm i twilio
//     وضع TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER في .env
import { prisma } from "@/lib/prisma";

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM_NUMBER;

export function isSmsConfigured(): boolean {
  return !!(SID && TOKEN && FROM);
}

interface SendSmsArgs {
  to: string;
  body: string;
  /** متى نتراجع للبريد إن فشل الـSMS */
  fallbackEmail?: string;
  fallbackSubject?: string;
}

export async function sendSms(args: SendSmsArgs): Promise<{
  ok: boolean;
  smsLogId: string;
  providerId?: string;
  fallbackUsed?: boolean;
  error?: string;
}> {
  // سجّل الـrow أولاً (QUEUED)
  const log = await prisma.smsLog.create({
    data: {
      toNumber: args.to,
      body: args.body,
      status: "QUEUED",
      provider: isSmsConfigured() ? "twilio" : "not-configured",
    },
  });

  if (!isSmsConfigured()) {
    // محاولة fallback عبر البريد إن أُعطي
    if (args.fallbackEmail) {
      const { sendEmail } = await import("@/lib/email");
      const r = await sendEmail({
        to: args.fallbackEmail,
        subject: args.fallbackSubject ?? "إشعار من نظام ساعي",
        bodyHtml: `<p>${args.body}</p>`,
      });
      await prisma.smsLog.update({
        where: { id: log.id },
        data: {
          status: r.ok ? "SENT" : "FAILED",
          provider: "fallback-email",
          providerId: r.id,
          sentAt: r.ok ? new Date() : null,
          errorMessage: r.ok ? null : r.error,
        },
      });
      return {
        ok: r.ok,
        smsLogId: log.id,
        fallbackUsed: true,
        providerId: r.id,
        error: r.ok ? undefined : r.error,
      };
    }
    await prisma.smsLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: "Twilio غير مهيّأ — لا fallback متاح",
      },
    });
    return {
      ok: false,
      smsLogId: log.id,
      error: "Twilio not configured",
    };
  }

  // نستخدم Twilio REST API مباشرةً عبر fetch — لا نحتاج SDK مثبَّتاً
  return await sendViaFetch(log.id, args);
}

async function sendViaFetch(
  logId: string,
  args: SendSmsArgs
): Promise<{
  ok: boolean;
  smsLogId: string;
  providerId?: string;
  error?: string;
}> {
  // Twilio REST API basic-auth
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
  const params = new URLSearchParams({
    To: args.to,
    From: FROM!,
    Body: args.body,
  });
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const j = await r.json();
    if (!r.ok) {
      throw new Error(j.message ?? "Twilio API error");
    }
    await prisma.smsLog.update({
      where: { id: logId },
      data: {
        status: "SENT",
        providerId: j.sid,
        sentAt: new Date(),
        cost: j.price ? String(j.price) : null,
      },
    });
    return { ok: true, smsLogId: logId, providerId: j.sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.smsLog.update({
      where: { id: logId },
      data: { status: "FAILED", errorMessage: msg },
    });
    return { ok: false, smsLogId: logId, error: msg };
  }
}

/** قائمة سجل SMS — للمدير */
export async function listSmsLogs(limit = 100) {
  return prisma.smsLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
