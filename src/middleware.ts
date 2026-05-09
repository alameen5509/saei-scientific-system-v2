// حماية المسارات حسب الأدوار + وضع القراءة فقط أثناء الانتحال
// — المستخدم غير المسجَّل يُحوَّل إلى /login مع callbackUrl
// — المستخدم المسجَّل بدون صلاحية يُحوَّل إلى /dashboard
// — أي محاولة كتابة (غير GET) عبر /api/* أثناء الانتحال تُرفض بـ403
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isPathAllowedForRole } from "@/lib/rbac";
import type { UserRole } from "@/types";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const method = req.method.toUpperCase();
    const token = req.nextauth.token;
    const role = token?.role as UserRole | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const impersonator = (token as any)?.impersonator;

    // ————————————— حارس وضع القراءة فقط —————————————
    // أثناء الانتحال: ارفض كل عمليات الكتابة على API
    if (impersonator && pathname.startsWith("/api/") && method !== "GET") {
      // استثناءات صريحة: NextAuth + إنهاء الانتحال
      const isAllowed =
        pathname.startsWith("/api/auth/") ||
        pathname === "/api/admin/impersonate/stop";

      if (!isAllowed) {
        return NextResponse.json(
          {
            ok: false,
            error: "غير مسموح أثناء الانتحال — للقراءة فقط",
          },
          { status: 403 }
        );
      }
    }

    // المستخدم مسجَّل لكن دوره لا يملك صلاحية الوصول للصفحة
    if (!pathname.startsWith("/api/") && !isPathAllowedForRole(pathname, role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("denied", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // إن لم يكن هناك token، ترجع false → NextAuth يحوّل إلى /login تلقائياً
      authorized: ({ token }) => !!token,
    },
  }
);

// نطبّق على الصفحات المحمية + كل /api/* لتطبيق حارس الانتحال
// (ملاحظة: الواجهات /login والصفحة الرئيسية و/api/auth خارج النطاق
//  لكن /api/auth يُستثنى داخل الـmiddleware للسماح بـsign-in)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/researchers/:path*",
    "/tasks/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/reviewers/:path*",
    "/reviews/:path*",
    "/contracts/:path*",
    // Phase C
    "/executive/:path*",
    "/announcements/:path*",
    "/screening/:path*",
    "/publishing/:path*",
    "/settings/:path*",
    // كل API ما عدا /api/auth و /api/cron (يحتاج Bearer CRON_SECRET بدلاً من token)
    "/api/admin/:path*",
    "/api/users/:path*",
    "/api/works/:path*",
    "/api/reviewers/:path*",
    "/api/reviews/:path*",
    "/api/profile/:path*",
    "/api/contracts/:path*",
    "/api/notifications/:path*",
    // Phase C
    "/api/announcements/:path*",
    "/api/applicants/:path*",
    "/api/publishers/:path*",
    "/api/printing-jobs/:path*",
    "/api/notification-preferences/:path*",
    "/api/system-settings/:path*",
    // Phase D
    "/audit/:path*",
    "/api/audit/:path*",
    "/api/branding/:path*",
    "/api/escalation-rules/:path*",
    "/api/sms-logs/:path*",
  ],
};
