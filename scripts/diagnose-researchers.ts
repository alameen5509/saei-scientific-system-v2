// تشخيص علاقات الباحثين بالأعمال العلمية
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

(async () => {
  let url = process.env.DATABASE_URL!.replace(/[?&]sslmode=[^&]*/g, "").replace(
    /\?$/,
    ""
  );
  const p = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    }),
  });

  const totalWorks = await p.scientificWork.count();
  const totalResearchers = await p.researcher.count();
  const totalUsers = await p.user.count();
  const orphanWorks = await p.scientificWork.count({
    where: { researcherId: { equals: "" } as never },
  });

  console.log(`📊 إحصاء عام:`);
  console.log(`   مستخدمون:    ${totalUsers}`);
  console.log(`   باحثون:      ${totalResearchers}`);
  console.log(`   أعمال علمية: ${totalWorks}`);

  console.log(`\n👥 الباحثون وأعمالهم:`);
  const rs = await p.researcher.findMany({
    include: {
      user: { select: { email: true, name: true } },
      _count: { select: { works: true } },
    },
    orderBy: { displayName: "asc" },
  });
  for (const r of rs) {
    console.log(
      `   ${r.user.email.padEnd(35)} | ${r.displayName.padEnd(28)} | ${r._count.works} عمل`
    );
  }

  console.log(`\n📚 توزيع الأعمال على الباحثين:`);
  const byResearcher = await p.scientificWork.groupBy({
    by: ["researcherId"],
    _count: { id: true },
  });
  for (const g of byResearcher) {
    const r = await p.researcher.findUnique({
      where: { id: g.researcherId },
      select: { displayName: true, user: { select: { email: true } } },
    });
    console.log(
      `   ${r?.user.email ?? "?"} (${r?.displayName ?? "?"}): ${g._count.id} عمل`
    );
  }

  // عيّنة من الأعمال
  console.log(`\n📑 عيّنة من ٣ أعمال أولى مع researcherId:`);
  const sample = await p.scientificWork.findMany({
    take: 3,
    include: { researcher: { select: { displayName: true, user: { select: { email: true } } } } },
  });
  for (const w of sample) {
    console.log(`   [${w.code}] ${w.title.slice(0, 40)}…`);
    console.log(`      researcherId: ${w.researcherId}`);
    console.log(`      researcher: ${w.researcher.displayName} (${w.researcher.user.email})`);
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
