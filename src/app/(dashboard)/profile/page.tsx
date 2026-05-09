"use client";

// صفحة الملف الشخصي — تعديل الاسم/البريد + تغيير كلمة المرور
// مع validation حيّ + skeleton + useToast العام
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Save, UserCog, KeyRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types";
import { NotificationPreferencesCard } from "@/components/profile/NotificationPreferencesCard";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
}

export default function ProfilePage() {
  const { update: updateSession } = useSession();
  const toast = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // قسم البيانات
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touchedProfile, setTouchedProfile] = useState<Set<string>>(new Set());
  const [profileSubmitAttempt, setProfileSubmitAttempt] = useState(false);

  // قسم كلمة المرور
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touchedPw, setTouchedPw] = useState<Set<string>>(new Set());
  const [pwSubmitAttempt, setPwSubmitAttempt] = useState(false);

  // ————— validation —————
  const profileErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "الاسم قصير جداً";
    if (!email.includes("@") || !email.includes("."))
      e.email = "البريد الإلكتروني غير صحيح";
    return e;
  }, [name, email]);

  const pwErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = "أدخل كلمة المرور الحالية";
    if (newPassword.length < 8)
      e.newPassword = "الكلمة الجديدة يجب ألا تقل عن ٨ أحرف";
    if (newPassword && confirmPassword && newPassword !== confirmPassword)
      e.confirmPassword = "تأكيد كلمة المرور لا يطابق";
    return e;
  }, [currentPassword, newPassword, confirmPassword]);

  const profileError = (k: string): string | null => {
    if (!profileSubmitAttempt && !touchedProfile.has(k)) return null;
    return profileErrors[k] ?? null;
  };
  const pwError = (k: string): string | null => {
    if (!pwSubmitAttempt && !touchedPw.has(k)) return null;
    return pwErrors[k] ?? null;
  };

  // جلب الملف
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json.ok)
          throw new Error(json.error || "فشل تحميل الملف");
        const p = json.profile as Profile;
        setProfile(p);
        setName(p.name ?? "");
        setEmail(p.email);
      } catch (e) {
        if (alive)
          toast.error("تعذّر تحميل الملف", {
            description: e instanceof Error ? e.message : undefined,
          });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSubmitAttempt(true);
    if (Object.keys(profileErrors).length > 0) return;

    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "فشل التحديث");
      const p = json.profile as Profile;
      setProfile(p);
      await updateSession({ name: p.name, email: p.email });
      toast.success("تمّ تحديث ملفك الشخصي");
    } catch (err) {
      toast.error("تعذّر التحديث", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwSubmitAttempt(true);
    if (Object.keys(pwErrors).length > 0) return;

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "فشل تغيير كلمة المرور");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTouchedPw(new Set());
      setPwSubmitAttempt(false);
      toast.success("تمّ تغيير كلمة المرور", {
        description: "ستحتاج إلى استخدام الكلمة الجديدة عند الدخول التالي",
      });
    } catch (err) {
      toast.error("فشل تغيير كلمة المرور", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-11 w-32 rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تعذّر تحميل الملف الشخصي</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
          <UserCog className="h-7 w-7" />
          الملف الشخصي
        </h1>
        <p className="text-stone-600 text-sm">
          إدارة بيانات حسابك وكلمة المرور
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-saei-hero text-white grid place-items-center font-extrabold text-2xl shadow-saei-sm">
            {(profile.name ?? profile.email).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{profile.name ?? "—"}</CardTitle>
            <CardDescription className="ltr text-left truncate">
              {profile.email}
            </CardDescription>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={ROLE_TONE[profile.role]}>
                {ROLE_LABEL[profile.role]}
              </Badge>
              <span className="text-xs text-stone-500">
                عضو منذ {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* بيانات الحساب */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات الحساب</CardTitle>
          <CardDescription>الاسم والبريد الإلكتروني</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSaveProfile}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="الاسم الكامل"
                required
                error={profileError("name")}
              >
                {(p) => (
                  <Input
                    {...p}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() =>
                      setTouchedProfile((s) => new Set(s).add("name"))
                    }
                    autoComplete="name"
                  />
                )}
              </FormField>
              <FormField
                label="البريد الإلكتروني"
                required
                error={profileError("email")}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() =>
                      setTouchedProfile((s) => new Set(s).add("email"))
                    }
                    className="ltr text-left"
                    autoComplete="email"
                  />
                )}
              </FormField>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={
                savingProfile ||
                (profileSubmitAttempt &&
                  Object.keys(profileErrors).length > 0)
              }
            >
              <Save className="h-4 w-4" />
              {savingProfile ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* تفضيلات الإشعارات */}
      <NotificationPreferencesCard />

      {/* كلمة المرور */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            تغيير كلمة المرور
          </CardTitle>
          <CardDescription>
            أدخل كلمة المرور الحالية للتأكيد، ثم الجديدة مرتين
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleChangePassword}
            className="space-y-4"
            noValidate
          >
            <FormField
              label="كلمة المرور الحالية"
              required
              error={pwError("currentPassword")}
            >
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={() =>
                    setTouchedPw((s) => new Set(s).add("currentPassword"))
                  }
                />
              )}
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="كلمة المرور الجديدة"
                required
                error={pwError("newPassword")}
                hint="٨ أحرف على الأقل"
              >
                {(p) => (
                  <Input
                    {...p}
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() =>
                      setTouchedPw((s) => new Set(s).add("newPassword"))
                    }
                  />
                )}
              </FormField>
              <FormField
                label="تأكيد كلمة المرور"
                required
                error={pwError("confirmPassword")}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() =>
                      setTouchedPw((s) => new Set(s).add("confirmPassword"))
                    }
                  />
                )}
              </FormField>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={
                savingPassword ||
                (pwSubmitAttempt && Object.keys(pwErrors).length > 0)
              }
            >
              <KeyRound className="h-4 w-4" />
              {savingPassword ? "جاري التغيير..." : "تغيير كلمة المرور"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
