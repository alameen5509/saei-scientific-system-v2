// POST /api/contracts/from-work/[workId]
// — يُولّد عقداً جاهزاً (DRAFT) من بيانات العمل والباحث
// — body من القالب، الحقول قابلة للتعديل لاحقاً عبر PUT /api/contracts/[id]
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { generateContractTemplate } from "@/lib/contract-templates";
import type { ContractKind } from "@/generated/prisma/enums";
import type { WorkTrack } from "@/types/works";

export const runtime = "nodejs";

interface Params {
  params: { workId: string };
}

const VALID_KINDS = ["RESEARCH", "PUBLISHING", "EDITING"] as const;

export async function POST(req: NextRequest, { params }: Params) {
  const me = await requireRole(
    "ADMIN",
    "RESEARCH_COORDINATOR",
    "JOURNAL_COORDINATOR"
  );
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const work = await prisma.scientificWork.findUnique({
    where: { id: params.workId },
    include: { researcher: { select: { displayName: true } } },
  });
  if (!work) {
    return NextResponse.json(
      { ok: false, error: "العمل غير موجود" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawKind = (body.kind as string | undefined) ?? "RESEARCH";
  if (!VALID_KINDS.includes(rawKind as never)) {
    return NextResponse.json(
      { ok: false, error: "kind غير صالح" },
      { status: 400 }
    );
  }
  const kind = rawKind as ContractKind;

  const tpl = generateContractTemplate({
    kind,
    work: {
      code: work.code,
      title: work.title,
      track: work.track as WorkTrack,
      startedAt: work.startedAt,
      deadline: work.deadline,
      researcher: { displayName: work.researcher.displayName },
    },
    partyName:
      typeof body.partyName === "string" ? body.partyName : undefined,
    value: typeof body.value === "number" ? body.value : undefined,
    currency:
      typeof body.currency === "string" ? body.currency : undefined,
  });

  const created = await prisma.contract.create({
    data: {
      workId: work.id,
      kind,
      status: "DRAFT",
      title: tpl.title,
      body: tpl.body,
      partyName: tpl.partyName,
      partyEmail:
        typeof body.partyEmail === "string" ? body.partyEmail : null,
      startsAt: work.startedAt,
      endsAt: work.deadline,
      value:
        typeof body.value === "number" ? body.value.toString() : null,
      currency:
        typeof body.currency === "string" ? body.currency : "SAR",
    },
  });

  return NextResponse.json({ ok: true, contract: created }, { status: 201 });
}
