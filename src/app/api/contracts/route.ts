// GET  /api/contracts        — قائمة كل العقود (المدير + المنسقون)
// POST /api/contracts        — إنشاء عقد جديد (DRAFT)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import {
  serializeContract,
  validateContractInput,
} from "@/lib/contracts-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "JOURNAL_COORDINATOR"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const rows = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      work: { select: { id: true, code: true, title: true } },
    },
  });
  return NextResponse.json({
    ok: true,
    contracts: rows.map((c) => ({
      ...serializeContract(c),
      work: c.work,
    })),
  });
}

export async function POST(req: Request) {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "JOURNAL_COORDINATOR"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const v = validateContractInput(body);
    if (!v.ok) {
      return NextResponse.json(
        { ok: false, error: v.error },
        { status: 400 }
      );
    }
    const data = v.data;

    // التحقق من وجود العمل
    const work = await prisma.scientificWork.findUnique({
      where: { id: data.workId },
    });
    if (!work) {
      return NextResponse.json(
        { ok: false, error: "العمل غير موجود" },
        { status: 404 }
      );
    }

    const created = await prisma.contract.create({
      data: {
        workId: data.workId,
        kind: data.kind,
        title: data.title,
        body: data.body,
        partyName: data.partyName,
        partyEmail: data.partyEmail ?? null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        value: data.value ?? null,
        currency: data.currency ?? "SAR",
        milestones: (data.milestones ?? []) as never,
      },
      include: { work: { select: { id: true, code: true, title: true } } },
    });
    return NextResponse.json(
      {
        ok: true,
        contract: { ...serializeContract(created), work: created.work },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/contracts", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر إنشاء العقد" },
      { status: 500 }
    );
  }
}
