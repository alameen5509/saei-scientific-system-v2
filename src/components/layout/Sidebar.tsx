"use client";

// شريط جانبي للوحة التحكم — يصفّي العناصر حسب دور المستخدم
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  FileBarChart,
  UserCog,
  Shield,
  UserCheck,
  ClipboardList,
  FileSignature,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const items: NavItem[] = [
  {
    href: "/dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    // متاح لكل المسجَّلين
  },
  {
    href: "/projects",
    label: "الأعمال العلمية",
    icon: FolderKanban,
    // الباحث يرى الصفحة لكن مقصورة على أعماله فقط (تصفية على السيرفر)
    roles: ["ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR", "RESEARCHER"],
  },
  {
    href: "/researchers",
    label: "الباحثون",
    icon: Users,
    roles: ["ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR"],
  },
  {
    href: "/tasks",
    label: "المهام",
    icon: CheckSquare,
    roles: ["ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR"],
  },
  {
    href: "/reports",
    label: "التقارير",
    icon: FileBarChart,
    roles: ["ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR"],
  },
  {
    href: "/reviewers",
    label: "هيئة المحكمين",
    icon: UserCheck,
    roles: ["ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR"],
  },
  {
    href: "/reviews",
    label: "المراجعات",
    icon: ClipboardList,
    roles: [
      "ADMIN",
      "RESEARCH_COORDINATOR",
      "JOURNAL_COORDINATOR",
      "REVIEWER",
    ],
  },
  {
    href: "/contracts",
    label: "العقود",
    icon: FileSignature,
    roles: ["ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR"],
  },
  {
    href: "/users",
    label: "إدارة المستخدمين",
    icon: Shield,
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  // تصفية: عرض العنصر إن كان مفتوحاً للجميع أو إن كان دور المستخدم ضمن الأدوار المسموحة
  const visible = items.filter(
    (it) => !it.roles || (role && it.roles.includes(role))
  );

  return (
    <aside className="w-64 shrink-0 border-l border-saei-purple-100 bg-white flex flex-col">
      <div className="p-6 border-b border-saei-purple-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-saei-hero text-white grid place-items-center font-extrabold shadow-saei-sm">
            س
          </div>
          <div>
            <div className="font-extrabold text-saei-purple-700 leading-tight">
              مؤسسة ساعي
            </div>
            <div className="text-xs text-stone-500">إدارة الأعمال العلمية</div>
          </div>
        </Link>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {visible.map((it) => {
          const Icon = it.icon;
          const active =
            pathname === it.href || pathname?.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                active
                  ? "bg-saei-hero text-white shadow-saei-sm"
                  : "text-saei-purple-700 hover:bg-saei-purple-50"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{it.label}</span>
              {it.badge !== undefined && (
                <span className="text-xs bg-saei-gold text-white px-2 py-0.5 rounded-full">
                  {it.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-saei-purple-100">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
            pathname?.startsWith("/profile")
              ? "bg-saei-hero text-white"
              : "text-saei-purple-700 hover:bg-saei-purple-50"
          )}
        >
          <UserCog className="h-5 w-5" />
          <span>ملفي الشخصي</span>
        </Link>
      </div>
    </aside>
  );
}
