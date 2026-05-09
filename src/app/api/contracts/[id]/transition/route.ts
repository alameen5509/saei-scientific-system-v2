// POST /api/contracts/[id]/transition — تغيير حالة العقد
// — DRAFT → SENT      (إرسال للطرف)
// — SENT  → SIGNED    (تأكيد توقيع داخل التطبيق — ليس DocuSign)
// — SENT  → EXPIRED|CANCELLED
// — DRAFT → CANCELLED
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { VALID_STATUS_TRANSITIONS } from "@/lib/contracts-service";
import { notifyRole, notify } from "@/lib/notify";
import { templates } from "@/lib/email";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function POST(req: Request, { params }: Params) {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "JOURNAL_COORDINATOR"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const body = await req.json();
  const { to, signatureNote } = body as {
    to?: string;
    signatureNote?: string;
  };
  if (!to || typeof to !== "string") {
    return NextResponse.json(
      { ok: false, error: "الحالة الهدف مطلوبة" },
      { status: 400 }
    );
  }

  const c = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      work: { select: { id: true, title: true, researcher: { select: { userId: true } } } },
    },
  });
  if (!c) {
    return NextResponse.json(
      { ok: false, error: "العقد غير موجود" },
      { status: 404 }
    );
  }

  const allowed = VALID_STATUS_TRANSITIONS[c.status as keyof typeof VALID_STATUS_TRANSITIONS] ?? [];
  if (!allowed.includes(to as typeof allowed[number])) {
    return NextResponse.json(
      {
        ok: false,
        error: `لا يمكن الانتقال من ${c.status} إلى ${to}`,
      },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { status: to };
  if (to === "SIGNED") {
    data.signedById = me.id;
    data.signedAt = new Date();
    if (typeof signatureNote === "string") data.signatureNote = signatureNote;
  }

  const updated = await prisma.contract.update({
    where: { id: params.id },
    data,
    include: { work: { select: { id: true, code: true, title: true } } },
  });

  // إشعارات حسب الحالة
  if (to === "SENT") {
    await notifyRole("ADMIN", {
      kind: "CONTRACT_SENT",
      title: `عقد جديد قيد التوقيع: ${updated.title}`,
      body: `الطرف: ${updated.partyName}`,
      link: `/contracts/${updated.id}`,
    });
  } else if (to === "SIGNED") {
    if (c.work?.researcher.userId) {
      const tpl = templates.contractSigned({
        contractTitle: updated.title,
        contractId: updated.id,
        workTitle: c.work.title,
      });
      await notify({
        userId: c.work.researcher.userId,
        kind: "CONTRACT_SIGNED",
        title: `وُقِّع عقد متعلّق بعملك: "${c.work.title}"`,
        body: updated.title,
        link: `/contracts/${updated.id}`,
        email: tpl,
      });
    }
    await notifyRole("ADMIN", {
      kind: "CONTRACT_SIGNED",
      title: `تمّ توقيع عقد: ${updated.title}`,
      body: `الطرف: ${updated.partyName}`,
      link: `/contracts/${updated.id}`,
    });
  }

  return NextResponse.json({ ok: true, contract: updated });
}
