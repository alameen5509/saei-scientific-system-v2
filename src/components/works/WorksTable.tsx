"use client";

// جدول الأعمال العلمية — تصميم desktop + بطاقات للجوال
// + رؤوس قابلة للترتيب
import { CalendarDays, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  SortableHeader,
  type SortState,
} from "@/components/ui/sortable-header";
import { WorkActionsMenu } from "./WorkActionsMenu";
import {
  STAGE_LABEL,
  TRACK_LABEL,
  SPECIALTY_LABEL,
  isOverdue,
  stageTone,
  trackTone,
  progressColor,
  type ScientificWork,
} from "@/types/works";
import { cn, toArabicDigits, formatDate } from "@/lib/utils";

export type WorksSortKey =
  | "title"
  | "researcher"
  | "progress"
  | "deadline"
  | "stage";

interface Props {
  works: ScientificWork[];
  sort: SortState<WorksSortKey> | null;
  onSort: (key: WorksSortKey) => void;
  onView: (w: ScientificWork) => void;
  onEdit: (w: ScientificWork) => void;
  onAdvance: (w: ScientificWork) => void;
  onDelete: (w: ScientificWork) => void;
  onAssignReviewers?: (w: ScientificWork) => void;
  onSubmissions?: (w: ScientificWork) => void;
  /** يُمرَّر إلى WorkActionsMenu لإخفاء الكتابة (للباحث) */
  readOnly?: boolean;
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-saei-purple-50 overflow-hidden">
        <div
          className={cn("h-full transition-all", progressColor(v))}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs font-bold text-saei-purple-700 tabular-nums w-10 text-left">
        {toArabicDigits(v)}٪
      </span>
    </div>
  );
}

function DeadlineCell({ work }: { work: ScientificWork }) {
  const overdue = isOverdue(work);
  return (
    <div className="flex items-center gap-1.5">
      {overdue ? (
        <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
      ) : (
        <CalendarDays className="h-3.5 w-3.5 text-stone-400 shrink-0" />
      )}
      <span
        className={cn(
          "text-xs whitespace-nowrap",
          overdue ? "text-red-700 font-bold" : "text-stone-600"
        )}
      >
        {formatDate(work.deadline)}
      </span>
      {overdue && (
        <Badge variant="red" className="me-1">
          متأخر
        </Badge>
      )}
    </div>
  );
}

export function WorksTable({
  works,
  sort,
  onSort,
  onView,
  onEdit,
  onAdvance,
  onDelete,
  onAssignReviewers,
  onSubmissions,
  readOnly = false,
}: Props) {
  return (
    <>
      {/* جدول للشاشات الكبيرة */}
      <div className="hidden md:block rounded-2xl border border-saei-purple-100 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">
                <SortableHeader<WorksSortKey>
                  label="العنوان"
                  sortKey="title"
                  current={sort}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>التخصص</TableHead>
              <TableHead>المسار</TableHead>
              <TableHead>
                <SortableHeader<WorksSortKey>
                  label="الباحث"
                  sortKey="researcher"
                  current={sort}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader<WorksSortKey>
                  label="المرحلة"
                  sortKey="stage"
                  current={sort}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead className="w-[14%]">
                <SortableHeader<WorksSortKey>
                  label="التقدم"
                  sortKey="progress"
                  current={sort}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader<WorksSortKey>
                  label="الموعد النهائي"
                  sortKey="deadline"
                  current={sort}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead className="w-12">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {works.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="font-bold text-saei-purple-700 leading-tight">
                    {w.title}
                  </div>
                  <div className="text-xs text-stone-500 ltr text-left mt-0.5">
                    {w.code}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {SPECIALTY_LABEL[w.specialty]}
                </TableCell>
                <TableCell>
                  <Badge variant={trackTone(w.track)}>
                    {TRACK_LABEL[w.track]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {w.researcher}
                </TableCell>
                <TableCell>
                  <Badge variant={stageTone(w.stage)}>
                    {STAGE_LABEL[w.stage]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ProgressBar value={w.progress} />
                </TableCell>
                <TableCell>
                  <DeadlineCell work={w} />
                </TableCell>
                <TableCell>
                  <WorkActionsMenu
                    work={w}
                    onView={onView}
                    onEdit={onEdit}
                    onAdvance={onAdvance}
                    onDelete={onDelete}
                    onAssignReviewers={onAssignReviewers}
                    onSubmissions={onSubmissions}
                    readOnly={readOnly}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* بطاقات للجوال */}
      <div className="md:hidden space-y-3">
        {works.map((w) => {
          const overdue = isOverdue(w);
          return (
            <div
              key={w.id}
              className={cn(
                "rounded-2xl border bg-white p-4 space-y-3",
                overdue
                  ? "border-red-200 bg-red-50/30"
                  : "border-saei-purple-100"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-stone-500 ltr text-left mb-1">
                    {w.code}
                  </div>
                  <h3 className="font-bold text-saei-purple-700 leading-tight">
                    {w.title}
                  </h3>
                </div>
                <WorkActionsMenu
                  work={w}
                  onView={onView}
                  onEdit={onEdit}
                  onAdvance={onAdvance}
                  onDelete={onDelete}
                  onAssignReviewers={onAssignReviewers}
                  onSubmissions={onSubmissions}
                  readOnly={readOnly}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant={stageTone(w.stage)}>
                  {STAGE_LABEL[w.stage]}
                </Badge>
                <Badge variant={trackTone(w.track)}>
                  {TRACK_LABEL[w.track]}
                </Badge>
                <Badge variant="purple">{SPECIALTY_LABEL[w.specialty]}</Badge>
                {overdue && <Badge variant="red">متأخر</Badge>}
              </div>

              <div className="text-xs text-stone-600 flex items-center gap-2">
                <span className="font-bold">الباحث:</span>
                <span>{w.researcher}</span>
              </div>

              <ProgressBar value={w.progress} />

              <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1 border-t border-saei-purple-100">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>الموعد النهائي:</span>
                <span
                  className={cn(
                    overdue ? "text-red-700 font-bold" : "text-stone-700"
                  )}
                >
                  {formatDate(w.deadline)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
