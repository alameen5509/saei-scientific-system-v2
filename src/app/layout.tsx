import type { Metadata } from "next";
import { Cairo, Amiri } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ImpersonationProvider } from "@/components/providers/ImpersonationContext";
import { ToastProvider } from "@/components/ui/toast";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import "./globals.css";

// خط Cairo للواجهة العامة
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// خط Amiri للنصوص الشرعية والقرآنية
const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام إدارة الأعمال العلمية — مؤسسة ساعي",
  description:
    "منصة متكاملة لإدارة المشاريع البحثية والباحثين والتقارير العلمية في مؤسسة ساعي",
  applicationName: "نظام ساعي",
  keywords: [
    "ساعي",
    "إدارة بحثية",
    "أعمال علمية",
    "باحثون",
    "مشاريع",
    "تقارير",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${amiri.variable}`}
    >
      <body className="min-h-screen bg-saei-cream text-saei-ink antialiased">
        <SessionProvider>
          <ImpersonationProvider>
            <ToastProvider>
              <ImpersonationBanner />
              {children}
            </ToastProvider>
          </ImpersonationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
