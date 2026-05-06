// سكربت اختبار شامل لميزة الانتحال — Node 20+
// ────────────────────────────────────────────────
// نختبر هنا الجزء السيرفري الكامل عبر محاكاة:
// 1. تسجيل دخول الأدمن
// 2. استدعاء impersonate (يكتب AuditLog)
// 3. محاكاة "update({impersonate})" — في NextAuth v4 هذا يكافئ
//    استدعاء /api/auth/session بطريقة معيّنة. لكن الأهم: الـtoken نفسه
//    يحدث عبر cookie set-cookie بعد update. هنا نتحقّق من السلوك السيرفري.
// 4. التأكد من 403 على أي كتابة عبر middleware (محاكاة token impersonator)
// 5. اختبار /stop
// 6. اختبار 403 من non-admin
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000";

function curlGet(path, jar) {
  const out = execSync(
    `curl -s -b ${jar} -c ${jar} "${BASE}${path}" -w "\\n__HTTP=%{http_code}"`,
    { encoding: "utf8" }
  );
  const m = out.match(/__HTTP=(\d+)$/);
  return { status: parseInt(m[1]), body: out.replace(/\n__HTTP=\d+$/, "") };
}

function curlPost(path, jar, data) {
  let cmd = `curl -s -b ${jar} -c ${jar} -X POST "${BASE}${path}" -w "\\n__HTTP=%{http_code}"`;
  if (data) {
    cmd = `curl -s -b ${jar} -c ${jar} -X POST -H "Content-Type: application/json" -d '${JSON.stringify(
      data
    )}' "${BASE}${path}" -w "\\n__HTTP=%{http_code}"`;
  }
  const out = execSync(cmd, { encoding: "utf8" });
  const m = out.match(/__HTTP=(\d+)$/);
  return { status: parseInt(m[1]), body: out.replace(/\n__HTTP=\d+$/, "") };
}

function login(jar, email, password) {
  execSync(`curl -s -c ${jar} ${BASE}/api/auth/csrf -o ${jar}.csrf`, {
    encoding: "utf8",
  });
  const csrfRaw = execSync(`cat ${jar}.csrf`, { encoding: "utf8" });
  const csrf = JSON.parse(csrfRaw).csrfToken;
  const out = execSync(
    `curl -s -b ${jar} -c ${jar} -X POST -H "Content-Type: application/x-www-form-urlencoded" ` +
      `--data-urlencode "csrfToken=${csrf}" ` +
      `--data-urlencode "email=${email}" ` +
      `--data-urlencode "password=${password}" ` +
      `--data-urlencode "callbackUrl=${BASE}/dashboard" ` +
      `--data-urlencode "json=true" ` +
      `"${BASE}/api/auth/callback/credentials?json=true"`,
    { encoding: "utf8" }
  );
  return out;
}

function divider(label) {
  console.log("\n━━━━━━━━━━━━ " + label + " ━━━━━━━━━━━━");
}

// — التشغيل —
const ADMIN_JAR = "/tmp/jar-admin.txt";
const USER_JAR = "/tmp/jar-user.txt";
execSync(`rm -f ${ADMIN_JAR} ${USER_JAR}`);

// === TEST 1: login admin ===
divider("Test 1: تسجيل دخول الأدمن");
const adminLogin = login(ADMIN_JAR, "admin@saie.app", "Saei@2026");
console.log("login result:", adminLogin);
const sess = curlGet("/api/auth/session", ADMIN_JAR);
console.log("session:", sess.body);

// === TEST 2: list users + start impersonation ===
divider("Test 2: ابدأ الانتحال على researcher");
const usersRes = curlGet("/api/users", ADMIN_JAR);
const users = JSON.parse(usersRes.body).users;
const target = users.find((u) => u.role === "RESEARCHER");
console.log("target:", { id: target.id, email: target.email });

const impRes = curlPost(`/api/admin/impersonate/${target.id}`, ADMIN_JAR);
console.log("impersonate result:", impRes);

// === TEST 5: AuditLog SQL check (via admin-only endpoint? we use prisma cli) ===
divider("Test 5: قراءة جدول AuditLog");
try {
  const auditOut = execSync(
    `node -e "const {PrismaClient}=require('./src/generated/prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');let url=process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g,'').replace(/\\?$/,''); const p=new PrismaClient({adapter:new PrismaPg({connectionString:url, ssl:{rejectUnauthorized:false}})}); p.auditLog.findMany({orderBy:{createdAt:'desc'},take:5}).then(r=>console.log(JSON.stringify(r,null,2))).finally(()=>p.\\$disconnect())"`,
    { cwd: process.cwd(), encoding: "utf8", env: { ...process.env } }
  );
  console.log(auditOut);
} catch (e) {
  console.log("audit query failed:", e.message);
}

// === TEST 6: non-admin tries impersonation ===
divider("Test 6: مستخدم عادي يحاول الانتحال — يجب 403");
login(USER_JAR, "mohammed.otaibi@saei.local", "Saei@2026");
const usersess = curlGet("/api/auth/session", USER_JAR);
console.log("non-admin session:", usersess.body);
const blockedImp = curlPost(
  `/api/admin/impersonate/${target.id}`,
  USER_JAR
);
console.log("non-admin impersonate result:", blockedImp);

// === TEST: try impersonating an admin (should fail) ===
divider("Bonus: محاولة انتحال أدمن آخر — يجب 403");
const admins = users.filter((u) => u.role === "ADMIN" && u.id !== "cmot202we0000kkukb65sg71l");
if (admins.length > 0) {
  const r = curlPost(`/api/admin/impersonate/${admins[0].id}`, ADMIN_JAR);
  console.log("impersonate admin result:", r);
} else {
  console.log("لا يوجد أدمن آخر للاختبار");
}

// === TEST: stop without active impersonation ===
divider("Bonus: stop بدون انتحال نشط — يجب 400");
// نحتاج جلسة أدمن نظيفة بدون token.impersonator
// (استدعاء /api/admin/impersonate/<id> لا يعدّل الـtoken — فقط يكتب AuditLog
//  ثم الواجهة تستدعي update({impersonate}) عبر useSession.update)
const stopNoImp = curlPost(`/api/admin/impersonate/stop`, ADMIN_JAR);
console.log("stop without impersonation:", stopNoImp);

console.log("\n✅ انتهت الاختبارات السيرفرية.");
console.log(
  "ملاحظة: اختبارا 3 و 4 (وضع القراءة فقط في الواجهة + شريط برتقالي + zoom للجلسة المنتحلة)\n" +
    "يحتاجان متصفّحاً فعلياً لأنّ JWT token.impersonator يُحدَّث فقط عبر useSession().update()\n" +
    "ولا يوجد API مباشر لتطبيق ذلك في curl (نخطط لاختباره يدوياً عبر Playwright إن لزم)."
);
