// تمديد أنواع NextAuth لتشمل id + role في الجلسة وفي JWT + بيانات الانتحال
import type { DefaultSession } from "next-auth";
import type { UserRole } from "./index";

// طبقة معلومات الانتحال — تُحفظ في JWT فقط (stateless)
export interface ImpersonatorInfo {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  // طابع زمني (ms) لبدء الانتحال — يستخدم لانتهاء الصلاحية بعد ساعة
  startedAt: number;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
    /** بيانات الأدمن الأصلي عند الانتحال — غير معرّف خارج الانتحال */
    impersonator?: ImpersonatorInfo;
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    /** بيانات الأدمن الأصلي عند الانتحال — تُحفظ في الـtoken فقط */
    impersonator?: import("./next-auth").ImpersonatorInfo;
  }
}
