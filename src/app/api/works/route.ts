// GET /api/works  — قائمة كل الأعمال
// POST /api/works — إضافة عمل جديد
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";
import {
  findOrCreateResearcherByName,
  nextWorkCode,
  serializeWork,
  validateWorkInput,
} from "@/lib/works-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireAuth();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "غير مصرّح" },
      { status: 401 }
    );
  }
  try {
    // ————— تصفية حسب الدور —————
    // الباحث يرى أعماله فقط؛ المدير والمنسقون يرون الكل.
    // نستعلم Researcher.id المرتبط بـuser.id ثم نفرض where.researcherId.
    let where: { researcherId?: string } = {};
    if (me.role === "RESEARCHER") {
      const myResearcher = await prisma.researcher.findUnique({
        where: { userId: me.id },
        select: { id: true },
      });
      if (!myResearcher) {
        // باحث بلا ملف Researcher — لا أعمال له، نرجع قائمة فارغة لا 500
        return NextResponse.json({ ok: true, works: [] });
      }
      where = { researcherId: myResearcher.id };
    }

    const rows = await prisma.scientificWork.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { researcher: { select: { displayName: true } } },
    });
    return NextResponse.json({
      ok: true,
      works: rows.map(serializeWork),
    });
  } catch (err) {
    console.error("GET /api/works", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر تحميل البيانات" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const me = await requireRole("ADMIN", "RESEARCH_COORDINATOR", "JOURNAL_COORDINATOR");
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "غير مصرّح بالإنشاء" },
      { status: 401 }
    );
  }
  try {
    const body = await req.json();
    const v = validateWorkInput(body);
    if (!v.ok) {
      return NextResponse.json(
        { ok: false, error: v.error },
        { status: 400 }
      );
    }
    const data = v.data;

    const researcherId = await findOrCreateResearcherByName(data.researcher);
    const code = data.code?.trim() || (await nextWorkCode());

    // التحقق من تفرّد الرمز
    const existing = await prisma.scientificWork.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: `الرمز "${code}" مستخدم بالفعل` },
        { status: 409 }
      );
    }

    const created = await prisma.scientificWork.create({
      data: {
        code,
        title: data.title,
        specialty: data.specialty,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        track: data.track as any,
        researcherId,
        stageCode: data.stage,
        progress: data.progress,
        startedAt: new Date(data.startedAt),
        deadline: new Date(data.deadline),
        notes: data.notes ?? null,
      },
      include: { researcher: { select: { displayName: true } } },
    });

    return NextResponse.json(
      { ok: true, work: serializeWork(created) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/works", err);
    return NextResponse.json(
      { ok: false, error: "تعذّر إنشاء العمل" },
      { status: 500 }
    );
  }
}
