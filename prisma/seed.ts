// سكربت بذرة قاعدة البيانات
// — مستخدمون لكل الأدوار الخمسة بكلمات سرّ مشفّرة (bcrypt)
// — الباحثون مستخرَجون من SAMPLE_WORKS تلقائياً
// — كل الأعمال العلمية + المراحل + هيئة المراجعة
// تشغيل: npm run db:seed (idempotent)

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SAMPLE_WORKS } from "../src/lib/works-data";
import { STAGE_LABEL, STAGE_ORDER } from "../src/types/works";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

const TITLE_REGEX = /^(أ\.د\.|د\.|أ\.)\s*/;
const stripTitle = (s: string) => s.replace(TITLE_REGEX, "").trim();
const extractTitle = (s: string) => s.match(TITLE_REGEX)?.[1] ?? null;

// أسماء لاتينية للبريد
const SLUG_BY_NAME: Record<string, string> = {
  "عبدالله السالم": "abdullah.salem",
  "خالد الفهد": "khaled.fahd",
  "سعيد الحربي": "saeed.harbi",
  "منال القحطاني": "manal.qahtani",
  "محمد العتيبي": "mohammed.otaibi",
};

// كلمات سرّ افتراضية للحسابات التجريبية
const DEFAULT_PASSWORD = "Saei@2026";

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("🧹 تنظيف البيانات الحالية...");
  await prisma.review.deleteMany();
  await prisma.scientificWork.deleteMany();
  await prisma.workflowStage.deleteMany();
  await prisma.researcher.deleteMany();
  await prisma.reviewer.deleteMany();
  await prisma.user.deleteMany();

  // ————— مراحل سير العمل —————
  console.log("📋 إدخال مراحل سير العمل...");
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const code = STAGE_ORDER[i];
    await prisma.workflowStage.create({
      data: {
        code,
        label: STAGE_LABEL[code],
        order: i + 1,
      },
    });
  }

  // ————— مستخدمون تجريبيون لكل دور —————
  console.log("👥 إنشاء حسابات الأدوار الإدارية...");
  const adminPw = await hash(DEFAULT_PASSWORD);

  await prisma.user.create({
    data: {
      email: "admin@saei.local",
      name: "مدير النظام",
      password: adminPw,
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      email: "research.coord@saei.local",
      name: "منسق الأبحاث",
      password: adminPw,
      role: "RESEARCH_COORDINATOR",
    },
  });

  await prisma.user.create({
    data: {
      email: "journal.coord@saei.local",
      name: "منسق المجلة",
      password: adminPw,
      role: "JOURNAL_COORDINATOR",
    },
  });

  // ————— الباحثون — جمع فريد + كلمة سر افتراضية + ربط بـResearcher —————
  console.log("🎓 إنشاء الباحثين...");
  const fullNameByBase = new Map<string, string>();
  for (const w of SAMPLE_WORKS) {
    const base = stripTitle(w.researcher);
    const existing = fullNameByBase.get(base);
    if (!existing) {
      fullNameByBase.set(base, w.researcher);
    } else {
      const rank = (t: string | null) =>
        t === "أ.د." ? 3 : t === "د." ? 2 : t === "أ." ? 1 : 0;
      if (rank(extractTitle(w.researcher)) > rank(extractTitle(existing))) {
        fullNameByBase.set(base, w.researcher);
      }
    }
  }

  const researcherIdByBase = new Map<string, string>();
  let i = 1;
  for (const [base, displayName] of Array.from(fullNameByBase.entries())) {
    const slug = SLUG_BY_NAME[base] ?? `researcher${i}`;
    const user = await prisma.user.create({
      data: {
        email: `${slug}@saei.local`,
        name: displayName,
        password: adminPw,
        role: "RESEARCHER",
      },
    });
    const r = await prisma.researcher.create({
      data: {
        userId: user.id,
        displayName,
        academicTitle: extractTitle(displayName),
      },
    });
    researcherIdByBase.set(base, r.id);
    i++;
  }

  // ————— ٣ محكمين بتخصصات متنوعة —————
  console.log("🧐 إنشاء هيئة المحكمين...");
  const reviewersData: Array<{
    email: string;
    name: string;
    expertise: string;
    specialties: string[];
  }> = [
    {
      email: "reviewer.hadith@saei.local",
      name: "أ.د. محمد البشير",
      expertise: "علوم الحديث والتخريج",
      specialties: ["HADITH", "BIO"],
    },
    {
      email: "reviewer.usul@saei.local",
      name: "أ.د. عمر الزبير",
      expertise: "أصول الفقه وتحقيق التراث",
      specialties: ["USUL", "FIQH"],
    },
    {
      email: "reviewer.tafsir@saei.local",
      name: "د. ياسر الشمري",
      expertise: "التفسير والعقيدة",
      specialties: ["TAFSIR", "AQEEDAH", "ARABIC"],
    },
  ];
  const reviewerIds: string[] = [];
  const reviewerSpecsById = new Map<string, string[]>();
  for (const r of reviewersData) {
    const u = await prisma.user.create({
      data: {
        email: r.email,
        name: r.name,
        password: adminPw,
        role: "REVIEWER",
      },
    });
    const rev = await prisma.reviewer.create({
      data: {
        userId: u.id,
        expertise: r.expertise,
        specialties: r.specialties,
        active: true,
      },
    });
    reviewerIds.push(rev.id);
    reviewerSpecsById.set(rev.id, r.specialties);
  }

  // ————— الأعمال العلمية —————
  console.log("📚 إدخال الأعمال العلمية...");
  const workIdsBySpecialty = new Map<string, string[]>();
  for (const w of SAMPLE_WORKS) {
    const base = stripTitle(w.researcher);
    const researcherId = researcherIdByBase.get(base);
    if (!researcherId) continue;
    const created = await prisma.scientificWork.create({
      data: {
        code: w.code,
        title: w.title,
        specialty: w.specialty,
        track: w.track,
        researcherId,
        stageCode: w.stage,
        progress: w.progress,
        startedAt: new Date(w.startedAt),
        deadline: new Date(w.deadline),
        notes: w.notes ?? null,
      },
    });
    const list = workIdsBySpecialty.get(w.specialty) ?? [];
    list.push(created.id);
    workIdsBySpecialty.set(w.specialty, list);
  }

  // ————— مراجعات تجريبية —————
  // لكل عمل في مرحلة REVIEW أو EDITING: نعيّن محكماً مطابقاً للتخصص
  console.log("📝 إنشاء مراجعات تجريبية...");
  const worksToReview = await prisma.scientificWork.findMany({
    where: { stageCode: { in: ["UNDER_REVIEW", "REVIEW_FEEDBACK"] } },
    select: { id: true, specialty: true, deadline: true },
  });
  let reviewsCreated = 0;
  for (const w of worksToReview) {
    // ابحث عن محكمين لتخصص العمل
    const matching = reviewerIds.filter((id) =>
      reviewerSpecsById.get(id)?.includes(w.specialty)
    );
    if (matching.length === 0) continue;
    // عيّن أول مطابق
    const reviewerId = matching[0];
    const due = new Date(w.deadline);
    due.setDate(due.getDate() - 14);
    await prisma.review.create({
      data: {
        workId: w.id,
        reviewerId,
        status: "ASSIGNED",
        dueDate: due,
      },
    });
    await prisma.reviewer.update({
      where: { id: reviewerId },
      data: { totalAssigned: { increment: 1 } },
    });
    reviewsCreated++;
  }
  console.log(`   تمّ إنشاء ${reviewsCreated} مراجعة.`);

  console.log(
    `\n✅ اكتمل: ${STAGE_ORDER.length} مراحل، ${
      researcherIdByBase.size
    } باحثين، ${SAMPLE_WORKS.length} عملاً، ${reviewersData.length} محكمين.`
  );
  console.log(`\n🔑 بيانات الدخول التجريبية (كلمة السرّ: ${DEFAULT_PASSWORD}):`);
  console.log("   - admin@saei.local            (مدير النظام)");
  console.log("   - research.coord@saei.local   (منسق الأبحاث)");
  console.log("   - journal.coord@saei.local    (منسق المجلة)");
  console.log("   - abdullah.salem@saei.local   (باحث)");
  console.log("   - reviewer.hadith@saei.local  (محكم — حديث/تراجم)");
  console.log("   - reviewer.usul@saei.local    (محكم — أصول/فقه)");
  console.log("   - reviewer.tafsir@saei.local  (محكم — تفسير/عقيدة/عربية)");
}

main()
  .catch((e) => {
    console.error("❌ فشلت عملية البذر:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
