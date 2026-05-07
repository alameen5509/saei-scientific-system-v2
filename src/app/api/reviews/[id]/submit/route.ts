// POST /api/reviews/[id]/submit — تسليم المراجعة نهائياً
// — يتطلب كل الحقول صحيحة (validateSubmitInput)
// — REVIEWER فقط لمراجعاته الخاصة
// — يحدّث status=SUBMITTED + submittedAt + يزيد totalCompleted للمحكم
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import {
  reviewBelongsToUser,
  serializeReviewForReviewer,
  validateSubmitInput,
} from "@/lib/reviews-service";
import { notifyRole } from "@/lib/notify";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function POST(req: Request, { params }: Params) {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  if (me.role !== "REVIEWER") {
    return NextResponse.json(
      { ok: false, error: "تسليم المراجعة للمحكم فقط" },
      { status: 403 }
    );
  }
  const isOwner = await reviewBelongsToUser(params.id, me.id);
  if (!isOwner) {
    return NextResponse.json(
      { ok: false, error: "غير مصرّح بالوصول" },
      { status: 403 }
    );
  }

  try {
    const review = await prisma.review.findUnique({
      where: { id: params.id },
    });
    if (!review) {
      return NextResponse.json(
        { ok: false, error: "المراجعة غير موجودة" },
        { status: 404 }
      );
    }
    if (review.status === "SUBMITTED") {
      return NextResponse.json(
        { ok: false, error: "المراجعة سُلِّمت بالفعل" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const v = validateSubmitInput(body);
    if (!v.ok) {
      return NextResponse.json(
        { ok: false, error: v.error },
        { status: 400 }
      );
    }
    const data = v.data;

    const updated = await prisma.review.update({
      where: { id: params.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        scientificScore: data.scientificScore,
        linguisticScore: data.linguisticScore,
        methodologyScore: data.methodologyScore,
        decision: data.decision,
        recommendations: data.recommendations,
        notesToEditor: data.notesToEditor ?? null,
      },
      include: {
        work: {
          select: {
            id: true,
            title: true,
            specialty: true,
            track: true,
            notes: true,
          },
        },
      },
    });

    // إنقاص العدّاد فقط إن لم تكن مسلَّمة سابقاً
    await prisma.reviewer.update({
      where: { id: review.reviewerId },
      data: { totalCompleted: { increment: 1 } },
    });

    // إشعار للمنسقين بانتهاء المراجعة (الباحث لا يُخبَر مباشرة لحفظ مجهولية المحكم)
    await notifyRole("RESEARCH_COORDINATOR", {
      kind: "REVIEW_SUBMITTED",
      title: `وردت مراجعة لعمل: ${updated.work.title}`,
      body: `قرار المحكم: ${data.decision}`,
      link: `/reviews/${updated.id}`,
    });

    return NextResponse.json({
      ok: true,
      review: serializeReviewForReviewer(updated),
    });
  } catch (err) {
    console.error("POST /api/reviews/[id]/submit", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر تسليم المراجعة" },
      { status: 500 }
    );
  }
}
