// مساعد لحماية API routes من عمليات الكتابة أثناء الانتحال
// — الـmiddleware يحرس /api/* بشكل عام، لكن يمكن استدعاء هذا
//   داخل route handler كحاجز ثانٍ للتأكيد، أو في server actions
//   التي لا تمرّ على الـmiddleware.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** يرجع true إذا كانت الجلسة الحالية انتحال (read-only) */
export async function isImpersonating(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.impersonator;
}

/** يرمي 403 إن كانت جلسة انتحال — استخدمه في POST/PUT/DELETE handlers */
export async function blockIfImpersonating(): Promise<NextResponse | null> {
  if (await isImpersonating()) {
    return NextResponse.json(
      { ok: false, error: "غير مسموح أثناء الانتحال — للقراءة فقط" },
      { status: 403 }
    );
  }
  return null;
}
