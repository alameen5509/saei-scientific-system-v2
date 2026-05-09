// مولّد كلمات مرور قوية للسكربتات (seed/admin reset)
// — يستخدم crypto.randomBytes (CSPRNG) — لا Math.random
// — يضمن وجود كل أنواع الأحرف
import { randomBytes, randomInt } from "node:crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // بدون I, O لتجنب الالتباس
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // بدون l, o
const DIGIT = "23456789"; // بدون 0, 1
const SYMBOL = "!@#$%^&*-_+=";

function pick(set: string): string {
  return set[randomInt(0, set.length)];
}

/** يولّد كلمة مرور قوية بطول length (افتراضي 20) تحوي A-Z, a-z, 0-9, symbol على الأقل واحد لكل نوع */
export function generateStrongPassword(length = 20): string {
  if (length < 8) length = 8;
  // ابدأ بمزج إلزامي
  const required = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  const all = UPPER + LOWER + DIGIT + SYMBOL;
  const rest: string[] = [];
  // استخدم randomBytes للسرعة لباقي الأحرف
  const buf = randomBytes(length - required.length);
  for (let i = 0; i < buf.length; i++) {
    rest.push(all[buf[i] % all.length]);
  }
  // امزج
  const arr = [...required, ...rest];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}
