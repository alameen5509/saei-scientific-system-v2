// الناشرون / مكاتب الطباعة — list/create
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR", "PRINTING_MANAGER");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const list = await prisma.publisher.findMany({
    where: { deletedAt: null },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { printingJobs: true } },
    },
  });
  return NextResponse.json({ ok: true, publishers: list });
}

export async function POST(req: NextRequest) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const b = await req.json();
  const {
    name,
    city,
    country,
    contactName,
    contactPhone,
    contactEmail,
    rating,
    notes,
  } = b as Record<string, unknown>;
  if (!name || typeof name !== "string" || name.length < 2) {
    return NextResponse.json(
      { ok: false, error: "اسم الناشر مطلوب" },
      { status: 400 }
    );
  }
  const created = await prisma.publisher.create({
    data: {
      name,
      city: typeof city === "string" ? city : null,
      country: typeof country === "string" ? country : "SA",
      contactName: typeof contactName === "string" ? contactName : null,
      contactPhone: typeof contactPhone === "string" ? contactPhone : null,
      contactEmail: typeof contactEmail === "string" ? contactEmail : null,
      rating: typeof rating === "number" ? rating : null,
      notes: typeof notes === "string" ? notes : null,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "PUBLISHER_CREATE",
      actorId: me.id,
      targetId: created.id,
      metadata: { name: created.name },
    },
  });
  return NextResponse.json({ ok: true, publisher: created }, { status: 201 });
}
