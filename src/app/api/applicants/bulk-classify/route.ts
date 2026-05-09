// تصنيف جماعي لمتقدمين — POST { ids: string[], classification: ApplicantClassification }
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const { ids, classification } = (await req.json()) as {
    ids?: string[];
    classification?: string;
  };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: "اختر متقدمين" },
      { status: 400 }
    );
  }
  if (
    !classification ||
    !["PENDING", "SUITABLE", "PARTIALLY_SUITABLE", "UNSUITABLE"].includes(
      classification
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "تصنيف غير صالح" },
      { status: 400 }
    );
  }

  const r = await prisma.applicant.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: {
      classification: classification as never,
      evaluatedById: me.id,
      evaluatedAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "APPLICANT_CLASSIFY",
      actorId: me.id,
      metadata: { ids, classification, bulk: true, count: r.count },
    },
  });
  return NextResponse.json({ ok: true, count: r.count });
}
