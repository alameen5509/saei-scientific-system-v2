// قواعد الصلاحيات والأدوار — مرجع موحّد للأذونات والتسميات والألوان
import type { UserRole } from "@/types";

// ————————————————————————————————
// التسميات بالعربية
// ————————————————————————————————

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "مدير النظام",
  RESEARCH_COORDINATOR: "منسق الأبحاث",
  JOURNAL_COORDINATOR: "منسق المجلة",
  RESEARCHER: "باحث",
  REVIEWER: "محكم",
};

export const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "RESEARCH_COORDINATOR",
  "JOURNAL_COORDINATOR",
  "RESEARCHER",
  "REVIEWER",
];

// ربط لوني للشارات
export type RoleTone = "purple" | "teal" | "gold" | "amber" | "green" | "gray";

export const ROLE_TONE: Record<UserRole, RoleTone> = {
  ADMIN: "purple",
  RESEARCH_COORDINATOR: "teal",
  JOURNAL_COORDINATOR: "gold",
  RESEARCHER: "amber",
  REVIEWER: "green",
};

// ————————————————————————————————
// مجموعات أذونات معيارية
// ————————————————————————————————

// من يستطيع إدارة الأعمال العلمية (CRUD على /projects)
const WORKS_MANAGERS: UserRole[] = [
  "ADMIN",
  "RESEARCH_COORDINATOR",
  "JOURNAL_COORDINATOR",
];

export const ROLE_GROUPS = {
  worksManagers: WORKS_MANAGERS,
  admins: ["ADMIN"] as UserRole[],
  authenticated: ALL_ROLES,
};

// ————————————————————————————————
// دوال التحقق
// ————————————————————————————————

export function canManageWorks(role: UserRole | undefined): boolean {
  return !!role && WORKS_MANAGERS.includes(role);
}

// الباحث يستطيع رؤية صفحة الأعمال (لكن مقصورة على أعماله) لكن لا يديرها
export function canViewWorks(role: UserRole | undefined): boolean {
  return !!role && (WORKS_MANAGERS.includes(role) || role === "RESEARCHER");
}

export function canManageUsers(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}

export function canViewReports(role: UserRole | undefined): boolean {
  return !!role && WORKS_MANAGERS.includes(role);
}

export function canReview(role: UserRole | undefined): boolean {
  return role === "REVIEWER" || role === "ADMIN";
}

// ————————————————————————————————
// خرائط حماية المسارات (يستخدمها middleware)
// — مفتاح هو prefix المسار، قيمة هي قائمة الأدوار المسموح لها
// ————————————————————————————————

export const PATH_ROLE_MAP: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/users", roles: ["ADMIN"] },
  // /projects: المنسقون والمدير يديرون كل الأعمال — الباحث يرى أعماله الخاصة فقط
  { prefix: "/projects", roles: [...WORKS_MANAGERS, "RESEARCHER"] },
  { prefix: "/researchers", roles: WORKS_MANAGERS },
  { prefix: "/tasks", roles: WORKS_MANAGERS },
  { prefix: "/reports", roles: WORKS_MANAGERS },
  { prefix: "/reviewers", roles: WORKS_MANAGERS },
  // /reviews متاحة للمحكمين والمنسقين والمدير (ليس الباحثين)
  {
    prefix: "/reviews",
    roles: [...WORKS_MANAGERS, "REVIEWER"],
  },
  // /dashboard و /profile متاحان لكل مسجَّل
];

export function isPathAllowedForRole(
  pathname: string,
  role: UserRole | undefined
): boolean {
  if (!role) return false;
  const rule = PATH_ROLE_MAP.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return true; // لا قاعدة محددة = متاح لكل مسجَّل
  return rule.roles.includes(role);
}
