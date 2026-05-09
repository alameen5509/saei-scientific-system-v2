// POST /api/works/[id]/submissions — تسجيل تسليم بعد رفع الملف فعلياً
// GET  /api/works/[id]/submissions — قائمة التسليمات
//
// تدفّق الرفع المتكامل:
//   1) العميل: POST /api/works/[id]/submissions/upload-url مع metadata
//   2) العميل: PUT الملف على uploadUrl إلى Supabase Storage مباشرة
//   3) العميل: POST هذا المسار مع storagePath (والباقي) لتسجيل الـrow
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { notify, notifyRole } from "@/lib/notify";
import {
  isStorageConfigured,
  objectExists,
  deleteObject,
} from "@/lib/storage";
import { templates } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_SIZE = 50 * 1024 * 1024;

export async function GET(_req: NextRequest, { params }: Params) {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  // الباحث: فقط على أعماله
  if (me.role === "RESEARCHER") {
    const work = await prisma.scientificWork.findUnique({
      where: { id: params.id },
      include: { researcher: { select: { userId: true } } },
    });
    if (!work || work.researcher.userId !== me.id) {
      return NextResponse.json(
        { ok: false, error: "غير مسموح" },
        { status: 403 }
      );
    }
  }

  const subs = await prisma.workSubmission.findMany({
    where: { workId: params.id },
    orderBy: { version: "desc" },
  });
  return NextResponse.json({ ok: true, submissions: subs });
}

export async function POST(req: NextRequest, { params }: Params) {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const work = await prisma.scientificWork.findUnique({
    where: { id: params.id },
    include: { researcher: { select: { userId: true, displayName: true } } },
  });
  if (!work) {
    return NextResponse.json(
      { ok: false, error: "العمل غير موجود" },
      { status: 404 }
    );
  }

  const isOwner = me.role === "RESEARCHER" && work.researcher.userId === me.id;
  const isCoordinator =
    me.role === "ADMIN" ||
    me.role === "RESEARCH_COORDINATOR" ||
    me.role === "JOURNAL_COORDINATOR";
  if (!isOwner && !isCoordinator) {
    return NextResponse.json(
      { ok: false, error: "غير مسموح بتسليم نسخة لهذا العمل" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    fileName,
    mimeType,
    size,
    kind = "FIRST_DRAFT",
    notes = null,
    storagePath = null,
  } = body as {
    fileName?: string;
    mimeType?: string;
    size?: number;
    kind?: string;
    notes?: string | null;
    storagePath?: string | null;
  };

  if (!fileName || typeof fileName !== "string" || fileName.length > 255)
    return NextResponse.json(
      { ok: false, error: "اسم الملف غير صالح" },
      { status: 400 }
    );
  if (!mimeType || !ALLOWED_MIME.has(mimeType))
    return NextResponse.json(
      { ok: false, error: "نوع الملف غير مدعوم — مسموح PDF أو Word فقط" },
      { status: 400 }
    );
  if (typeof size !== "number" || size <= 0 || size > MAX_SIZE)
    return NextResponse.json(
      { ok: false, error: "حجم الملف غير صالح أو يتجاوز ٥٠ ميغابايت" },
      { status: 400 }
    );
  if (!["FIRST_DRAFT", "REVISION", "FINAL"].includes(kind))
    return NextResponse.json(
      { ok: false, error: "نوع التسليم غير صالح" },
      { status: 400 }
    );

  // إذا Storage مهيّأ، يجب أن يكون storagePath موجوداً وأن الملف رُفع فعلاً
  if (isStorageConfigured()) {
    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "ينقص storagePath — يجب رفع الملف أولاً عبر /upload-url",
        },
        { status: 400 }
      );
    }
    const exists = await objectExists(storagePath);
    if (!exists) {
      return NextResponse.json(
        {
          ok: false,
          error: "الملف لم يُرفع بعد إلى Storage — جرّب الرفع مجدداً",
        },
        { status: 400 }
      );
    }
  }

  // تحديد رقم الإصدار
  const last = await prisma.workSubmission.findFirst({
    where: { workId: params.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;

  let created;
  try {
    created = await prisma.workSubmission.create({
      data: {
        workId: params.id,
        version,
        kind: kind as "FIRST_DRAFT" | "REVISION" | "FINAL",
        fileName,
        mimeType,
        size,
        storagePath,
        uploadedBy: me.id,
        notes,
      },
    });
  } catch (err) {
    // تنظيف الملف إن فشلت كتابة DB
    if (storagePath && isStorageConfigured()) {
      void deleteObject(storagePath);
    }
    throw err;
  }

  // ——— نقل المرحلة تلقائياً ———
  let advancedTo: string | null = null;
  if (kind === "FIRST_DRAFT" && work.stageCode === "WRITING") {
    advancedTo = "FIRST_SUBMISSION";
  } else if (kind === "REVISION" && work.stageCode === "REVISION_REQUESTED") {
    advancedTo = "REVISED_SUBMISSION";
  }
  if (advancedTo) {
    await prisma.scientificWork.update({
      where: { id: params.id },
      data: { stageCode: advancedTo },
    });
  }

  // ——— إشعارات + بريد ———
  if (!isOwner) {
    const tpl = templates.submissionReceived({
      workTitle: work.title,
      version,
      workId: work.id,
      fileName,
      forResearcher: true,
    });
    await notify({
      userId: work.researcher.userId,
      kind: "SUBMISSION_RECEIVED",
      title: tpl.subject,
      body: `الإصدار ${version} — ${fileName}`,
      link: `/projects?work=${work.id}`,
      email: tpl,
    });
  }
  if (isOwner) {
    const tpl = templates.submissionReceived({
      workTitle: work.title,
      version,
      workId: work.id,
      fileName,
      researcherName: work.researcher.displayName,
      forResearcher: false,
    });
    await notifyRole("RESEARCH_COORDINATOR", {
      kind: "SUBMISSION_RECEIVED",
      title: tpl.subject,
      body: `${work.researcher.displayName} رفع الإصدار ${version}.`,
      link: `/projects?work=${work.id}`,
      email: tpl,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      submission: created,
      ...(advancedTo ? { stageAdvancedTo: advancedTo } : {}),
    },
    { status: 201 }
  );
}
