// POST /api/works/[id]/submissions — تسليم نسخة جديدة (الباحث على عمله، أو منسق)
// GET  /api/works/[id]/submissions — قائمة التسليمات (الباحث على عمله، الإدارة على الكل)
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { notify, notifyRole } from "@/lib/notify";

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
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

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

  // أذونات التسليم: الباحث على عمله، أو منسّق/مدير
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

  // تحديد رقم الإصدار التلقائي
  const last = await prisma.workSubmission.findFirst({
    where: { workId: params.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;

  const created = await prisma.workSubmission.create({
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

  // ——— نقل المرحلة تلقائياً عند تسليم أوّلي/منقّح ———
  let advancedTo: string | null = null;
  if (kind === "FIRST_DRAFT" && work.stageCode === "WRITING") {
    advancedTo = "FIRST_SUBMISSION";
  } else if (
    kind === "REVISION" &&
    work.stageCode === "REVISION_REQUESTED"
  ) {
    advancedTo = "REVISED_SUBMISSION";
  }
  if (advancedTo) {
    await prisma.scientificWork.update({
      where: { id: params.id },
      data: { stageCode: advancedTo },
    });
  }

  // ——— إشعارات ———
  // 1. للباحث (إذا كان المنسّق هو من رفع)
  if (!isOwner) {
    await notify({
      userId: work.researcher.userId,
      kind: "SUBMISSION_RECEIVED",
      title: `تمّ تسجيل تسليم جديد لعملك "${work.title}"`,
      body: `الإصدار رقم ${version} — ${fileName}`,
      link: `/projects?work=${work.id}`,
    });
  }
  // 2. للمنسقين (إذا الباحث هو من رفع)
  if (isOwner) {
    await notifyRole("RESEARCH_COORDINATOR", {
      kind: "SUBMISSION_RECEIVED",
      title: `تسليم جديد من باحث: "${work.title}"`,
      body: `${work.researcher.displayName} رفع الإصدار ${version}.`,
      link: `/projects?work=${work.id}`,
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
