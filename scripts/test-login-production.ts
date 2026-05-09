// اختبار دخول مباشر على Vercel production
// — يستدعي /api/auth/csrf ثم /api/auth/callback/credentials
import "dotenv/config";

const BASE = "https://saei-scientific-system-marsa1.vercel.app";

async function tryLogin(email: string, password: string) {
  // لا نطبع كلمة المرور — فقط طولها للتشخيص
  console.log(`\n--- جرّب: ${email} (pw len=${password.length}) ---`);
  // 1) CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const setCookie1 = csrfRes.headers.get("set-cookie") ?? "";
  const { csrfToken } = await csrfRes.json();
  console.log("  CSRF status:", csrfRes.status, "token len:", csrfToken?.length);
  // مرّر cookies من csrf إلى callback
  const cookieJar = setCookie1
    .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
    .map((c) => c.split(";")[0])
    .join("; ");

  // 2) Callback credentials
  const body = new URLSearchParams({
    email,
    password,
    csrfToken,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });
  const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieJar,
    },
    body,
    redirect: "manual",
  });
  console.log("  Login status:", r.status);
  const setCookie2 = r.headers.get("set-cookie");
  const location = r.headers.get("location");
  const text = await r.text();
  console.log("  Location:", location);
  console.log("  Body (first 300):", text.slice(0, 300));
  console.log(
    "  Has session cookie:",
    !!(setCookie2 && /next-auth\.session-token|__Secure-next-auth/.test(setCookie2))
  );
  return r.status;
}

// — تعليمات الاستخدام —
// ADMIN_EMAIL=admin@saie.app ADMIN_PASSWORD='...' npx tsx scripts/test-login-production.ts
// أو مرّر args:
// npx tsx scripts/test-login-production.ts admin@saie.app '...'

(async () => {
  const email =
    process.argv[2] ?? process.env.ADMIN_EMAIL ?? "admin@saie.app";
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error(
      "❌ كلمة المرور مطلوبة. استخدم ADMIN_PASSWORD=... أو مرّرها كـargument."
    );
    process.exit(1);
  }
  await tryLogin(email, password);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
