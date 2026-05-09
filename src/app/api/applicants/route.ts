// متقدّمون لإعلان — list/create
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const announcementId = req.nextUrl.searchParams.get("announcementId");
  const list = await prisma.applicant.findMany({
    where: {
      deletedAt: null,
      ...(announcementId ? { announcementId } : {}),
    },
    orderBy: [
      { classification: "asc" },
      { scoreTotal: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      announcement: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ ok: true, applicants: list });
}

export async function POST(req: NextRequest) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR");
  if (!me) {
    return NextResponse.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const b = await req.json();
  const {
    announcementId,
    fullName,
    email,
    phone,
    cvText,
    qualifications,
    publicationsCount,
    yearsExperience,
  } = b as Record<string, unknown>;

  if (!announcementId || typeof announcementId !== "string") {
    return NextResponse.json(
      { ok: false, error: "إعلان مطلوب" },
      { status: 400 }
    );
  }
  if (!fullName || typeof fullName !== "string" || fullName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "الاسم مطلوب" },
      { status: 400 }
    );
  }

  const a = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!a) {
    return NextResponse.json(
      { ok: false, error: "الإعلان غير موجود" },
      { status: 404 }
    );
  }

  const created = await prisma.applicant.create({
    data: {
      announcementId,
      fullName,
      email: typeof email === "string" ? email : null,
      phone: typeof phone === "string" ? phone : null,
      cvText: typeof cvText === "string" ? cvText : null,
      qualifications: typeof qualifications === "string" ? qualifications : null,
      publicationsCount:
        typeof publicationsCount === "number" ? publicationsCount : 0,
      yearsExperience:
        typeof yearsExperience === "number" ? yearsExperience : 0,
    },
  });

  return NextResponse.json({ ok: true, applicant: created }, { status: 201 });
}
