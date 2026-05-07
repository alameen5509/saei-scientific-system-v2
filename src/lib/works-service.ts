// طبقة وسيطة بين API routes و Prisma — تحوّل صفوف DB إلى نوع ScientificWork
// المستخدم في الواجهة، وتدير إنشاء/تحديث الباحثين عند الحاجة.

import { prisma } from "@/lib/prisma";
import type { ScientificWork, WorkStage, WorkTrack } from "@/types/works";

// ————————————————————————————————
// Helpers
// ————————————————————————————————

const TITLE_REGEX = /^(أ\.د\.|د\.|أ\.)\s*/;
const stripTitle = (s: string) => s.replace(TITLE_REGEX, "").trim();
const extractTitle = (s: string) => s.match(TITLE_REGEX)?.[1] ?? null;

function emailFromName(name: string): string {
  const ascii = name
    .replace(TITLE_REGEX, "")
    .trim()
    .replace(/\s+/g, ".")
    .toLowerCase();
  // إن لم تكن قابلة للتمثيل ASCII، نستخدم timestamp
  if (/[^\x00-\x7F]/.test(ascii)) {
    return `researcher.${Date.now()}@saei.local`;
  }
  return `${ascii}@saei.local`;
}

// ————————————————————————————————
// تحويل صف DB إلى ScientificWork (للواجهة)
// ————————————————————————————————

interface DbWorkWithResearcher {
  id: string;
  code: string;
  title: string;
  specialty: string;
  track: string;
  stageCode: string;
  progress: number;
  startedAt: Date;
  deadline: Date;
  notes: string | null;
  researcher: { displayName: string };
}

export function serializeWork(w: DbWorkWithResearcher): ScientificWork {
  return {
    id: w.id,
    code: w.code,
    title: w.title,
    specialty: w.specialty as ScientificWork["specialty"],
    track: w.track as WorkTrack,
    researcher: w.researcher.displayName,
    stage: w.stageCode as WorkStage,
    progress: w.progress,
    startedAt: w.startedAt.toISOString().slice(0, 10),
    deadline: w.deadline.toISOString().slice(0, 10),
    notes: w.notes ?? undefined,
  };
}

// ————————————————————————————————
// إيجاد أو إنشاء باحث بالاسم
// ————————————————————————————————

export async function findOrCreateResearcherByName(
  displayName: string
): Promise<string> {
  const existing = await prisma.researcher.findFirst({
    where: { displayName },
  });
  if (existing) return existing.id;

  // محاولة المطابقة بإزالة اللقب
  const base = stripTitle(displayName);
  const candidates = await prisma.researcher.findMany({
    where: { displayName: { contains: base } },
  });
  if (candidates.length > 0) return candidates[0].id;

  // إنشاء جديد
  const user = await prisma.user.create({
    data: {
      email: emailFromName(displayName),
      name: displayName,
      role: "RESEARCHER",
    },
  });
  const r = await prisma.researcher.create({
    data: {
      userId: user.id,
      displayName,
      academicTitle: extractTitle(displayName),
    },
  });
  return r.id;
}

// ————————————————————————————————
// التحقق من المدخلات
// ————————————————————————————————

// VALID_STAGES يستورد من types/works ليبقى المصدر واحداً
import { STAGE_ORDER as STAGE_LIST } from "@/types/works";
const VALID_STAGES = STAGE_LIST;
const VALID_TRACKS = ["BOOK", "JOURNAL", "THESIS", "ARTICLE"] as const;

export interface WorkInput {
  code?: string;
  title: string;
  specialty: string;
  track: string;
  researcher: string;
  stage: string;
  progress: number;
  startedAt: string;
  deadline: string;
  notes?: string;
}

export function validateWorkInput(input: unknown): {
  ok: true;
  data: WorkInput;
} | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "بيانات غير صالحة" };
  }
  const i = input as Partial<WorkInput>;

  if (!i.title || typeof i.title !== "string" || !i.title.trim())
    return { ok: false, error: "عنوان العمل مطلوب" };
  if (!i.researcher || typeof i.researcher !== "string" || !i.researcher.trim())
    return { ok: false, error: "اسم الباحث مطلوب" };
  if (!i.specialty || typeof i.specialty !== "string")
    return { ok: false, error: "التخصص مطلوب" };
  if (
    !i.track ||
    typeof i.track !== "string" ||
    !VALID_TRACKS.includes(i.track as (typeof VALID_TRACKS)[number])
  )
    return { ok: false, error: "المسار غير صالح" };
  if (
    !i.stage ||
    typeof i.stage !== "string" ||
    !VALID_STAGES.includes(i.stage as (typeof VALID_STAGES)[number])
  )
    return { ok: false, error: "المرحلة غير صالحة" };
  if (typeof i.progress !== "number" || i.progress < 0 || i.progress > 100)
    return { ok: false, error: "نسبة التقدم يجب أن تكون بين 0 و 100" };
  if (!i.startedAt || typeof i.startedAt !== "string")
    return { ok: false, error: "تاريخ البدء مطلوب" };
  if (!i.deadline || typeof i.deadline !== "string")
    return { ok: false, error: "الموعد النهائي مطلوب" };

  return {
    ok: true,
    data: {
      code: typeof i.code === "string" ? i.code : undefined,
      title: i.title.trim(),
      specialty: i.specialty,
      track: i.track,
      researcher: i.researcher.trim(),
      stage: i.stage,
      progress: i.progress,
      startedAt: i.startedAt,
      deadline: i.deadline,
      notes:
        typeof i.notes === "string" && i.notes.trim() ? i.notes.trim() : undefined,
    },
  };
}

// ————————————————————————————————
// توليد رمز فريد عند عدم تحديد رمز
// ————————————————————————————————

export async function nextWorkCode(): Promise<string> {
  const count = await prisma.scientificWork.count();
  const year = new Date().getFullYear();
  const num = String(count + 1).padStart(3, "0");
  return `SAEI-${year}-${num}`;
}

// ————————————————————————————————
// إيجاد المرحلة التالية في WorkflowStage
// ————————————————————————————————

export async function findNextStageCode(
  currentCode: string
): Promise<string | null> {
  const current = await prisma.workflowStage.findUnique({
    where: { code: currentCode },
  });
  if (!current) return null;
  const next = await prisma.workflowStage.findFirst({
    where: { order: { gt: current.order } },
    orderBy: { order: "asc" },
  });
  return next?.code ?? null;
}
