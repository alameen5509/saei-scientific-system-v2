"use client";

// شريط برتقالي ثابت يظهر طوال جلسة الانتحال
// — يُحمَّل في root layout ليظهر في كل الصفحات
// — يدفع المحتوى للأسفل بـpadding-top على body
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, Undo2, Loader2 } from "lucide-react";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  const impersonator = session?.impersonator;
  const target = session?.user;

  // تحديث class الـbody ديناميكياً لتطبيق وضع القراءة فقط بصرياً
  if (typeof document !== "undefined") {
    if (impersonator) {
      document.body.classList.add("impersonating");
      document.body.style.paddingTop = "56px";
    } else {
      document.body.classList.remove("impersonating");
      document.body.style.paddingTop = "";
    }
  }

  if (!impersonator || !target) return null;

  async function stopImpersonation() {
    if (stopping) return;
    setStopping(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "فشل إنهاء الانتحال");
      }

      // تحديث الجلسة لاستعادة الأدمن الأصلي
      await update({ stopImpersonate: true });

      // تنظيف class قبل التنقّل
      if (typeof document !== "undefined") {
        document.body.classList.remove("impersonating");
        document.body.style.paddingTop = "";
      }

      router.push("/users");
      router.refresh();
    } catch (err) {
      console.error("stop impersonation error:", err);
      alert(err instanceof Error ? err.message : "تعذّر إنهاء الانتحال");
      setStopping(false);
    }
  }

  return (
    <div
      role="alert"
      data-impersonation-allowed
      className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white shadow-lg"
      style={{ direction: "rtl" }}
    >
      <div className="max-w-screen-2xl mx-auto h-14 px-4 flex items-center justify-between gap-3">
        {/* زر العودة — في اليسار */}
        <button
          type="button"
          onClick={stopImpersonation}
          disabled={stopping}
          className="order-2 inline-flex items-center gap-2 rounded-xl bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-60 px-4 h-10 font-extrabold shadow-sm transition-colors"
          title="العودة لحساب الأدمن"
        >
          {stopping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Undo2 className="h-4 w-4" />
          )}
          <span>↩ عودة لحساب الأدمن</span>
        </button>

        {/* النص الرئيسي — في اليمين */}
        <div className="order-1 flex-1 flex items-center gap-2 min-w-0">
          <Eye className="h-5 w-5 shrink-0" />
          <p className="text-sm md:text-base font-bold truncate">
            👁 أنت تتصفح كـ{" "}
            <span className="font-extrabold">
              {target.name ?? target.email}
            </span>{" "}
            <span className="opacity-90 ltr inline-block">
              ({target.email})
            </span>{" "}
            — وضع العرض فقط
          </p>
        </div>
      </div>
    </div>
  );
}
