// أنواع مشتركة لنظام إدارة الأعمال العلمية
import type { LucideIcon } from "lucide-react";

// ستة أدوار في نظام ساعي (PRINTING_MANAGER أُضيف في Phase C)
export type UserRole =
  | "ADMIN" // مدير النظام
  | "RESEARCH_COORDINATOR" // منسق الأبحاث
  | "JOURNAL_COORDINATOR" // منسق المجلة
  | "PRINTING_MANAGER" // مدير الطباعة
  | "RESEARCHER" // باحث
  | "REVIEWER"; // محكم

export type ProjectStatus =
  | "PROPOSED"
  | "APPROVED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  // الأدوار التي يُسمح لها برؤية هذا العنصر
  roles?: UserRole[];
}
