import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma config — يدعم Supabase pattern:
//  - DATABASE_URL = Transaction Pooler (port 6543) للتطبيق
//  - DIRECT_URL   = Direct connection (port 5432) للـmigrations فقط
// إن لم يكن DIRECT_URL موجوداً، Prisma يستخدم DATABASE_URL لكليهما.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
