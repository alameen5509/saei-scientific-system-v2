"use client";

// صفحة تسجيل الدخول — تستخدم NextAuth مع credentials فعلية
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogIn, Info, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-bl from-saei-cream via-saei-cream to-saei-purple/5">
      <header className="container mx-auto px-4 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-saei-purple-700 font-extrabold w-fit"
        >
          <span className="inline-block h-9 w-9 rounded-xl bg-saei-hero text-white grid place-items-center shadow-saei-sm">
            س
          </span>
          <span>مؤسسة ساعي</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>

      <footer className="container mx-auto px-4 py-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} مؤسسة ساعي — نظام إدارة الأعمال العلمية
      </footer>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // trim مسافات الالتباس من اللصق/الإكمال التلقائي
    // — للـlogin فقط، تخزين الكلمة (seed/register) يجب أن يرفض المسافات
    const res = await signIn("credentials", {
      email: email.trim(),
      password: password.trim(),
      redirect: false,
    });
    setSubmitting(false);

    if (res?.error) {
      setError("البريد أو كلمة المرور غير صحيحة");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-saei-hero text-white grid place-items-center mb-3 shadow-saei-sm">
          <LogIn className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>
          أدخل بيانات حسابك للوصول إلى نظام إدارة الأعمال العلمية
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="example@saei.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ltr text-left"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
          >
            {submitting ? "جاري الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        {/* لوحة بيانات الاختبار — لا تظهر إطلاقاً في production
            — في dev: تعرض إيميلات الحسابات التجريبية فقط بلا كلمات مرور */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 pt-4 border-t border-saei-purple-100">
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="text-xs text-saei-purple-700 hover:text-saei-purple flex items-center gap-1.5 font-bold"
            >
              <Info className="h-3.5 w-3.5" />
              حسابات الاختبار (dev فقط)
            </button>

            {showHelp && (
              <div className="mt-3 p-3 rounded-xl bg-saei-purple-50/60 border border-saei-purple-100 space-y-2 text-xs">
                <p className="text-stone-700">
                  كلمة السرّ:{" "}
                  <span className="ltr inline-block font-mono bg-white px-2 py-0.5 rounded text-stone-500">
                    ********
                  </span>{" "}
                  — تواصل مع المسؤول للحصول عليها.
                </p>
                <ul className="space-y-1 text-stone-600">
                  <li>
                    <span className="ltr font-mono">research.coord@saei.local</span> — منسق الأبحاث
                  </li>
                  <li>
                    <span className="ltr font-mono">journal.coord@saei.local</span> — منسق المجلة
                  </li>
                  <li>
                    <span className="ltr font-mono">abdullah.salem@saei.local</span> — باحث
                  </li>
                  <li>
                    <span className="ltr font-mono">reviewer.hadith@saei.local</span> — محكم
                  </li>
                </ul>
                <p className="text-[10px] text-stone-400 pt-1 border-t border-saei-purple-100">
                  لإعادة بذر بياناتك:{" "}
                  <span className="ltr font-mono">SEED_DEFAULT_PASSWORD=... npm run db:seed</span>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
