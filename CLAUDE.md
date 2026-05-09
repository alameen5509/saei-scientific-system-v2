# نظام إدارة الأعمال العلمية — مؤسسة ساعي

## وصف المشروع
نظام إداري متكامل لإدارة:
- المشاريع البحثية (proposed → approved → in_progress → completed → archived)
- الباحثين وملفاتهم وإنتاجهم العلمي
- المهام الموزّعة عبر المشاريع
- المنشورات (أبحاث، كتب، فصول)
- التقارير الدورية (شهرية / ربع سنوية / سنوية)
- لوحات بيانية وإحصاءات

## الـStack
| الطبقة         | التقنية                                |
| --------------- | -------------------------------------- |
| الإطار          | Next.js 14 (App Router) + React 18    |
| اللغة           | TypeScript (strict)                    |
| التصميم         | Tailwind CSS v3 + Radix UI primitives  |
| الرسوم البيانية | Recharts                               |
| الأيقونات       | lucide-react                           |
| المصادقة        | NextAuth v4 (JWT + Credentials)        |
| قاعدة البيانات  | PostgreSQL + Prisma 7 + adapter-pg     |

## هوية ساعي اللونية والخطوط
| الرمز                       | اللون     | الاستخدام                 |
| --------------------------- | --------- | ------------------------- |
| `saei-purple` / `saei.purple` | `#5E5495` | اللون الأساسي              |
| `saei-purple-700`            | `#3F3766` | عناوين، تباين قوي          |
| `saei-gold` / `saei.gold`   | `#C9A84C` | لون مميز، CTA              |
| `saei-teal` / `saei.teal`   | `#2ABFBF` | معلوماتي                  |
| `saei-cream`                | `#FAF8F3` | الخلفية العامة             |
| `saei-ink`                  | `#1F1B30` | النص الأساسي               |

كل لون يحوي تدرّجاً من 50 إلى 900 (مثلاً `bg-saei-purple-100`).

**الخطوط:**
- `Cairo` — للواجهة (variable: `--font-cairo`، فئة `font-cairo` أو `font-sans`)
- `Amiri` — للنصوص الشرعية (فئة `font-amiri` أو `.font-quran`)

## قواعد العمل (إلزامية)
1. **RTL إلزامي** — `<html dir="rtl" lang="ar">`. كل تخطيط يحترم الاتجاه.
2. **العربية أولاً** — كل نصوص الواجهة بالعربية الفصحى.
3. **متعدد المستأجرين** — كل جدول يحوي `tenantId="saei"` افتراضياً.
4. **الأرقام** — في الواجهة عربية شرقية (٠١٢٣٤٥٦٧٨٩) عبر `toArabicDigits()`. في DB لاتينية.
5. **الرسوم البيانية** — تُحاط بـ`<div dir="ltr">` لأن recharts يفترض LTR.
6. **التسمية** — في النماذج: `<Label>` يميناً، `<Input>` تحته (اتجاه طبيعي عمودي).

## أوامر المشروع
```bash
npm run dev          # خادم التطوير على :3000
npm run build        # بناء الإنتاج
npm run lint         # ESLint
npm run db:generate  # توليد Prisma Client (مطلوب بعد تعديل schema)
npm run db:push      # دفع schema إلى DB (للتطوير)
npm run db:migrate   # إنشاء migration (للإنتاج)
npm run db:studio    # واجهة بيانات Prisma
```

## بنية المجلدات
```
saei-scientific-system/
├─ prisma/
│  └─ schema.prisma          ← User/Researcher/Project/Task/Publication/Report
├─ src/
│  ├─ app/
│  │  ├─ (public)/page.tsx   ← الصفحة الرئيسية العامة (/)
│  │  ├─ (auth)/login/       ← صفحة الدخول (/login)
│  │  ├─ (dashboard)/         ← layout مشترك بـSidebar+Header
│  │  │  ├─ dashboard/       ← /dashboard (KPIs + رسم بياني)
│  │  │  ├─ projects/        ← /projects
│  │  │  ├─ researchers/     ← /researchers
│  │  │  ├─ tasks/           ← /tasks
│  │  │  └─ reports/         ← /reports
│  │  ├─ api/auth/[...nextauth]/route.ts
│  │  ├─ globals.css         ← متغيرات RTL + scrollbar
│  │  └─ layout.tsx          ← html dir=rtl + Cairo + Amiri
│  ├─ components/
│  │  ├─ ui/                 ← Button, Card, Input, Label, Dialog, Select
│  │  ├─ charts/             ← ProjectsBarChart (recharts)
│  │  ├─ forms/              ← (مستقبلي)
│  │  ├─ tables/             ← (مستقبلي)
│  │  └─ layout/             ← Sidebar, Header
│  ├─ lib/
│  │  ├─ auth.ts             ← NextAuth v4 options
│  │  ├─ prisma.ts           ← مفرد PrismaClient + adapter-pg
│  │  └─ utils.ts            ← cn, toArabicDigits, formatNumber, formatDate
│  ├─ types/index.ts         ← UserRole, ProjectStatus, NavItem
│  └─ generated/prisma/      ← Prisma Client مُولَّد (gitignored)
├─ tailwind.config.ts        ← ألوان ساعي + خطوط
├─ prisma.config.ts          ← DATABASE_URL + dotenv
├─ .env / .env.example
└─ package.json
```

## ملفات حرجة
- **سكيما البيانات**: `prisma/schema.prisma`
- **الألوان**: `tailwind.config.ts` (`theme.extend.colors.saei`)
- **هوية الواجهة**: `src/app/globals.css` (RTL + scrollbar)
- **الـSidebar**: `src/components/layout/Sidebar.tsx` (`items[]`)
- **NextAuth**: `src/lib/auth.ts` (مستخدم placeholder حالياً)

## ملاحظات Prisma 7
- `url` لا يوضع في schema — يمرَّر عبر `prisma.config.ts`
- `PrismaClient` يحتاج `adapter` صريح: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- العميل يُولَّد إلى `src/generated/prisma` (مسار مخصص)، يُستورد منه لا من `@prisma/client` مباشرة

## بذر الحسابات
- المصادقة الفعلية عبر Prisma + bcrypt (في `src/lib/auth.ts`).
- لا توجد كلمات مرور hardcoded في الكود.
- لإعادة بذر بيانات التطوير: `SEED_DEFAULT_PASSWORD='...' npm run db:seed`
- لإعادة تعيين كلمة admin: `SEED_ADMIN_PASSWORD='...' npx tsx prisma/seed-admin.ts`
- إن لم تُمرَّر كلمة، يُولَّد عشوائياً ويُطبع مرة واحدة في الـoutput.
