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
  const w = await p.scientificWork.findFirst({
    where: { stageCode: { in: ["WRITING", "PROPOSED", "RESEARCH"] } },
    select: { id: true, stageCode: true, title: true },
  });
  console.log(w?.id || "NONE");
  await p.$disconnect();
})();
