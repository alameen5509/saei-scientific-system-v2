"use client";

// جرس الإشعارات في الـHeader — يعرض عدد غير المقروء + dropdown بآخر ٢٠
// يقوم بـpolling كل ٦٠ ثانية (لاحقاً يمكن استبداله بـSSE/WebSocket)
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { cn, formatDate, toArabicDigits } from "@/lib/utils";

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const KIND_DOT: Record<string, string> = {
  STAGE_CHANGED: "bg-saei-purple",
  REVIEW_ASSIGNED: "bg-saei-gold",
  REVIEW_SUBMITTED: "bg-emerald-500",
  SUBMISSION_RECEIVED: "bg-saei-teal",
  DEADLINE_APPROACHING: "bg-amber-500",
  DEADLINE_OVERDUE: "bg-red-500",
  CONTRACT_SIGNED: "bg-emerald-500",
  CONTRACT_SENT: "bg-saei-teal",
  GENERIC: "bg-stone-400",
};

export function NotificationsBell() {
  const { status } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const refetch = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.ok) {
        setItems(j.items as NotificationItem[]);
        setUnread(j.unread as number);
      }
    } catch {
      /* تجاهل أخطاء polling — العلامة الحمراء كافية مع المحاولة التالية */
    }
  }, [status]);

  // أوّل تحميل + polling كل ٦٠ ثانية
  useEffect(() => {
    if (status !== "authenticated") return;
    void refetch();
    const t = setInterval(() => void refetch(), 60_000);
    return () => clearInterval(t);
  }, [status, refetch]);

  // إعادة جلب عند فتح القائمة
  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((all) =>
      all.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setItems((all) =>
        all.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
      );
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <Button variant="ghost" size="icon" aria-label="الإشعارات" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`الإشعارات (${unread} غير مقروءة)`}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-xs font-bold tabular-nums">
              {unread > 99 ? "+99" : toArabicDigits(unread)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[22rem] p-0 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-saei-purple-100">
          <div className="font-extrabold text-saei-purple-700 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            الإشعارات
            {unread > 0 && (
              <span className="text-xs font-bold text-red-600 tabular-nums">
                ({toArabicDigits(unread)} جديدة)
              </span>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              disabled={loading}
              className="text-xs"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              تأشير الكل كمقروء
            </Button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-sm">
              لا توجد إشعارات
            </div>
          ) : (
            <ul className="divide-y divide-saei-purple-50">
              {items.map((n) => {
                const isUnread = !n.readAt;
                const dot = KIND_DOT[n.kind] ?? KIND_DOT.GENERIC;
                const Wrapper = (children: React.ReactNode) =>
                  n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        if (isUnread) void markAsRead(n.id);
                        setOpen(false);
                      }}
                    >
                      {children}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-right"
                      onClick={() => isUnread && void markAsRead(n.id)}
                    >
                      {children}
                    </button>
                  );
                return (
                  <li key={n.id}>
                    {Wrapper(
                      <div
                        className={cn(
                          "flex gap-3 p-3 transition-colors",
                          isUnread
                            ? "bg-saei-purple-50/40 hover:bg-saei-purple-50"
                            : "hover:bg-stone-50"
                        )}
                      >
                        <div
                          className={cn(
                            "shrink-0 mt-1.5 h-2 w-2 rounded-full",
                            isUnread ? dot : "bg-stone-300"
                          )}
                        />
                        <div className="flex-1 min-w-0 text-right">
                          <div
                            className={cn(
                              "text-sm leading-tight line-clamp-2",
                              isUnread
                                ? "font-extrabold text-saei-purple-700"
                                : "font-bold text-stone-700"
                            )}
                          >
                            {n.title}
                          </div>
                          {n.body && (
                            <div className="text-xs text-stone-600 mt-0.5 line-clamp-2">
                              {n.body}
                            </div>
                          )}
                          <div className="text-[10px] text-stone-400 mt-1">
                            {formatDate(n.createdAt)}
                          </div>
                        </div>
                        {isUnread && (
                          <span
                            className="text-saei-purple-500"
                            aria-label="غير مقروء"
                          >
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
