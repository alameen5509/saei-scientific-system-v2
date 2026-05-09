// اختبار trim password — يضيف مسافة عمدية ويتحقق أن الـserver يقبلها
import "dotenv/config";

const BASE = "https://saei-scientific-system-marsa1.vercel.app";

async function tryLogin(email: string, password: string, label: string) {
  console.log(`\n--- ${label} ---`);
  console.log(`    email=${email}, pw_len=${password.length}, raw_chars=[${
    password.charCodeAt(password.length - 1)
  }] (last char code)`);

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const setCookie1 = csrfRes.headers.get("set-cookie") ?? "";
  const { csrfToken } = await csrfRes.json();
  const cookieJar = setCookie1
    .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
    .map((c) => c.split(";")[0])
    .join("; ");

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
  const text = await r.text();
  const setCookie2 = r.headers.get("set-cookie") ?? "";
  const hasSession = /next-auth\.session-token|__Secure-next-auth/.test(setCookie2);
  const isError = text.includes("CredentialsSignin") || !hasSession;
  console.log(`    Login status: ${r.status} ${isError ? "❌ FAIL" : "✅ OK"}`);
  console.log(`    Body (first 200): ${text.slice(0, 200)}`);
  return !isError;
}

(async () => {
  const pw = process.env.ADMIN_PASSWORD ?? process.argv[2];
  if (!pw) {
    console.error("❌ ADMIN_PASSWORD env var or arg required");
    process.exit(1);
  }
  // Test 1: clean password
  const r1 = await tryLogin("admin@saie.app", pw, "1) كلمة نظيفة");
  // Test 2: trailing space
  const r2 = await tryLogin(
    "admin@saie.app",
    pw + " ",
    "2) مسافة في النهاية"
  );
  // Test 3: leading space
  const r3 = await tryLogin(
    "admin@saie.app",
    " " + pw,
    "3) مسافة في البداية"
  );

  console.log("\n═══ النتيجة الإجمالية ═══");
  console.log(`  نظيفة:        ${r1 ? "✅" : "❌"}`);
  console.log(`  مسافة لاحقة:  ${r2 ? "✅" : "❌"}  (يجب أن تنجح إن trim يعمل)`);
  console.log(`  مسافة أمامية: ${r3 ? "✅" : "❌"}  (يجب أن تنجح إن trim يعمل)`);
  process.exit(r1 && r2 && r3 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
