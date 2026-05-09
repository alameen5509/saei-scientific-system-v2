// تحديث متقدم — تصنيف، درجات، ملاحظات (يُحسب scoreTotal مرجَّحاً)
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

// أوزان معايير التصنيف (مجموعها 100)
const W_EXPERTISE = 50;
const W_PUBLICATIONS = 30;
const W_FIT = 20;

function computeTotal(
  expertise?: number | null,
  publications?: number | null,
  fit?: number | null
): number | null {
  if (expertise == null && publications == null && fit == null) return null;
  const e = expertise ?? 0;
  const p = publications ?? 0;
  const f = fit ?? 0;
  return Math.round(
    (e * W_EXPERTISE + p * W_PUBLICATIONS + f * W_FIT) / 100
  );
}

export async function GET(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const a = await prisma.applicant.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { announcement: { select: { id: true, title: true } } },
  });
  if (!a) {
    return NextResponse.json(
      { ok: false, error: "غير موجود" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, applicant: a });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  for (const k of [
    "fullName",
    "email",
    "phone",
    "cvText",
    "qualifications",
    "publicationsCount",
    "yearsExperience",
    "classification",
    "scoreExpertise",
    "scorePublications",
    "scoreFit",
    "notes",
  ]) {
    if (k in body) allowed[k] = body[k];
  }

  if (
    "scoreExpertise" in allowed ||
    "scorePublications" in allowed ||
    "scoreFit" in allowed ||
    "classification" in allowed
  ) {
    const cur = await prisma.applicant.findUnique({
      where: { id: params.id },
    });
    if (!cur) {
      return NextResponse.json(
        { ok: false, error: "غير موجود" },
        { status: 404 }
      );
    }
    const e =
      "scoreExpertise" in allowed
        ? (allowed.scoreExpertise as number | null)
        : cur.scoreExpertise;
    const p =
      "scorePublications" in allowed
        ? (allowed.scorePublications as number | null)
        : cur.scorePublications;
    const f =
      "scoreFit" in allowed
        ? (allowed.scoreFit as number | null)
        : cur.scoreFit;
    allowed.scoreTotal = computeTotal(e, p, f);
    allowed.evaluatedById = me.id;
    allowed.evaluatedAt = new Date();
  }

  const updated = await prisma.applicant.update({
    where: { id: params.id },
    data: allowed,
    include: { announcement: { select: { title: true } } },
  });

  if ("classification" in body) {
    await prisma.auditLog.create({
      data: {
        action: "APPLICANT_CLASSIFY",
        actorId: me.id,
        targetId: updated.id,
        metadata: {
          classification: updated.classification,
          scoreTotal: updated.scoreTotal,
        },
      },
    });

    // إخطار المتقدم بالقبول/الرفض إن كان لديه بريد
    if (updated.email && !updated.notificationSentAt) {
      const isAccepted = updated.classification === "SUITABLE";
      const isRejected = updated.classification === "UNSUITABLE";
      if (isAccepted || isRejected) {
        const subject = isAccepted
          ? "تهانينا — تم قبول تقديمك"
          : "نشكر اهتمامك — لم يتم اختيارك";
        const bodyHtml = isAccepted
          ? `<p>السلام عليكم،</p>
             <p>يسعدنا إبلاغكم بقبول تقديمكم للإعلان:</p>
             <p style="background:#dcfce7;border-right:4px solid #16a34a;padding:12px;border-radius:8px"><strong>${updated.announcement.title}</strong></p>
             <p>سيتواصل معكم منسق الأبحاث للخطوات التالية.</p>`
          : `<p>السلام عليكم،</p>
             <p>نشكركم على اهتمامكم بالإعلان:</p>
             <p style="background:#fef3c7;border-right:4px solid #f59e0b;padding:12px;border-radius:8px"><strong>${updated.announcement.title}</strong></p>
             <p>بعد دراسة الطلبات، اعتذرنا عن قبول تقديمكم في هذا الإعلان. نتمنى لكم التوفيق.</p>`;
        void sendEmail({ to: updated.email, subject, bodyHtml });
        await prisma.applicant.update({
          where: { id: params.id },
          data: { notificationSentAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, applicant: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  await prisma.applicant.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
