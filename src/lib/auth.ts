// إعدادات NextAuth v4 — مصادقة حقيقية مدعومة بـPrisma + bcrypt
// يقرأ المستخدم من جدول User، يقارن كلمة السرّ بـbcrypt.compare
// JWT يحمل id + role لاستخدامهما في الـmiddleware والـclient
//
// يدعم الانتحال (Impersonation) عبر trigger=update من العميل:
//   { impersonate: <userId> }   → الأدمن يتحوّل إلى المستخدم المستهدف
//   { stopImpersonate: true }   → استعادة الأدمن الأصلي
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

// مدة صلاحية الانتحال — ساعة واحدة (ms)
export const IMPERSONATION_TTL_MS = 60 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // أسبوع
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as UserRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }

      // تحديث الـtoken عند update() من العميل
      if (trigger === "update" && session) {
        // ————————————— بدء الانتحال —————————————
        if (typeof session.impersonate === "string" && session.impersonate) {
          // التحقق من أنّ الفاعل أدمن (ولا ينتحل أصلاً)
          if (token.role !== "ADMIN" || token.impersonator) {
            return token; // تجاهل الطلب — لا تصعيد صلاحيات
          }

          const target = await prisma.user.findUnique({
            where: { id: session.impersonate },
            select: { id: true, name: true, email: true, role: true },
          });
          if (!target) return token;
          // منع انتحال أدمن آخر
          if (target.role === "ADMIN") return token;

          // حفظ بيانات الأدمن الأصلي
          token.impersonator = {
            id: token.id as string,
            name: token.name ?? null,
            email: token.email ?? null,
            role: token.role as UserRole,
            startedAt: Date.now(),
          };

          // التحوّل لبيانات المستخدم المنتحل
          token.id = target.id;
          token.role = target.role as UserRole;
          token.name = target.name;
          token.email = target.email;
          return token;
        }

        // ————————————— إنهاء الانتحال —————————————
        if (session.stopImpersonate === true && token.impersonator) {
          const orig = token.impersonator;
          token.id = orig.id;
          token.role = orig.role;
          token.name = orig.name ?? null;
          token.email = orig.email ?? null;
          delete token.impersonator;
          return token;
        }

        // تحديث اسم/بريد عاديّ (تحرير الملف الشخصي)
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
      }

      // ————————————— انتهاء صلاحية الانتحال تلقائياً —————————————
      if (token.impersonator) {
        const elapsed = Date.now() - token.impersonator.startedAt;
        if (elapsed > IMPERSONATION_TTL_MS) {
          const orig = token.impersonator;
          token.id = orig.id;
          token.role = orig.role;
          token.name = orig.name ?? null;
          token.email = orig.email ?? null;
          delete token.impersonator;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        // الاسم/البريد قد تغيّرا في الانتحال — نعيد المزامنة
        if (token.name !== undefined) session.user.name = token.name ?? null;
        if (token.email !== undefined)
          session.user.email = token.email ?? null;
      }
      // تمرير معلومات الأدمن الأصلي للعميل
      if (token.impersonator) {
        session.impersonator = token.impersonator;
      }
      return session;
    },
  },
};
