"use client";

// صفحة الأعمال العلمية
// — للمدير والمنسقين: إدارة كاملة
// — للباحث: عرض أعماله الخاصة فقط (للقراءة، البيانات تأتي مفلترة من السيرفر)
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Search,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  type SortState,
  toggleSort,
} from "@/components/ui/sortable-header";
import {
  WorksFilters,
  EMPTY_FILTERS,
  type FiltersState,
} from "@/components/works/WorksFilters";
import {
  WorksTable,
  type WorksSortKey,
} from "@/components/works/WorksTable";
import { Pagination } from "@/components/works/Pagination";
import {
  WorkFormDialog,
  WorkViewDialog,
  type WorkFormValues,
} from "@/components/works/WorkDialog";
import { WorksPageSkeleton } from "@/components/works/WorksSkeleton";
import { AssignReviewersDialog } from "@/components/works/AssignReviewersDialog";
import { useWorks } from "@/components/works/use-works";
import {
  isOverdue,
  STAGE_ORDER,
  type ScientificWork,
} from "@/types/works";
import { toArabicDigits } from "@/lib/utils";

const PAGE_SIZE = 8;

export default function ProjectsPage() {
  const { data: session } = useSession();
  const isResearcher = session?.user?.role === "RESEARCHER";
  const {
    works,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    advance,
  } = useWorks();

  // ————— الفلاتر والبحث والصفحة والترتيب —————
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState<WorksSortKey> | null>({
    key: "deadline",
    direction: "asc",
  });

  // ————— حالات النوافذ —————
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScientificWork | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<ScientificWork | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ————— تأكيد الحذف —————
  const [deleteTarget, setDeleteTarget] = useState<ScientificWork | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ————— تعيين محكمين —————
  const [assignTarget, setAssignTarget] = useState<ScientificWork | null>(null);

  // ————— الفلترة + البحث —————
  const filtered = useMemo(() => {
    const q = search.trim();
    return works.filter((w) => {
      if (q && !`${w.title} ${w.researcher}`.includes(q)) return false;
      if (filters.stage !== "ALL" && w.stage !== filters.stage) return false;
      if (filters.specialty !== "ALL" && w.specialty !== filters.specialty)
        return false;
      if (filters.track !== "ALL" && w.track !== filters.track) return false;
      if (filters.dateFrom && w.deadline < filters.dateFrom) return false;
      if (filters.dateTo && w.deadline > filters.dateTo) return false;
      return true;
    });
  }, [works, search, filters]);

  // ————— الترتيب —————
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const factor = sort.direction === "asc" ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sort.key) {
        case "title":
          return a.title.localeCompare(b.title, "ar") * factor;
        case "researcher":
          return a.researcher.localeCompare(b.researcher, "ar") * factor;
        case "progress":
          return (a.progress - b.progress) * factor;
        case "deadline":
          return a.deadline.localeCompare(b.deadline) * factor;
        case "stage":
          return (
            (STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)) *
            factor
          );
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sort]);

  function handleSort(key: WorksSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  // ————— pagination —————
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleFiltersChange(f: FiltersState) {
    setFilters(f);
    setPage(1);
  }
  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }

  // ————— الإحصاءات على البيانات الكاملة —————
  const stats = useMemo(() => {
    const total = works.length;
    const inProgress = works.filter(
      (w) =>
        w.stage !== "PUBLISHED" &&
        w.stage !== "ARCHIVED" &&
        w.stage !== "PROPOSED"
    ).length;
    const published = works.filter((w) => w.stage === "PUBLISHED").length;
    const overdue = works.filter((w) => isOverdue(w)).length;
    return { total, inProgress, published, overdue };
  }, [works]);

  // ————— Handlers —————
  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleView(w: ScientificWork) {
    setViewing(w);
    setViewOpen(true);
  }

  function handleEdit(w: ScientificWork) {
    setEditing(w);
    setFormOpen(true);
  }

  async function handleAdvance(w: ScientificWork) {
    await advance(w.id);
  }

  function requestDelete(w: ScientificWork) {
    setDeleteTarget(w);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await remove(deleteTarget.id);
    setDeleting(false);
    if (ok) setDeleteTarget(null);
  }

  async function handleSubmit(values: WorkFormValues) {
    setSubmitting(true);
    const ok = editing
      ? await update(editing.id, values)
      : await create(values);
    setSubmitting(false);
    if (ok) setFormOpen(false);
  }

  function clearAllFilters() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  // ————— حالة الخطأ المحظورة —————
  if (error && works.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="تعذّر تحميل الأعمال العلمية"
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

  // ————— حالة التحميل الأولي —————
  if (loading && works.length === 0) {
    return <WorksPageSkeleton />;
  }

  const hasActiveFilters =
    !!search ||
    filters.stage !== "ALL" ||
    filters.specialty !== "ALL" ||
    filters.track !== "ALL" ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-saei-purple-700 mb-1">
            {isResearcher ? "أعمالي العلمية" : "الأعمال العلمية"}
          </h1>
          <p className="text-stone-600 text-sm">
            {isResearcher
              ? "قائمة الأعمال العلمية المُسنَدة إليك"
              : "إدارة شاملة لجميع الأعمال العلمية في مؤسسة ساعي"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={loading}
            aria-label="تحديث"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>
          {!isResearcher && (
            <Button variant="primary" size="md" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">إضافة عمل علمي جديد</span>
              <span className="xs:hidden sm:hidden">إضافة</span>
            </Button>
          )}
        </div>
      </div>

      {/* تنبيه عن خطأ مع وجود بيانات */}
      {error && works.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-saei-purple/10 text-saei-purple-700 grid place-items-center">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>إجمالي الأعمال</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(stats.total)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 grid place-items-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>قيد التنفيذ</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(stats.inProgress)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>منشور</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {toArabicDigits(stats.published)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 p-4">
            <div className="h-11 w-11 rounded-xl bg-red-100 text-red-700 grid place-items-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>متأخر</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-red-700">
                {toArabicDigits(stats.overdue)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <WorksFilters value={filters} onChange={handleFiltersChange} />

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ابحث في العنوان أو اسم الباحث..."
            className="pe-10"
          />
        </div>
        <span className="text-xs text-stone-500 whitespace-nowrap tabular-nums">
          {toArabicDigits(sorted.length)} نتيجة
        </span>
      </div>

      {/* النتائج: empty / table */}
      {sorted.length === 0 ? (
        works.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={
              isResearcher
                ? "لا توجد أعمال علمية مُسنَدة إليك بعد"
                : "لا توجد أعمال علمية بعد"
            }
            description={
              isResearcher
                ? "تواصل مع منسق الأبحاث لإسناد عمل علمي إليك."
                : "ابدأ بإضافة أول عمل علمي لتراكم سير الإنتاج العلمي للمؤسسة."
            }
            action={
              isResearcher ? null : (
                <Button variant="primary" onClick={openAdd}>
                  <Plus className="h-4 w-4" />
                  إضافة عمل علمي جديد
                </Button>
              )
            }
            variant="subtle"
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="لا توجد نتائج تطابق بحثك"
            description="جرّب تعديل الفلاتر أو البحث بكلمات مختلفة."
            action={
              hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters}>
                  مسح كل الفلاتر
                </Button>
              )
            }
            variant="subtle"
          />
        )
      ) : (
        <>
          <WorksTable
            works={pageItems}
            sort={sort}
            onSort={handleSort}
            onView={handleView}
            onEdit={handleEdit}
            onAdvance={handleAdvance}
            onDelete={requestDelete}
            onAssignReviewers={
              isResearcher ? undefined : (w) => setAssignTarget(w)
            }
            readOnly={isResearcher}
          />

          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={sorted.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}

      {/* Dialogs */}
      <WorkFormDialog
        open={formOpen}
        initial={editing}
        submitting={submitting}
        onOpenChange={(v) => !submitting && setFormOpen(v)}
        onSubmit={handleSubmit}
      />
      <WorkViewDialog
        open={viewOpen}
        work={viewing}
        onOpenChange={setViewOpen}
      />

      {/* تأكيد الحذف */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="حذف عمل علمي"
        description={
          deleteTarget && (
            <>
              هل أنت متأكد من حذف العمل{" "}
              <strong className="text-saei-purple-700">
                «{deleteTarget.title}»
              </strong>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </>
          )
        }
        confirmLabel="حذف نهائي"
        loading={deleting}
        onOpenChange={(v) => !deleting && !v && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* تعيين محكمين */}
      <AssignReviewersDialog
        open={!!assignTarget}
        work={assignTarget}
        onOpenChange={(v) => !v && setAssignTarget(null)}
      />
    </div>
  );
}
