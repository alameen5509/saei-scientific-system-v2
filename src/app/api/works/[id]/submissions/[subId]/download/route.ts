// GET /api/works/[id]/submissions/[subId]/download
// — يرجع 302 إلى signed URL قصير الصلاحية (٥ دقائق)
// — أذونات: الباحث على عمله، الإدارة، أو محكم مُسنَد لهذا العمل
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import {
  createSignedDownloadUrl,
  isStorageConfigured,
} from "@/lib/storage";

export const runtime = "nodejs";

interface Params {
  params: { id: string; subId: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { ok: false, error: "تخزين الملفات غير مهيّأ" },
      { status: 503 }
    );
  }

  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const sub = await prisma.workSubmission.findUnique({
    where: { id: params.subId },
  });
  if (!sub || sub.workId !== params.id) {
    return NextResponse.json(
      { ok: false, error: "التسليم غير موجود" },
      { status: 404 }
    );
  }
  if (!sub.storagePath) {
    return NextResponse.json(
      { ok: false, error: "هذا التسليم بدون ملف فعلي" },
      { status: 404 }
    );
  }

  // أذونات
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

  let allowed = false;
  if (
    me.role === "ADMIN" ||
    me.role === "RESEARCH_COORDINATOR" ||
    me.role === "JOURNAL_COORDINATOR"
  ) {
    allowed = true;
  } else if (me.role === "RESEARCHER" && work.researcher.userId === me.id) {
    allowed = true;
  } else if (me.role === "REVIEWER") {
    // محكم مُسنَد لهذا العمل
    const reviewer = await prisma.reviewer.findUnique({
      where: { userId: me.id },
      select: { id: true },
    });
    if (reviewer) {
      const review = await prisma.review.findFirst({
        where: { workId: params.id, reviewerId: reviewer.id },
        select: { id: true },
      });
      if (review) allowed = true;
    }
  }

  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "غير مسموح بتنزيل هذا التسليم" },
      { status: 403 }
    );
  }

  try {
    const url = await createSignedDownloadUrl(sub.storagePath, 300);
    return NextResponse.redirect(url, 302);
  } catch (err) {
    console.error("download error:", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر إنشاء رابط التنزيل" },
      { status: 500 }
    );
  }
}
