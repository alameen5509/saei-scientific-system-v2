"use client";

// صفحة إدارة المستخدمين — sortable table + AlertDialog + skeleton + empty
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Users as UsersIcon,
  Mail,
  KeyRound,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import {
  SortableHeader,
  toggleSort,
  type SortState,
} from "@/components/ui/sortable-header";
import { useToast } from "@/components/ui/toast";
import {
  UserDialog,
  type UserRow,
  type UserFormValues,
} from "@/components/users/UserDialog";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/rbac";
import { cn, formatDate } from "@/lib/utils";

type SortKey = "name" | "email" | "role" | "createdAt";

export default function UsersPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const me = session?.user;
  const toast = useToast();
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  async function handleImpersonate(u: UserRow) {
    if (u.role === "ADMIN") {
      toast.error("لا يمكن انتحال حساب مدير آخر");
      return;
    }
    if (impersonatingId) return;
    setImpersonatingId(u.id);
    try {
      const res = await fetch(`/api/admin/impersonate/${u.id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "تعذّر بدء جلسة الانتحال");
      }

      // تحديث الـtoken عبر NextAuth update() — يضع المستخدم المنتحل
      await update({ impersonate: u.id });

      toast.success("تمّ التحويل", {
        description: `تتصفح الآن كـ${u.name ?? u.email}`,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error("فشل بدء الانتحال", {
        description: e instanceof Error ? e.message : undefined,
      });
      setImpersonatingId(null);
    }
  }

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<SortState<SortKey> | null>({
    key: "createdAt",
    direction: "desc",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "فشل تحميل المستخدمين");
      setUsers((json.users ?? []) as UserRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const sorted = useMemo(() => {
    if (!sort) return users;
    const f = sort.direction === "asc" ? 1 : -1;
    const arr = [...users];
    arr.sort((a, b) => {
      switch (sort.key) {
        case "name":
          return ((a.name ?? "").localeCompare(b.name ?? "", "ar")) * f;
        case "email":
          return a.email.localeCompare(b.email) * f;
        case "role":
          return a.role.localeCompare(b.role) * f;
        case "createdAt":
          return a.createdAt.localeCompare(b.createdAt) * f;
      }
    });
    return arr;
  }, [users, sort]);

  function handleSort(key: SortKey) {
    setSort((p) => toggleSort(p, key, key === "createdAt" ? "desc" : "asc"));
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setDialogOpen(true);
  }

  async function handleSubmit(values: UserFormValues) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/users/${editing.id}` : "/api/users";
      const method = editing ? "PUT" : "POST";
      const body =
        editing && values.password.length === 0
          ? { name: values.name, email: values.email, role: values.role }
          : values;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "فشلت العملية");

      const u = json.user as UserRow;
      if (editing) {
        setUsers((all) => all.map((x) => (x.id === u.id ? u : x)));
        toast.success("تمّ حفظ التغييرات");
      } else {
        setUsers((all) => [u, ...all]);
        toast.success("تمّت إضافة الحساب", {
          description: u.name ?? u.email,
        });
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error("فشلت العملية", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(u: UserRow) {
    setDeleteTarget(u);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const previous = users;
    setUsers((all) => all.filter((x) => x.id !== deleteTarget.id));
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "فشل الحذف");
      toast.success("تمّ حذف الحساب", {
        description: deleteTarget.name ?? deleteTarget.email,
      });
      setDeleteTarget(null);
    } catch (e) {
      setUsers(previous);
      toast.error("تعذّر الحذف", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  // ————— حالة الخطأ المحظورة —————
  if (error && users.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="تعذّر تحميل المستخدمين"
        description={error}
        action={
          <Button variant="primary" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        }
        className="border-red-200 bg-red-50/30"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7" />
            إدارة المستخدمين
          </h1>
          <p className="text-stone-600 text-sm">
            إنشاء حسابات النظام وتعديل أدوارها
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>
          <Button variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            مستخدم جديد
          </Button>
        </div>
      </div>

      {error && users.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* المحتوى */}
      {loading && users.length === 0 ? (
        <UsersTableSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="لا يوجد مستخدمون بعد"
          description="ابدأ بإضافة أول حساب لتفعيل النظام."
          action={
            <Button variant="primary" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              مستخدم جديد
            </Button>
          }
          variant="subtle"
        />
      ) : (
        <>
          {/* جدول للكمبيوتر */}
          <div className="hidden md:block rounded-2xl border border-saei-purple-100 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader<SortKey>
                      label="الاسم"
                      sortKey="name"
                      current={sort}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader<SortKey>
                      label="البريد الإلكتروني"
                      sortKey="email"
                      current={sort}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader<SortKey>
                      label="الدور"
                      sortKey="role"
                      current={sort}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader<SortKey>
                      label="تاريخ الإنشاء"
                      sortKey="createdAt"
                      current={sort}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-32">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((u) => {
                  const isMe = me?.id === u.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-saei-purple-700">
                          {u.name ?? "—"}
                          {isMe && (
                            <Badge variant="gold" className="me-1">
                              أنت
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="ltr text-left text-sm text-stone-700">
                          {u.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_TONE[u.role]}>
                          {ROLE_LABEL[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-stone-600 whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* زر الانتحال — يُخفى للمدير ولنفس المستخدم */}
                          {u.role !== "ADMIN" && !isMe && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleImpersonate(u)}
                              aria-label="دخول كهذا المستخدم"
                              title="🔓 دخول كهذا المستخدم"
                              disabled={!!impersonatingId}
                              className="h-8 w-8"
                            >
                              {impersonatingId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                              ) : (
                                <KeyRound className="h-4 w-4 text-amber-600" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(u)}
                            aria-label="تعديل"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4 text-saei-purple-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => requestDelete(u)}
                            aria-label="حذف"
                            disabled={isMe}
                            title={isMe ? "لا يمكن حذف حسابك الشخصي" : "حذف"}
                            className="h-8 w-8"
                          >
                            <Trash2
                              className={cn(
                                "h-4 w-4",
                                isMe ? "text-stone-300" : "text-red-600"
                              )}
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* بطاقات للجوال */}
          <div className="md:hidden space-y-3">
            {sorted.map((u) => {
              const isMe = me?.id === u.id;
              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-saei-purple-100 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-saei-purple-100 grid place-items-center text-saei-purple-700 font-extrabold text-lg shrink-0">
                      {(u.name ?? u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-saei-purple-700 truncate">
                          {u.name ?? "—"}
                        </span>
                        {isMe && <Badge variant="gold">أنت</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-0.5 ltr text-left">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={ROLE_TONE[u.role]}>
                          {ROLE_LABEL[u.role]}
                        </Badge>
                        <span className="text-xs text-stone-500">
                          {formatDate(u.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-saei-purple-100">
                    {u.role !== "ADMIN" && !isMe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleImpersonate(u)}
                        disabled={!!impersonatingId}
                        className="flex-1 text-amber-700 hover:bg-amber-50"
                        title="دخول كهذا المستخدم"
                      >
                        {impersonatingId === u.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                        دخول
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestDelete(u)}
                      disabled={isMe}
                      className={cn(
                        "flex-1",
                        !isMe && "text-red-700 hover:bg-red-50"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <UserDialog
        open={dialogOpen}
        initial={editing}
        submitting={submitting}
        onOpenChange={(v) => !submitting && setDialogOpen(v)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="حذف حساب مستخدم"
        description={
          deleteTarget && (
            <>
              هل أنت متأكد من حذف الحساب{" "}
              <strong className="text-saei-purple-700">
                «{deleteTarget.name ?? deleteTarget.email}»
              </strong>
              ؟ لن يتمكن صاحبه من الدخول بعدها.
            </>
          )
        }
        confirmLabel="حذف الحساب"
        loading={deleting}
        onOpenChange={(v) => !deleting && !v && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ————————————————————————————————
// Skeleton مخصّص لجدول المستخدمين
// ————————————————————————————————

function UsersTableSkeleton() {
  return (
    <>
      <div className="hidden md:block rounded-2xl border border-saei-purple-100 bg-white overflow-hidden">
        <div className="h-12 bg-saei-purple-50/60 border-b border-saei-purple-100 flex items-center px-4 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 w-24 first:flex-1" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-16 border-t border-saei-purple-100/50 px-4 flex items-center gap-4"
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-saei-purple-100 bg-white p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
