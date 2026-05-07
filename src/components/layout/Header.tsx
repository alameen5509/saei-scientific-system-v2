"use client";

// شريط علوي في لوحة التحكم — بحث + إشعارات + قائمة المستخدم
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Search, UserCircle2, LogOut, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/rbac";
import { NotificationsBell } from "./NotificationsBell";

export function Header() {
  const { data: session, status } = useSession();
  const user = session?.user;

  return (
    <header className="h-16 border-b border-saei-purple-100 bg-white flex items-center px-6 gap-4">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="search"
            placeholder="ابحث في المشاريع، الباحثين، التقارير..."
            className="w-full h-10 pe-10 ps-4 rounded-xl border border-saei-purple-100 bg-saei-purple-50/30 focus:outline-none focus:border-saei-purple focus:ring-2 focus:ring-saei-purple/20 text-sm"
          />
        </div>
      </div>

      <NotificationsBell />

      {/* قائمة المستخدم */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl hover:bg-saei-purple-50/60 px-2 py-1 transition-colors"
            aria-label="قائمة المستخدم"
          >
            <UserCircle2 className="h-9 w-9 text-saei-purple-400" />
            <div className="text-sm text-right">
              {status === "loading" ? (
                <>
                  <div className="h-3 w-20 bg-saei-purple-100 rounded animate-pulse" />
                  <div className="h-2 w-14 bg-saei-purple-100 rounded mt-1 animate-pulse" />
                </>
              ) : user ? (
                <>
                  <div className="font-bold text-saei-purple-700 leading-tight">
                    {user.name ?? user.email}
                  </div>
                  <Badge
                    variant={ROLE_TONE[user.role] ?? "purple"}
                    className="mt-0.5"
                  >
                    {ROLE_LABEL[user.role] ?? user.role}
                  </Badge>
                </>
              ) : (
                <>
                  <div className="font-bold text-saei-purple-700">الزائر</div>
                  <div className="text-xs text-stone-500">غير مسجَّل</div>
                </>
              )}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[14rem]">
          {user ? (
            <>
              <DropdownMenuLabel>
                {user.name ?? user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCog className="h-4 w-4 text-saei-purple-500" />
                  ملفي الشخصي
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void signOut({ callbackUrl: "/login" })}
                className="text-red-700 focus:bg-red-50 focus:text-red-800"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem asChild>
              <Link href="/login">دخول</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
