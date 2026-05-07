// أنواع وقيم الأعمال العلمية في مؤسسة ساعي
// — ١٢ مرحلة سير عمل كاملة من الاقتراح إلى الأرشفة

export type WorkStage =
  | "PROPOSED"             // ١. مقترح
  | "RESEARCH"             // ٢. قيد البحث
  | "WRITING"              // ٣. قيد الكتابة
  | "FIRST_SUBMISSION"     // ٤. تسليم أوّلي
  | "UNDER_REVIEW"         // ٥. قيد التحكيم
  | "REVIEW_FEEDBACK"      // ٦. تجميع ملاحظات المحكمين
  | "REVISION_REQUESTED"   // ٧. مطلوب تعديل
  | "REVISED_SUBMISSION"   // ٨. تسليم منقّح
  | "APPROVED"             // ٩. مُعتَمد للنشر
  | "IN_PRODUCTION"        // ١٠. قيد الإنتاج/الطباعة
  | "PUBLISHED"            // ١١. منشور
  | "ARCHIVED";            // ١٢. مؤرشف

export type WorkTrack = "BOOK" | "JOURNAL" | "THESIS" | "ARTICLE";

export type WorkSpecialty =
  | "HADITH"
  | "USUL"
  | "TAFSIR"
  | "AQEEDAH"
  | "FIQH"
  | "SEERAH"
  | "ARABIC"
  | "BIO";

export interface ScientificWork {
  id: string;
  code: string;
  title: string;
  specialty: WorkSpecialty;
  track: WorkTrack;
  researcher: string;
  stage: WorkStage;
  progress: number; // 0-100
  startedAt: string; // ISO
  deadline: string; // ISO
  notes?: string;
}

// ————————————————————————————————
// التسميات بالعربية
// ————————————————————————————————

export const STAGE_LABEL: Record<WorkStage, string> = {
  PROPOSED: "مقترح",
  RESEARCH: "قيد البحث",
  WRITING: "قيد الكتابة",
  FIRST_SUBMISSION: "تسليم أوّلي",
  UNDER_REVIEW: "قيد التحكيم",
  REVIEW_FEEDBACK: "ملاحظات المحكمين",
  REVISION_REQUESTED: "مطلوب تعديل",
  REVISED_SUBMISSION: "تسليم منقّح",
  APPROVED: "معتمد للنشر",
  IN_PRODUCTION: "قيد الإنتاج",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

export const TRACK_LABEL: Record<WorkTrack, string> = {
  BOOK: "كتاب",
  JOURNAL: "مجلة",
  THESIS: "رسالة علمية",
  ARTICLE: "مقال",
};

export const SPECIALTY_LABEL: Record<WorkSpecialty, string> = {
  HADITH: "علوم الحديث",
  USUL: "أصول الفقه",
  TAFSIR: "التفسير",
  AQEEDAH: "العقيدة",
  FIQH: "الفقه",
  SEERAH: "السيرة النبوية",
  ARABIC: "اللغة العربية",
  BIO: "التراجم",
};

// ————————————————————————————————
// تسلسل المراحل + الانتقال
// — ١٢ مرحلة بترتيب صارم
// ————————————————————————————————

export const STAGE_ORDER: WorkStage[] = [
  "PROPOSED",
  "RESEARCH",
  "WRITING",
  "FIRST_SUBMISSION",
  "UNDER_REVIEW",
  "REVIEW_FEEDBACK",
  "REVISION_REQUESTED",
  "REVISED_SUBMISSION",
  "APPROVED",
  "IN_PRODUCTION",
  "PUBLISHED",
  "ARCHIVED",
];

export function nextStage(current: WorkStage): WorkStage | null {
  const i = STAGE_ORDER.indexOf(current);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}

// المراحل التي تتطلّب تسليم ملف من الباحث
export const SUBMISSION_STAGES: WorkStage[] = [
  "FIRST_SUBMISSION",
  "REVISED_SUBMISSION",
];

export function isSubmissionStage(stage: WorkStage): boolean {
  return SUBMISSION_STAGES.includes(stage);
}

// ————————————————————————————————
// حالة المتأخر — موعد نهائي مرّ ولم يُنشر/يؤرشف
// ————————————————————————————————

export function isOverdue(work: ScientificWork, now = new Date()): boolean {
  if (work.stage === "PUBLISHED" || work.stage === "ARCHIVED") return false;
  return new Date(work.deadline).getTime() < now.getTime();
}

// ————————————————————————————————
// ربط لوني للمراحل (badge variant)
// ————————————————————————————————

export type BadgeTone =
  | "purple"
  | "gold"
  | "teal"
  | "green"
  | "red"
  | "amber"
  | "gray";

export function stageTone(stage: WorkStage): BadgeTone {
  switch (stage) {
    case "PROPOSED":
      return "purple";
    case "RESEARCH":
    case "WRITING":
      return "amber";
    case "FIRST_SUBMISSION":
    case "REVISED_SUBMISSION":
      return "teal";
    case "UNDER_REVIEW":
    case "REVIEW_FEEDBACK":
      return "gold";
    case "REVISION_REQUESTED":
      return "red";
    case "APPROVED":
    case "IN_PRODUCTION":
      return "teal";
    case "PUBLISHED":
      return "green";
    case "ARCHIVED":
      return "gray";
  }
}

export function trackTone(track: WorkTrack): BadgeTone {
  switch (track) {
    case "BOOK":
      return "purple";
    case "JOURNAL":
      return "teal";
    case "THESIS":
      return "gold";
    case "ARTICLE":
      return "amber";
  }
}

// ————————————————————————————————
// لون شريط التقدم بناءً على النسبة
// ————————————————————————————————

export function progressColor(p: number): string {
  if (p >= 100) return "bg-emerald-500";
  if (p >= 70) return "bg-saei-teal";
  if (p >= 40) return "bg-saei-gold";
  return "bg-saei-purple-300";
}
