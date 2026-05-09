"use client";

// يحقن CSS variables لتطبيق الهوية المخصصة على الـ:root
// — يتفاعل مع تغيرات /api/branding عند الحفظ في صفحة الإعدادات
import { useEffect, useState } from "react";

interface Brand {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string | null;
}

const DEFAULT: Brand = {
  primaryColor: "#5E5495",
  secondaryColor: "#00D4DD",
  accentColor: "#C9A84C",
  fontFamily: "Cairo",
};

function applyBrand(b: Brand) {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  r.style.setProperty("--brand-primary", b.primaryColor);
  r.style.setProperty("--brand-secondary", b.secondaryColor);
  r.style.setProperty("--brand-accent", b.accentColor);
  if (b.fontFamily) {
    r.style.setProperty("--brand-font", b.fontFamily);
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch("/api/branding", { cache: "no-store" });
        const j = await r.json();
        if (alive && j.ok && j.branding) {
          applyBrand({ ...DEFAULT, ...j.branding });
        }
      } catch {
        applyBrand(DEFAULT);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return <>{children}</>;
}
