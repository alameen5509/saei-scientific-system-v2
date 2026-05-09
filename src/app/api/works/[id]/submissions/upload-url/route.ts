// POST /api/works/[id]/submissions/upload-url
// — المرحلة الأولى من رفع التسليم:
//   1) العميل يطلب signed URL مع البيانات الوصفية
//   2) السيرفر يتحقّق من الصلاحيات وحجم/نوع الملف
//   3) يرجع { uploadUrl, token, storagePath, version }
// — العميل يرفع PUT مباشرة إلى uploadUrl
// — العميل يستدعي POST /api/works/[id]/submissions لتسجيل الـrow
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import {
  buildStoragePath,
  createSignedUploadUrl,
  isStorageConfigured,
} from "@/lib/storage";

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

export async function POST(req: NextRequest, { params }: Params) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "تخزين الملفات غير مهيّأ — يحتاج SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 503 }
    );
  }

  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const work = await prisma.scientificWork.findUnique({
    where: { id: params.id },
    include: { researcher: { select: { userId: true } } },
  });
  if (!work) {
    return NextResponse.json(
      { ok: false, error: "العمل غير موجود" },
      { status: 404 }
    );
  }

  // أذونات: الباحث على عمله، أو منسق/مدير
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
  const { fileName, mimeType, size } = body as {
    fileName?: string;
    mimeType?: string;
    size?: number;
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

  // version التالي
  const last = await prisma.workSubmission.findFirst({
    where: { workId: params.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const storagePath = buildStoragePath({
    workId: params.id,
    version: nextVersion,
    fileName,
  });

  try {
    const signed = await createSignedUploadUrl(storagePath);
    return NextResponse.json({
      ok: true,
      uploadUrl: signed.url,
      token: signed.token,
      storagePath,
      version: nextVersion,
    });
  } catch (err) {
    console.error("upload-url error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "تعذّر تجهيز الرفع",
      },
      { status: 500 }
    );
  }
}
