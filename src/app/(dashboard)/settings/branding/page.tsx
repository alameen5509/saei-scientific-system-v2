"use client";

// إعدادات الهوية البصرية — للمدير فقط
import { useEffect, useState } from "react";
import { Palette, Loader2, Save, RotateCcw, Eye } from "lucide-react";
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
import { useToast } from "@/components/ui/toast";

const DEFAULTS = {
  primaryColor: "#5E5495",
  secondaryColor: "#00D4DD",
  accentColor: "#C9A84C",
  fontFamily: "Cairo",
};

export default function BrandingPage() {
  const toast = useToast();
  const [form, setForm] = useState({ ...DEFAULTS, logoUrl: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/branding", { cache: "no-store" });
        const j = await r.json();
        if (j.ok && j.branding) {
          setForm({
            primaryColor: j.branding.primaryColor ?? DEFAULTS.primaryColor,
            secondaryColor:
              j.branding.secondaryColor ?? DEFAULTS.secondaryColor,
            accentColor: j.branding.accentColor ?? DEFAULTS.accentColor,
            fontFamily: j.branding.fontFamily ?? DEFAULTS.fontFamily,
            logoUrl: j.branding.logoUrl ?? "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      // طبّق على الـCSS فوراً
      const r2 = document.documentElement;
      r2.style.setProperty("--brand-primary", form.primaryColor);
      r2.style.setProperty("--brand-secondary", form.secondaryColor);
      r2.style.setProperty("--brand-accent", form.accentColor);
      r2.style.setProperty("--brand-font", form.fontFamily);
      toast.success("تم حفظ الهوية وتطبيقها");
    } catch (e) {
      toast.error("فشل الحفظ", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("سيُعاد الوضع الافتراضي للهوية. متابعة؟")) return;
    try {
      await fetch("/api/branding", { method: "DELETE" });
      setForm({ ...DEFAULTS, logoUrl: "" });
      const r2 = document.documentElement;
      r2.style.removeProperty("--brand-primary");
      r2.style.removeProperty("--brand-secondary");
      r2.style.removeProperty("--brand-accent");
      r2.style.removeProperty("--brand-font");
      toast.success("تمت إعادة الافتراضي");
    } catch (e) {
      toast.error("فشل التراجع", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-stone-500 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
          <Palette className="h-7 w-7" />
          الهوية البصرية
        </h1>
        <p className="text-stone-600 text-sm">
          ملاحظة: التغييرات تُطبَّق عبر CSS variables. ألوان Tailwind المُجمَّعة (saei-purple, إلخ) لا تتغير
          — لكن متغيّرات `--brand-*` تتاح للاستخدام في أي component جديد.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الألوان</CardTitle>
            <CardDescription>
              قيم HEX (مثال: #5E5495) — تتطابق هوية ساعي الافتراضية مع البنفسجي/التركوازي/الذهبي
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ColorField
              label="اللون الأساسي"
              value={form.primaryColor}
              onChange={(v) => setForm({ ...form, primaryColor: v })}
            />
            <ColorField
              label="اللون الثانوي"
              value={form.secondaryColor}
              onChange={(v) => setForm({ ...form, secondaryColor: v })}
            />
            <ColorField
              label="لون التميُّز"
              value={form.accentColor}
              onChange={(v) => setForm({ ...form, accentColor: v })}
            />
            <div>
              <Label>عائلة الخط</Label>
              <select
                className="w-full rounded-xl border border-saei-purple-100 bg-white px-3 py-2 text-sm"
                value={form.fontFamily}
                onChange={(e) =>
                  setForm({ ...form, fontFamily: e.target.value })
                }
              >
                <option value="Cairo">Cairo</option>
                <option value="Tajawal">Tajawal</option>
                <option value="Almarai">Almarai</option>
                <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</option>
              </select>
            </div>
            <div>
              <Label>رابط الشعار (اختياري)</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={form.logoUrl}
                onChange={(e) =>
                  setForm({ ...form, logoUrl: e.target.value })
                }
                className="ltr text-left"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ وتطبيق
              </Button>
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                إعادة الافتراضي
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة حية
            </CardTitle>
            <CardDescription>
              كيف تظهر الألوان قبل الحفظ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Swatch label="الأساسي" color={form.primaryColor} />
            <Swatch label="الثانوي" color={form.secondaryColor} />
            <Swatch label="التميُّز" color={form.accentColor} />
            <div
              className="rounded-xl p-4 text-white text-center font-bold"
              style={{
                background: `linear-gradient(135deg, ${form.secondaryColor}, ${form.primaryColor})`,
              }}
            >
              زر افتراضي بالألوان الجديدة
            </div>
            <div
              className="rounded-xl border-2 p-3 font-bold text-center"
              style={{
                borderColor: form.accentColor,
                color: form.accentColor,
                fontFamily: form.fontFamily,
              }}
            >
              نص بلون التميُّز وخط {form.fontFamily}
            </div>
            {form.logoUrl && (
              <div className="rounded-xl border p-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="الشعار"
                  className="max-h-16 mx-auto"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-16 rounded-xl border border-saei-purple-100 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ltr text-left flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-saei-purple-100 p-3">
      <div
        className="h-10 w-10 rounded-xl shadow-sm"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1">
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-stone-500 ltr">{color}</div>
      </div>
    </div>
  );
}
