// scripts/verify-phase-b.ts
// — اختبار دخان لـPhase B: Storage (Supabase) + Email (Resend) + Cron secret
// تشغيل: npx tsx scripts/verify-phase-b.ts [admin-email-للاختبار]
import "dotenv/config";

async function main() {
  const targetEmail = process.argv[2];

  console.log("\n=== Phase B verification ===\n");

  // 1) متغيّرات البيئة
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_BUCKET_NAME",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "CRON_SECRET",
  ];
  const missing = required.filter((k) => !process.env[k]);
  console.log("Required env vars:");
  for (const k of required) {
    const v = process.env[k];
    if (!v) {
      console.log(`  ❌ ${k}: missing`);
    } else if (k === "SUPABASE_SERVICE_ROLE_KEY" && v.includes("****")) {
      console.log(`  ⚠️  ${k}: masked placeholder — استبدله بالقيمة الحقيقية`);
    } else {
      console.log(`  ✓ ${k}: present (${v.slice(0, 12)}...)`);
    }
  }
  if (missing.length > 0) {
    console.log("\n⛔ توقّفنا — متغيّرات ناقصة. أضفها لـ.env ثم أعد التشغيل.\n");
    process.exit(1);
  }

  // 2) Supabase Storage — bootstrap bucket + signed URL
  console.log("\n[Storage] التحقّق من Supabase Storage...");
  try {
    const { ensureBucket, createSignedUploadUrl, BUCKET_NAME } =
      await import("../src/lib/storage");
    await ensureBucket();
    console.log(`  ✓ bucket "${BUCKET_NAME}" موجود/تم إنشاؤه`);
    const probe = await createSignedUploadUrl(
      `__verify__/probe-${Date.now()}.pdf`
    );
    console.log(`  ✓ signed upload URL مُولَّد (token len=${probe.token.length})`);
  } catch (e) {
    console.error(
      "  ❌ فشل التخزين:",
      e instanceof Error ? e.message : e
    );
  }

  // 3) Resend — اختبار إرسال بريد (اختياري، يحتاج عنوان مستلم)
  console.log("\n[Email] التحقّق من Resend...");
  try {
    const { sendEmail, isEmailConfigured } = await import("../src/lib/email");
    if (!isEmailConfigured()) {
      console.log("  ⚠️  RESEND_API_KEY غير مهيّأ");
    } else if (!targetEmail) {
      console.log(
        "  ℹ️  مرّر عنوان بريد كمعامل لإرسال رسالة اختبار: npx tsx scripts/verify-phase-b.ts you@example.com"
      );
    } else {
      const r = await sendEmail({
        to: targetEmail,
        subject: "اختبار Phase B — نظام ساعي",
        bodyHtml: `<p>هذه رسالة اختبار من <strong>verify-phase-b.ts</strong>.</p>
                   <p>إن وصلتك، فإن Resend يعمل في بيئتك.</p>`,
        actionPath: "/dashboard",
        actionLabel: "افتح لوحة التحكم",
      });
      if (r.ok) {
        console.log(`  ✓ بريد مُرسل إلى ${targetEmail} (id=${r.id})`);
      } else {
        console.log(`  ❌ فشل الإرسال: ${r.error}`);
      }
    }
  } catch (e) {
    console.error(
      "  ❌ استثناء في البريد:",
      e instanceof Error ? e.message : e
    );
  }

  // 4) Cron secret — تأكيد قيمته فقط (اختبار حقيقي يحتاج نشر)
  console.log("\n[Cron] CRON_SECRET متوفر — اختبر بعد النشر:");
  console.log(
    `  curl -H "Authorization: Bearer $CRON_SECRET" https://<deploy>/api/cron/check-deadlines`
  );

  console.log("\n=== انتهى ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
